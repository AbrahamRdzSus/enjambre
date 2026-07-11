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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(SidecarChild(Mutex::new(None)))
        .setup(|app| {
            // Arranca el sidecar congelado y guarda el hijo para matarlo al cerrar.
            let cmd = app
                .shell()
                .sidecar("enjambre-sidecar")?
                .env("SIDECAR_PORT", "8000")
                // E5.1-C: habilita los endpoints /cli/* en el paquete (requiere el
                // binario `claude` en el PATH del usuario final; ver docs/CLI_AGENT.md).
                .env("ENJAMBRE_CLI_AGENTS", "1");
            let (mut rx, child) = cmd.spawn()?;
            app.state::<SidecarChild>().0.lock().unwrap().replace(child);
            // Drena el stdout del sidecar; captura el token (DEFAULT-ON) que imprime
            // como `ENJAMBRE_API_TOKEN=<tok>` y lo inyecta al webview para que el
            // dashboard autentique (si no, todo salvo /health responde 401).
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_shell::process::CommandEvent;
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(bytes) => {
                            let text = String::from_utf8_lossy(&bytes);
                            for line in text.lines() {
                                if let Some(tok) = line.trim().strip_prefix("ENJAMBRE_API_TOKEN=") {
                                    if let Some(win) = handle.get_webview_window("main") {
                                        let _ = win.eval(&format!(
                                            "window.__ENJAMBRE_TOKEN__={:?};", tok));
                                    }
                                }
                            }
                        }
                        CommandEvent::Terminated(_) => break,
                        _ => {}
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
