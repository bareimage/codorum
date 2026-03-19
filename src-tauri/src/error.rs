use std::fmt;

#[derive(Debug)]
pub enum CodorumError {
    FileNotFound(String),
    AlreadyExists(String),
    Io(std::io::Error),
    Lock,
}

impl fmt::Display for CodorumError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::FileNotFound(p) => write!(f, "File not found: {}", p),
            Self::AlreadyExists(p) => write!(f, "File already exists: {}", p),
            Self::Io(e) => write!(f, "IO error: {}", e),
            Self::Lock => write!(f, "Lock poisoned"),
        }
    }
}

impl From<std::io::Error> for CodorumError {
    fn from(e: std::io::Error) -> Self {
        Self::Io(e)
    }
}

impl serde::Serialize for CodorumError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
