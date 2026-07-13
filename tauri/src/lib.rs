// Shell Tauri de ENJAMBRE: arranca el sidecar Python congelado (externalBin) en
// 127.0.0.1:8000, carga el dashboard React (Vite en dev, frontendDist en prod) y
// mata el sidecar al cerrar. Ver docs/ROADMAP_LEVANTAMIENTO.md (Fase B).

use std::sync::Mutex;

use tauri::{Manager, RunEvent, State};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

struct SidecarChild(Mutex<Option<CommandChild>>);

/// Token del sidecar (DEFAULT-ON). El sidecar lo imprime en su stdout al arrancar;
/// aqui se GUARDA para que el frontend pueda PEDIRLO cuando quiera.
///
/// Antes solo se empujaba al webview con un `eval` unico y best-effort. Eso tenia
/// dos fallos: (1) el frontend renderiza de inmediato y podia lanzar sus primeras
/// peticiones -- y abrir el EventSource de /logs/stream, que solo lee el token UNA
/// vez -- antes de que el sidecar hubiera arrancado, quedandose sin token para
/// siempre; y (2) cualquier recarga del webview (F5, HMR) borraba la variable
/// global y nadie la volvia a inyectar. Con el token en estado gestionado, el
/// frontend lo pide (`invoke('api_token')`) y reintenta hasta tenerlo.
struct ApiToken(Mutex<Option<String>>);

/// Devuelve el token del sidecar, o `None` si aun no ha arrancado.
///
/// El frontend reintenta con backoff hasta que devuelve `Some` (ver
/// frontend/src/api/token.ts). Es un comando propio de la app, asi que Tauri lo
/// permite por defecto en todas las ventanas: no requiere entrada en capabilities/.
#[tauri::command]
fn api_token(state: State<'_, ApiToken>) -> Option<String> {
    state.0.lock().ok()?.clone()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(SidecarChild(Mutex::new(None)))
        .manage(ApiToken(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![api_token])
        .setup(|app| {
            // Arranca el sidecar congelado y guarda el hijo para matarlo al cerrar.
            let mut cmd = app
                .shell()
                .sidecar("enjambre-sidecar")?
                .env("SIDECAR_PORT", "8000")
                // E5.1-C: habilita los endpoints /cli/* en el paquete (requiere el
                // binario `claude` en el PATH del usuario final; ver docs/CLI_AGENT.md).
                .env("ENJAMBRE_CLI_AGENTS", "1");
            // P1-8: en el PAQUETE, la allowlist de roots se exige por defecto. Se fija
            // a la carpeta del usuario, asi /workspace, /changes y el registro de
            // proyectos no pueden salir de ahi (registrar C:\Windows se rechaza). Si el
            // usuario ya definio ENJAMBRE_ALLOWED_ROOTS en su entorno, se respeta.
            if std::env::var_os("ENJAMBRE_ALLOWED_ROOTS").is_none() {
                if let Ok(home) = app.path().home_dir() {
                    cmd = cmd.env(
                        "ENJAMBRE_ALLOWED_ROOTS",
                        home.to_string_lossy().to_string(),
                    );
                }
            }
            let (mut rx, child) = cmd.spawn()?;
            app.state::<SidecarChild>().0.lock().unwrap().replace(child);

            // Drena el stdout del sidecar y captura el token que imprime como
            // `ENJAMBRE_API_TOKEN=<tok>`. Se GUARDA en el estado (fuente de verdad,
            // sobrevive a recargas del webview). El `eval` se conserva solo como
            // fast-path: si la CSP lo bloquea, el frontend igual obtiene el token
            // por `invoke('api_token')`, que no depende de la CSP.
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_shell::process::CommandEvent;
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(bytes) => {
                            let text = String::from_utf8_lossy(&bytes);
                            for line in text.lines() {
                                if let Some(tok) =
                                    line.trim().strip_prefix("ENJAMBRE_API_TOKEN=")
                                {
                                    handle
                                        .state::<ApiToken>()
                                        .0
                                        .lock()
                                        .unwrap()
                                        .replace(tok.to_string());
                                    if let Some(win) = handle.get_webview_window("main") {
                                        let _ = win
                                            .eval(format!("window.__ENJAMBRE_TOKEN__={tok:?};"));
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
