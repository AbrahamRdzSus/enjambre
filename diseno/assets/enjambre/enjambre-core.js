/* ENJAMBRE — nucleo visual compartido
   ENJ.core(size, opts)  -> SVG del nucleo de orquestacion (hex ambar + nodos)
   ENJ.mark(size, opts)  -> isotipo simple hex+nodos
   ENJ.circuit(w,h)      -> trazos de circuito decorativos
*/
(function(){
  const NS='http://www.w3.org/2000/svg';

  // ---- Nucleo de orquestacion: hexagono central ambar con nodos morados ----
  function core(size, opts={}){
    const s=size, c=s/2, R=s*0.40;            // radio de nodos
    const nodes=opts.nodes||8;
    const animate=opts.animate!==false;
    const uid='c'+Math.random().toString(36).slice(2,8);
    // posiciones de nodos
    const pts=[];
    for(let i=0;i<nodes;i++){
      const a=(Math.PI*2*i/nodes)-Math.PI/2;
      pts.push([c+Math.cos(a)*R, c+Math.sin(a)*R]);
    }
    const hex=(cx,cy,r)=>{let p='';for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6;p+=(i?'L':'M')+(cx+Math.cos(a)*r).toFixed(1)+' '+(cy+Math.sin(a)*r).toFixed(1)+' ';}return p+'Z';};
    const iconKey={'</>':'M -5 -4 L -9 0 L -5 4 M 5 -4 L 9 0 L 5 4 M 2 -6 L -2 6',
      'db':'M -7 -6 A 7 3 0 0 0 7 -6 L 7 6 A 7 3 0 0 1 -7 6 Z M -7 -6 A 7 3 0 0 0 7 -6 A 7 3 0 0 0 -7 -6',
      'chat':'M -8 -5 H 8 V 4 H -1 L -5 8 V 4 H -8 Z'};
    const icons=['</>','db','chat','db','</>','chat','db','</>'];
    let lines='', dots='', glints='';
    pts.forEach((p,i)=>{
      lines+=`<line x1="${c}" y1="${c}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}" stroke="url(#${uid}line)" stroke-width="${s*0.006}" />`;
      const dly=(i*0.5).toFixed(2);
      const nodeR=s*0.052;
      dots+=`<g transform="translate(${p[0].toFixed(1)},${p[1].toFixed(1)})">
        <circle r="${nodeR*1.9}" fill="rgba(139,92,246,.10)"/>
        <path d="${hex(0,0,nodeR)}" fill="#1b1230" stroke="rgba(167,139,250,.85)" stroke-width="${s*0.004}"/>
        <circle r="${nodeR*0.34}" fill="#c4b1ff">
          ${animate?`<animate attributeName="opacity" values="1;.35;1" dur="2.6s" begin="${dly}s" repeatCount="indefinite"/>`:''}
        </circle></g>`;
      if(animate){
        glints+=`<circle r="${s*0.012}" fill="#FFD27a">
          <animateMotion dur="2.8s" begin="${dly}s" repeatCount="indefinite" path="M ${c} ${c} L ${p[0].toFixed(1)} ${p[1].toFixed(1)}"/>
          <animate attributeName="opacity" values="0;1;0" dur="2.8s" begin="${dly}s" repeatCount="indefinite"/></circle>`;
      }
    });
    const coreR=s*0.135;
    return `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" xmlns="${NS}" aria-hidden="true" style="display:block">
      <defs>
        <radialGradient id="${uid}line" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
          gradientTransform="translate(${c} ${c}) scale(${R})">
          <stop offset="0" stop-color="#ffb020" stop-opacity=".9"/>
          <stop offset=".4" stop-color="#8B5CF6" stop-opacity=".7"/>
          <stop offset="1" stop-color="#4A2C7D" stop-opacity=".25"/>
        </radialGradient>
        <radialGradient id="${uid}glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="#FFD27a"/><stop offset=".45" stop-color="#FFB020"/>
          <stop offset="1" stop-color="#7a3d00" stop-opacity="0"/>
        </radialGradient>
        <filter id="${uid}blur"><feGaussianBlur stdDeviation="${s*0.02}"/></filter>
      </defs>
      <path d="${hex(c,c,R*1.13)}" fill="none" stroke="rgba(139,92,246,.30)" stroke-width="${s*0.006}"/>
      <path d="${hex(c,c,R*1.13)}" fill="none" stroke="rgba(255,176,32,.18)" stroke-width="${s*0.018}" filter="url(#${uid}blur)"/>
      <g opacity=".9">${lines}</g>
      ${dots}
      ${glints}
      <circle cx="${c}" cy="${c}" r="${coreR*2.1}" fill="url(#${uid}glow)" opacity=".55" filter="url(#${uid}blur)">
        ${animate?`<animate attributeName="opacity" values=".4;.7;.4" dur="3.2s" repeatCount="indefinite"/>`:''}
      </circle>
      <path d="${hex(c,c,coreR)}" fill="#FFB020" stroke="#FFE3a6" stroke-width="${s*0.006}"/>
      <path d="${hex(c,c,coreR*0.5)}" fill="#fff7e6"/>
    </svg>`;
  }

  // ---- Isotipo plano (hex contorno + 6 nodos + hex central) ----
  function mark(size, opts={}){
    const s=size, c=s/2, R=s*0.30, r=s*0.30;
    const stroke=opts.stroke||'#a78bfa', node=opts.node||'#9333ea', center=opts.center||'#FFB020';
    const sw=opts.sw||s*0.035;
    const hex=(cx,cy,rr)=>{let p='';for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6;p+=(i?'L':'M')+(cx+Math.cos(a)*rr).toFixed(1)+' '+(cy+Math.sin(a)*rr).toFixed(1)+' ';}return p+'Z';};
    let nodes='';
    for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6;const x=c+Math.cos(a)*R, y=c+Math.sin(a)*R;
      nodes+=`<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${stroke}" stroke-width="${sw*0.7}"/>`;}
    let circs='';
    for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6;const x=c+Math.cos(a)*R, y=c+Math.sin(a)*R;
      circs+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s*0.075}" fill="${node}"/>`;}
    return `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" xmlns="${NS}" aria-hidden="true" style="display:block">
      <path d="${hex(c,c,r*1.55)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      ${nodes}${circs}
      <path d="${hex(c,c,s*0.115)}" fill="${center}"/>
    </svg>`;
  }

  function circuit(w,h,color='rgba(139,92,246,.22)'){
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="none" xmlns="${NS}" aria-hidden="true">
      <g fill="none" stroke="${color}" stroke-width="1.2">
        <path d="M0 ${h*0.5} H ${w*0.22} L ${w*0.27} ${h*0.42} H ${w*0.34}"/>
        <path d="M${w} ${h*0.5} H ${w*0.78} L ${w*0.73} ${h*0.58} H ${w*0.66}"/>
        <circle cx="${w*0.34}" cy="${h*0.42}" r="3" fill="${color}" stroke="none"/>
        <circle cx="${w*0.66}" cy="${h*0.58}" r="3" fill="${color}" stroke="none"/>
      </g></svg>`;
  }

  window.ENJ={core,mark,circuit};
})();
