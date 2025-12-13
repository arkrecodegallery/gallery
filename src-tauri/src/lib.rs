mod assets;
mod bundle;
mod commands;
mod constants;
mod rules;
mod variables;
mod entry;

use crate::commands::generate_map;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![generate_map])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
