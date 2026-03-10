use notify::event::ModifyKind;
use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

#[derive(Debug, Clone, PartialEq)]
pub enum FileEvent {
    Changed(String),
    Removed(String),
    Renamed { old_path: String, new_path: String },
}

pub struct FileWatcherManager {
    _watcher: Option<RecommendedWatcher>,
}

/// Raw event kind sent over the channel.
#[derive(Debug, Clone, PartialEq)]
enum RawEvent {
    Changed(String),
    Created(String),
    Removed(String),
    /// macOS FSEvents emits RenameMode::Any for BOTH old and new paths.
    /// We don't know which side it is — must check disk after debounce.
    MaybeRenamed(String),
}

impl FileWatcherManager {
    pub fn new<F>(on_event: F) -> Self
    where
        F: Fn(FileEvent) + Send + 'static,
    {
        let (tx, rx) = mpsc::channel::<RawEvent>();

        let watcher = RecommendedWatcher::new(
            move |res: Result<notify::Event, notify::Error>| {
                if let Ok(event) = res {
                    match event.kind {
                        // Rename events — macOS emits Modify(Name(Any)) for both sides
                        EventKind::Modify(ModifyKind::Name(_)) => {
                            for p in event.paths {
                                let _ = tx.send(RawEvent::MaybeRenamed(
                                    p.to_string_lossy().to_string(),
                                ));
                            }
                        }
                        // Regular modifications (data, metadata, etc.)
                        EventKind::Modify(_) => {
                            for p in event.paths {
                                let _ = tx.send(RawEvent::Changed(
                                    p.to_string_lossy().to_string(),
                                ));
                            }
                        }
                        EventKind::Create(_) => {
                            for p in event.paths {
                                let _ = tx.send(RawEvent::Created(
                                    p.to_string_lossy().to_string(),
                                ));
                            }
                        }
                        EventKind::Remove(_) => {
                            for p in event.paths {
                                let _ = tx.send(RawEvent::Removed(
                                    p.to_string_lossy().to_string(),
                                ));
                            }
                        }
                        _ => {}
                    }
                }
            },
            Config::default(),
        )
        .ok();

        // Spawn a thread to debounce, correlate renames, and forward events.
        thread::spawn(move || {
            let debounce = Duration::from_millis(250);
            let mut pending: Vec<RawEvent> = Vec::new();

            loop {
                match rx.recv_timeout(debounce) {
                    Ok(raw) => {
                        pending.push(raw);
                    }
                    Err(mpsc::RecvTimeoutError::Timeout) => {
                        if !pending.is_empty() {
                            flush_events(&pending, &on_event);
                            pending.clear();
                        }
                    }
                    Err(mpsc::RecvTimeoutError::Disconnected) => break,
                }
            }
        });

        Self { _watcher: watcher }
    }

    pub fn watch(&mut self, path: &str) {
        if let Some(ref mut w) = self._watcher {
            let _ = w.watch(&PathBuf::from(path), RecursiveMode::NonRecursive);
        }
    }

    #[allow(dead_code)]
    pub fn unwatch(&mut self, path: &str) {
        if let Some(ref mut w) = self._watcher {
            let _ = w.unwatch(&PathBuf::from(path));
        }
    }
}

/// Process a batch of debounced events, correlating renames.
fn flush_events<F>(pending: &[RawEvent], on_event: &F)
where
    F: Fn(FileEvent),
{
    let mut maybe_renamed: Vec<String> = Vec::new();
    let mut changed: HashSet<String> = HashSet::new();
    let mut created: HashSet<String> = HashSet::new();
    let mut removed: HashSet<String> = HashSet::new();

    for raw in pending {
        match raw {
            RawEvent::MaybeRenamed(p) => {
                maybe_renamed.push(p.clone());
            }
            RawEvent::Changed(p) => {
                // Changed supersedes a previous remove for same path (save-by-replace).
                removed.remove(p);
                changed.insert(p.clone());
            }
            RawEvent::Created(p) => {
                removed.remove(p);
                created.insert(p.clone());
            }
            RawEvent::Removed(p) => {
                if !changed.contains(p) && !created.contains(p) {
                    removed.insert(p.clone());
                }
            }
        }
    }

    // ── Resolve MaybeRenamed paths ──
    // macOS FSEvents emits RenameMode::Any at both old and new paths.
    // Check disk: paths that exist are the "To" side, paths that don't are "From".
    let mut rename_from: Vec<String> = Vec::new(); // old paths (don't exist)
    let mut rename_to: Vec<String> = Vec::new(); // new paths (exist)

    for path in &maybe_renamed {
        if Path::new(path).exists() {
            rename_to.push(path.clone());
        } else {
            rename_from.push(path.clone());
        }
    }

    // Pair From+To in the same directory.
    let mut paired_from = HashSet::new();
    let mut paired_to = HashSet::new();

    for (fi, from_path) in rename_from.iter().enumerate() {
        let from_dir = Path::new(from_path).parent();
        for (ti, to_path) in rename_to.iter().enumerate() {
            if paired_to.contains(&ti) {
                continue;
            }
            if Path::new(to_path).parent() == from_dir {
                on_event(FileEvent::Renamed {
                    old_path: from_path.clone(),
                    new_path: to_path.clone(),
                });
                paired_from.insert(fi);
                paired_to.insert(ti);
                break;
            }
        }
    }

    // Unpaired "From" → file was moved out / deleted.
    for (i, path) in rename_from.iter().enumerate() {
        if !paired_from.contains(&i) {
            on_event(FileEvent::Removed(path.clone()));
        }
    }
    // Unpaired "To" → file was moved in / appeared.
    for (i, path) in rename_to.iter().enumerate() {
        if !paired_to.contains(&i) {
            on_event(FileEvent::Changed(path.clone()));
        }
    }

    // ── Also pair Remove+Create in same directory (Linux/Windows fallback) ──
    let mut paired_removes = HashSet::new();
    let mut paired_creates = HashSet::new();

    let remove_list: Vec<&String> = removed.iter().collect();
    let create_list: Vec<&String> = created.iter().collect();

    for rem in &remove_list {
        let rem_dir = Path::new(rem.as_str()).parent();
        for cre in &create_list {
            if paired_creates.contains(cre.as_str()) {
                continue;
            }
            if Path::new(cre.as_str()).parent() == rem_dir {
                on_event(FileEvent::Renamed {
                    old_path: rem.to_string(),
                    new_path: cre.to_string(),
                });
                paired_removes.insert(rem.as_str());
                paired_creates.insert(cre.as_str());
                break;
            }
        }
    }

    // ── Emit remaining events ──
    for path in &changed {
        on_event(FileEvent::Changed(path.clone()));
    }
    for path in &created {
        if !paired_creates.contains(path.as_str()) {
            on_event(FileEvent::Changed(path.clone()));
        }
    }
    for path in &removed {
        if !paired_removes.contains(path.as_str()) {
            on_event(FileEvent::Removed(path.clone()));
        }
    }
}
