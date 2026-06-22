"""Entry point del sidecar para empaquetar con PyInstaller (uvicorn programatico).

El shell Tauri arranca este binario congelado como sidecar y le pasa el puerto via
SIDECAR_PORT. Local-only (127.0.0.1). Ver docs/ROADMAP_LEVANTAMIENTO.md (Fase B).
"""

from __future__ import annotations

import os


def main() -> None:
    import uvicorn

    from enjambre.api import app

    port = int(os.environ.get("SIDECAR_PORT", "8000"))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")


if __name__ == "__main__":
    main()
