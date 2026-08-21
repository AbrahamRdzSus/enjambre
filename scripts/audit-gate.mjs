// Gate de supply-chain de enjambre. Copiado del molde (skeleton-web/scripts/audit-gate.mjs).
//
// SIRVE A LOS DOS ARBOLES npm del repo (frontend/ y landing/): el job de CI lo invoca con
// `working-directory` puesto en cada uno, y `npm audit` trabaja sobre el lockfile de ese
// directorio. Una sola ALLOWLIST para los dos, que es un sitio menos donde mirar.
//
// QUE REEMPLAZA: `npm audit --audit-level=high` a secas. Ese comando no sabe baselinear un
// advisory concreto, asi que falla ante CUALQUIER high PARA SIEMPRE y el gate SE RE-ROMPE SOLO
// cada vez que se publica un advisory nuevo, sin que nadie toque el codigo. Eso fue real: los
// dos jobs de audit de este repo llevaban en rojo desde el 08-ago, y eran los UNICOS rojos.
// Un gate que se rompe solo entrena a ignorarlo, y de ahi al `|| true` hay un paso: es
// literalmente como obsidia-class acabo escaneando y saliendo verde SIEMPRE.
//
// POR QUE EXISTE (2026-08-20). Se audito el ecosistema entero y salio esto: de 30 repos, solo 6
// escaneaban dependencias de verdad. **13 tenian un CI que compila, testea y lintea con rigor y
// nunca miraba una sola dependencia.** No era descuido de cada app: los TRES skeletons tampoco
// traian gate de deps, asi que cada app nacia ciega y heredaba el hueco.
//
// El caso que lo destapo: Azuras, una app fiscal EN PRODUCCION, estaba VERDE en CI con 1
// vulnerabilidad critica y 13 high dentro. No era una excepcion: era el comportamiento por defecto
// del molde. Esto arregla el molde.
//
// POR QUE NO `npm audit --audit-level=high` A SECAS. No sabe baselinear un advisory concreto: falla
// ante CUALQUIER high, para siempre. Cuando aparece uno transitivo sin fix razonable, la salida
// facil acaba siendo `|| true`, y entonces el gate deja de morder sin que nadie lo note. Eso es
// literalmente lo que le paso a obsidia-class, que escanea y sale verde SIEMPRE: cobertura falsa,
// que es peor que no tener gate.
//
// Este gate ignora SOLO lo que este en la ALLOWLIST, con motivo y fecha de revision, y falla ante
// cualquier high/critical NUEVO.
//
// CORRE IGUAL EN LOCAL QUE EN CI:  node scripts/audit-gate.mjs
// No necesita node_modules: `npm audit` trabaja contra package-lock.json. Por eso puede cablearse
// tambien como hook de pre-push y costar CERO minutos de Actions.

import { execSync } from 'node:child_process';

// Clave = id GHSA. Al subir la dependencia parcheada, BORRAR su entrada: el gate vuelve a morder si
// el advisory reaparece. Una entrada sin `reviewBy` es una excepcion permanente disfrazada.
//
// REGLA DE ARRANQUE: un gate nuevo casi siempre nace rojo con vulnerabilidades REALES. Lo que tenga
// fix se arregla (prueba `npm update` primero: suele bastar y no toca package.json); lo transitivo
// sin fix razonable va aqui, con motivo verificado y fecha. Lo que NO se hace nunca es `|| true`.
const ALLOWLIST = {
  // 'GHSA-xxxx-xxxx-xxxx': {
  //   pkg: 'nombre (via quien lo arrastra)',
  //   reason: 'Por que NO aplica a como ESTA app usa la libreria. Verificado, no supuesto: di que '
  //         + 'comprobaste. Y por que no se puede arreglar hoy (ej. el unico fix sube dos majors).',
  //   added: 'AAAA-MM-DD',
  //   reviewBy: 'AAAA-MM-DD',
  // },
};

const SEVERITIES = new Set(['high', 'critical']);

function runAudit() {
  try {
    return execSync('npm audit --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    // npm audit sale con codigo != 0 cuando encuentra vulnerabilidades: el JSON viene igual
    // por stdout.
    if (e.stdout) return e.stdout.toString();
    throw e;
  }
}

const report = JSON.parse(runAudit());
const vulns = report.vulnerabilities || {};

const blocking = [];
const baselined = [];
const seen = new Set();

for (const entry of Object.values(vulns)) {
  if (!SEVERITIES.has(entry.severity)) continue;
  for (const via of entry.via) {
    if (typeof via !== 'object' || !via.url) continue; // ref por string a otro paquete
    if (!SEVERITIES.has(via.severity)) continue;
    const match = via.url.match(/GHSA-[\w-]+/);
    const id = match ? match[0] : via.url;
    if (seen.has(id)) continue;
    seen.add(id);
    const record = { id, title: via.title, url: via.url };
    if (ALLOWLIST[id]) baselined.push(record);
    else blocking.push(record);
  }
}

if (baselined.length > 0) {
  console.log('Advisories en baseline (no bloquean, con motivo + fecha de revision):');
  for (const b of baselined) {
    const meta = ALLOWLIST[b.id];
    console.log(`  - ${b.id} (${meta.pkg}) revisar antes de ${meta.reviewBy}: ${b.title ?? b.url}`);
  }
}

if (blocking.length > 0) {
  console.error(`\n::error::${blocking.length} advisory(s) high/critical NUEVOS fuera de la baseline:`);
  for (const b of blocking) {
    console.error(`  - ${b.id}: ${b.title ?? ''} ${b.url}`);
  }
  console.error('\nArregla la dependencia (`npm update` primero: suele bastar y no toca package.json) o, si de verdad no aplica a como esta app usa la libreria, agregala a la ALLOWLIST con motivo + fecha en scripts/audit-gate.mjs.');
  process.exit(1);
}

console.log(`\nSCA OK: 0 advisories high/critical fuera de la baseline (${baselined.length} baselined).`);
