/**
 * Red de seguridad de render. Sin esto, cualquier throw en un componente (o un
 * chunk lazy que no carga) deja la ventana de Tauri COMPLETAMENTE en blanco, sin
 * ninguna pista de que paso: el usuario solo ve el fondo.
 *
 * Los boundaries de React siguen exigiendo una clase (no hay equivalente en hooks).
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Queda en la consola del webview: es el unico rastro para diagnosticar un
    // crash en la app empacada (no hay devtools en release).
    console.error('[enjambre] error de render:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div role="alert" className="grid min-h-[60vh] place-items-center p-6">
        <div className="glass flex max-w-md flex-col gap-3 p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} style={{ color: 'var(--alert)' }} />
            <h2 className="text-[15px] font-semibold text-foreground">
              La interfaz encontro un error
            </h2>
          </div>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Algo fallo al dibujar esta pantalla. Tus datos y tus claves no se han perdido:
            viven en el sidecar, no aqui.
          </p>
          <pre className="max-h-32 overflow-auto rounded-md bg-black/30 p-2 font-mono text-[11px] text-secondary-foreground scrollbar-thin">
            {error.message}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] text-foreground transition-colors hover:border-primary"
          >
            <RotateCcw size={13} style={{ color: 'var(--purple)' }} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }
}
