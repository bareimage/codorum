use crate::models::FileSnapshot;
use std::time::SystemTime;

const PLACEHOLDERS_JSON: &str = include_str!("../../src/data/devils-dictionary.json");

pub fn random_placeholder() -> String {
    let placeholders: Vec<String> =
        serde_json::from_str(PLACEHOLDERS_JSON).unwrap_or_default();
    if placeholders.is_empty() {
        return String::new();
    }
    let idx = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_millis() as usize)
        .unwrap_or(0)
        % placeholders.len();
    let raw = &placeholders[idx];

    // Parse "Word, n.  definition text" into formatted markdown blockquote
    if let Some(comma_pos) = raw.find(',') {
        let word = &raw[..comma_pos];
        let rest = raw[comma_pos + 1..].trim_start();
        if let Some(dot_pos) = rest.find('.') {
            let pos = &rest[..=dot_pos];
            let defn = rest[dot_pos + 1..].trim_start();
            return format!(
                "> ***{}***, *{}* {}\n>\n> \u{2014} Ambrose Bierce, *The Devil\u{2019}s Dictionary*",
                word, pos, defn
            );
        }
    }
    format!(
        "> {}\n>\n> \u{2014} Ambrose Bierce, *The Devil\u{2019}s Dictionary*",
        raw
    )
}

/// Create a snapshot from a content diff. Returns None if content is unchanged.
pub fn create_snapshot(old: &str, new: &str) -> Option<FileSnapshot> {
    if old == new {
        return None;
    }
    let diff = diffy::create_patch(old, new);
    let patch_str = diff.to_string();
    let lines_added = patch_str
        .lines()
        .filter(|l| l.starts_with('+') && !l.starts_with("+++"))
        .count();
    let lines_removed = patch_str
        .lines()
        .filter(|l| l.starts_with('-') && !l.starts_with("---"))
        .count();
    let now = SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    Some(FileSnapshot {
        id: uuid::Uuid::new_v4().to_string(),
        timestamp: now,
        patch: Some(patch_str),
        lines_added,
        lines_removed,
    })
}

/// Create the initial snapshot for a newly added file (no patch, just line count).
pub fn initial_snapshot(content: &str) -> FileSnapshot {
    let now = SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    FileSnapshot {
        id: uuid::Uuid::new_v4().to_string(),
        timestamp: now,
        patch: None,
        lines_added: content.lines().count(),
        lines_removed: 0,
    }
}

/// Push a snapshot onto history, capping at 50 entries.
pub fn push_snapshot(history: &mut Vec<FileSnapshot>, snap: FileSnapshot) {
    history.push(snap);
    if history.len() > 50 {
        history.remove(0);
    }
}
