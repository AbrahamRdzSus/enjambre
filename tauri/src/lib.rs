// Shell Tauri de ENJAMBRE: arranca el sidecar Python congelado (externalBin) en
// 127.0.0.1:8000, carga el dashboard React (Vite en dev, frontendDist en prod) y
// mata el sidecar al cerrar. Ver docs/ROADMAP_LEVANTAMIENTO.md (Fase B).

use std::sync::Mutex;

use tauri::{Manager, RunEvent};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

struct SidecarChild(Mutex<Option<CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SidecarChild(Mutex::new(None)))
        .setup(|app| {
            // Arranca el sidecar congelado y guarda el hijo para matarlo al cerrar.
            let cmd = app
                .shell()
                .sidecar("enjambre-sidecar")?
                .env("SIDECAR_PORT", "8000");
            let (mut rx, child) = cmd.spawn()?;
            app.state::<SidecarChild>().0.lock().unwrap().replace(child);
            // Drena los eventos del proceso para no bloquear el buffer.
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_shell::process::CommandEvent;
                while let Some(event) = rx.recv().await {
                    if let CommandEvent::Terminated(_) = event {
                        break;
                    }
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error al arrancar la app Tauri de ENJAMBRE")
        .run(|app, event| {
            if let RunEvent::ExitRequested { .. } = event {
                if let Some(child) = app.state::<SidecarChild>().0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        });
}
