use std::{ffi::CString, path::Path};

use tauri::Manager;

unsafe extern "C" {
    fn track3_ios_install_native();
    fn track3_ios_lock_enabled() -> bool;
    fn track3_ios_set_lock_enabled(enabled: bool);
    fn track3_ios_authenticate() -> bool;
    fn track3_ios_haptic(kind: u8);
    fn track3_ios_set_badge(count: i32);
    fn track3_ios_share_file(path: *const std::ffi::c_char) -> bool;
}

pub fn install() {
    unsafe { track3_ios_install_native() }
}

pub fn lock_enabled() -> bool {
    unsafe { track3_ios_lock_enabled() }
}

pub fn set_lock_enabled(enabled: bool) {
    unsafe { track3_ios_set_lock_enabled(enabled) }
}

pub fn authenticate() -> bool {
    unsafe { track3_ios_authenticate() }
}

pub fn haptic(kind: &str) -> Result<(), String> {
    let code = match kind {
        "light" => 0,
        "success" => 1,
        "error" => 2,
        _ => return Err("invalid haptic type".into()),
    };
    unsafe { track3_ios_haptic(code) };
    Ok(())
}

pub fn set_badge(count: i32) {
    unsafe { track3_ios_set_badge(count.max(0)) }
}

pub fn share_file(handle: &tauri::AppHandle, path: &str) -> Result<(), String> {
    let source = Path::new(path)
        .canonicalize()
        .map_err(|_| "export file is unavailable")?;
    let cache = handle
        .path()
        .app_cache_dir()
        .map_err(|_| "app cache is unavailable")?
        .canonicalize()
        .map_err(|_| "app cache is unavailable")?;
    let name = source
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or("invalid export file name")?;
    if !source.starts_with(cache)
        || !name.starts_with("track3-export-data-")
        || !name.ends_with(".json")
    {
        return Err("invalid export file".into());
    }
    let c_path = CString::new(source.to_string_lossy().as_bytes())
        .map_err(|_| "invalid export file path")?;
    if unsafe { track3_ios_share_file(c_path.as_ptr()) } {
        Ok(())
    } else {
        Err("could not open the share sheet".into())
    }
}
