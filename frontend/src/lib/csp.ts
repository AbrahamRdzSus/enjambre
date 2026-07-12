/**
 * Vigila las violaciones de la Content-Security-Policy.
 *
 * El webview empacado corre con una CSP estricta (tauri.conf.json > app.security).
 * El peligro de una CSP no es que falle ruidosamente: es que bloquee un recurso EN
 * SILENCIO y la app se rompa sin dejar rastro. El navegador emite un evento cuando
 * eso pasa; aqui se convierte en un error visible.
 *
 * Es barato y vale en produccion: la app empacada no tiene devtools, pero el error
 * queda en la consola del webview, que es el unico rastro para diagnosticar.
 */
export function watchCspViolations(): void {
  if (typeof document === 'undefined') return;

  document.addEventListener('securitypolicyviolation', (e) => {
    console.error(
      '[enjambre] CSP bloqueo un recurso.\n' +
        `  directiva: ${e.violatedDirective}\n` +
        `  bloqueado: ${e.blockedURI || '(inline)'}\n` +
        `  en:        ${e.sourceFile || document.location.href}:${e.lineNumber}\n` +
        '  Si algo de la app dejo de funcionar, empieza por aqui: ajusta la CSP en ' +
        'tauri/tauri.conf.json (app.security.csp y devCsp).',
    );
  });
}
