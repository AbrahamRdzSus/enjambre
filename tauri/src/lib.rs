// Shell Tauri de ENJAMBRE: abre la ventana y carga el dashboard React (Vite en
// dev, frontendDist en prod). El sidecar FastAPI (enjambre.api) se corre/consume
// por HTTP local en 127.0.0.1:8000; su spawn automatico (binario congelado con
// PyInstaller como externalBin) se agrega en una iteracion posterior.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error al arrancar la app Tauri de ENJAMBRE");
}
