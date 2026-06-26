# Creditos y licencias de terceros — landing ENJAMBRE

Registro del gate de licencias para los efectos visuales de la landing.

## Bundleado (dependencia con licencia permisiva)

- **uvcanvas** (`Opulento` / "Xenon") — npm `uvcanvas@^0.3`, **licencia MIT**
  (https://github.com/latentcat/uvcanvas). Se usa el paquete publicado tal cual
  (no se copia codigo del marketplace). Fondo shader del hero (`ui/XenonBg.tsx`).
  Nota: declara peer `react@^18`; funciona con React 19 via `legacy-peer-deps`.

## Re-creaciones nativas (inspiradas en conceptos de 21st.dev)

Los siguientes efectos son **implementaciones propias** en nuestro stack
(motion + SVG/CSS), inspiradas en componentes community de 21st.dev. NO se copio
su codigo: los Terminos de 21st.dev no otorgan licencia abierta por defecto
("propiedad exclusiva de sus autores y 21st Labs") y el codigo no era accesible.
Se re-crearon adaptados a la identidad (hexagono morado/ambar):

- **Splash honeycomb** (`components/Splash.tsx`) — loader de panal hexagonal.
  Inspirado en "honeycomb-loader" de @theutkarshmail.
- **HexBloom** (`ui/HexBloom.tsx`) — anillos hexagonales concentricos (ripple).
  Inspirado en "bloom/hero" de @h0bb5 (adaptado de cuadrados a hexagonos).

Nota: "animated-hud-targeting-ui" (@isaiahbjork) se probo como reticula del nucleo
pero se RETIRO a pedido del usuario (anillo giratorio mecanico, off-brand). El hero
usa ahora un halo organico que respira (referencia: hero de Obsidia Eye).

Si en el futuro se quiere usar el codigo original de alguno, hay que copiarlo
desde 21st.dev confirmando su licencia declarada y anadiendo el enlace de
atribucion que exigen sus Terminos.
