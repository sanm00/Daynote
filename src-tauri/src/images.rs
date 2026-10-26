use sha2::{Digest, Sha256};
use std::{fs, io::Write, path::Path};

const MAX_BYTES: usize = 10 * 1024 * 1024;

fn format(bytes: &[u8]) -> Result<&'static str, String> {
    if bytes.is_empty() || bytes.len() > MAX_BYTES {
        return Err("图片大小需在 10 MB 以内".into());
    }
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        Ok("png")
    } else if bytes.starts_with(&[255, 216, 255]) {
        Ok("jpg")
    } else if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        Ok("gif")
    } else if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") {
        Ok("webp")
    } else {
        Err("仅支持 PNG、JPEG、GIF 和 WebP 图片".into())
    }
}

pub fn save(root: &Path, bytes: &[u8]) -> Result<String, String> {
    let extension = format(bytes)?;
    let hash = format!("{:x}", Sha256::digest(bytes));
    let reference = format!("images/{hash}.{extension}");
    let directory = root.join("images");
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let destination = root.join(&reference);
    if destination.exists() {
        return Ok(reference);
    }
    let temporary = directory.join(format!("{hash}.tmp"));
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)
        .map_err(|e| e.to_string())?;
    let result = (|| {
        file.write_all(bytes).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
        fs::rename(&temporary, &destination).map_err(|e| e.to_string())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result?;
    Ok(reference)
}

pub fn read(root: &Path, reference: &str) -> Result<Vec<u8>, String> {
    let name = reference.strip_prefix("images/").ok_or("无效的图片引用")?;
    let (hash, extension) = name.split_once('.').ok_or("无效的图片引用")?;
    if hash.len() != 64
        || !hash
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
        || !matches!(extension, "png" | "jpg" | "gif" | "webp")
    {
        return Err("无效的图片引用".into());
    }
    let directory = root
        .join("images")
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let path = directory
        .join(name)
        .canonicalize()
        .map_err(|e| e.to_string())?;
    if !path.starts_with(&directory) {
        return Err("无效的图片路径".into());
    }
    if fs::metadata(&path).map_err(|e| e.to_string())?.len() > MAX_BYTES as u64 {
        return Err("图片超过 10 MB".into());
    }
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    format(&bytes)?;
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn images_round_trip_and_deduplicate() {
        let root = std::env::temp_dir().join(format!("daynote-images-{}", std::process::id()));
        fs::create_dir_all(&root).unwrap();
        let bytes = b"\x89PNG\r\n\x1a\ndemo";
        let path = save(&root, bytes).unwrap();
        assert!(path.starts_with("images/"));
        assert_eq!(save(&root, bytes).unwrap(), path);
        assert_eq!(read(&root, &path).unwrap(), bytes);
        assert_eq!(fs::read_dir(root.join("images")).unwrap().count(), 1);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_invalid_content_and_paths() {
        let root = std::env::temp_dir();
        assert!(save(&root, b"not an image").is_err());
        assert!(save(&root, &vec![0; MAX_BYTES + 1]).is_err());
        for reference in [
            "../notes.json",
            "images/../../notes.json",
            "images/test.svg",
        ] {
            assert!(read(&root, reference).is_err());
        }
    }
}
