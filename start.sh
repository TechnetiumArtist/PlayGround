#!/usr/bin/env bash
set -Eeuo pipefail
PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
OPENCODE_WEB_DIR="${OPENCODE_WEB_DIR:-${RUNNER_TEMP:-/tmp}/omgithub-web}"
PORT="${PORT:-3000}"
OUT_DIR="$PROJECT_DIR/dist"

run() { /usr/bin/time -p "$@"; }
run mkdir -p "$OPENCODE_WEB_DIR" "$OUT_DIR"

if [[ -f "$PROJECT_DIR/package.json" ]]; then
  if [[ ! -d "$PROJECT_DIR/node_modules" ]]; then
    if [[ -f "$PROJECT_DIR/package-lock.json" ]]; then run npm ci --no-audit --no-fund --prefix "$PROJECT_DIR"; else run npm install --no-audit --no-fund --prefix "$PROJECT_DIR"; fi
  fi
  if run node -e "const p=require(process.argv[1]);process.exit(p.scripts?.build?0:1)" "$PROJECT_DIR/package.json"; then
    run npm --prefix "$PROJECT_DIR" run build
  fi
  [[ -f "$OUT_DIR/index.html" ]] || { run echo "Build did not create $OUT_DIR/index.html" >&2; exit 1; }
elif [[ ! -f "$OUT_DIR/index.html" ]]; then
  if [[ -f "$PROJECT_DIR/index.html" ]]; then
    run node - "$PROJECT_DIR" "$OUT_DIR" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [source, target] = process.argv.slice(2);
const skip = new Set(['.git', '.agents', '.github', '.omgithub', 'node_modules', 'dist']);
function copy(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const src = path.join(from, entry.name), dest = path.join(to, entry.name);
    if (entry.isDirectory()) copy(src, dest); else if (entry.isFile()) fs.copyFileSync(src, dest);
  }
}
copy(source, target);
NODE
  else
    run cat > "$OUT_DIR/index.html" <<'HTML'
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>Planetfall — Explorer</title><style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#080e17;color:#ecf5f2}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 65% 48%,#142b3a 0,#0a1420 47%,#080e17 78%);overflow:hidden}.app{max-width:1250px;margin:auto;padding:26px 34px;min-height:100vh;display:flex;flex-direction:column}.top{display:flex;justify-content:space-between;align-items:center;color:#8da7a9;font-size:12px;letter-spacing:.18em;text-transform:uppercase}.brand{color:#eaf1e8;font-weight:800;letter-spacing:.11em}.brand b{color:#d8f16a}.signal{color:#b4cf70}.main{display:grid;grid-template-columns:1fr 300px;gap:30px;align-items:center;flex:1}.scene{position:relative;min-height:570px;display:grid;place-items:center;isolation:isolate}.scene:before{content:"";position:absolute;inset:5% -5%;z-index:-1;background:radial-gradient(ellipse,rgba(49,104,115,.15),transparent 65%)}canvas{width:min(100%,690px);height:auto;max-height:76vh;filter:drop-shadow(0 26px 45px #02060ca8)}.scan{position:absolute;width:60%;height:1px;left:20%;top:20%;background:linear-gradient(90deg,transparent,#a6d9cd55,transparent);animation:scan 8s linear infinite;opacity:.5}@keyframes scan{to{top:80%}}.panel{border:1px solid #293d47;background:linear-gradient(145deg,#172631e8,#101a24e8);padding:24px;border-radius:4px;box-shadow:0 20px 55px #0004}.eyebrow{font-size:10px;letter-spacing:.2em;color:#9eb8b3;text-transform:uppercase}.panel h1{font-size:34px;line-height:1.04;margin:12px 0 8px;letter-spacing:-.04em}.panel h1 em{font-style:normal;color:#d7ee7a}.sub{color:#91a7a9;font-size:13px;line-height:1.6;margin:0 0 22px}.data{border-top:1px solid #30434a;border-bottom:1px solid #30434a;padding:14px 0;display:grid;gap:12px}.row{display:flex;justify-content:space-between;font-size:12px;color:#99b0af}.row strong{color:#eff1df;font-weight:600}.meter{height:3px;background:#31434b;margin-top:8px}.meter i{display:block;width:68%;height:100%;background:#c9e76c}.objective{margin-top:20px;display:flex;gap:10px;align-items:center;color:#d1dfae;font-size:12px}.orb{width:24px;height:24px;border:1px solid #93b974;border-radius:50%;display:grid;place-items:center;color:#daef83}.controls{margin-top:22px;display:flex;gap:8px}.controls button{cursor:pointer;border:1px solid #465a5b;background:#172a2e;color:#d9ecb6;padding:11px 14px;border-radius:3px;font:inherit;font-size:12px}.controls button:hover,.controls button:focus-visible{background:#30483d;outline:1px solid #c9e76c}.bottom{display:flex;justify-content:space-between;color:#718a8d;font-size:10px;letter-spacing:.11em;text-transform:uppercase}.keys{color:#9bb2ad}@media(max-width:760px){.app{padding:18px 17px}.main{grid-template-columns:1fr;gap:0;align-content:center}.scene{min-height:42vh}.panel{padding:19px}.panel h1{font-size:28px}.bottom{margin-top:18px}.top{font-size:10px}.panel .sub{margin-bottom:14px}.data{padding:10px 0;gap:9px}}@media(max-height:700px) and (min-width:761px){.scene{min-height:430px}.app{padding-top:16px;padding-bottom:16px}}
</style></head><body><main class="app"><header class="top"><div class="brand">✦ <b>ATLAS</b> / DEEP FIELD</div><div class="signal">● SIGNAL LOCKED &nbsp;·&nbsp; 04:28 UTC</div></header><section class="main"><div class="scene"><canvas id="planet" aria-label="Procedurally generated low-poly alien planet"></canvas><div class="scan"></div></div><aside class="panel"><div class="eyebrow">Expedition 07 &nbsp; / &nbsp; Kepler sector</div><h1>Vesper-<em>9</em></h1><p class="sub">A quiet world beneath an unfamiliar sun. Your survey begins here.</p><div class="data"><div class="row"><span>BIOME</span><strong id="biome">AMBER HIGHLANDS</strong></div><div class="row"><span>ATMOSPHERE</span><strong>BREATHABLE</strong></div><div class="row"><span>DISCOVERIES</span><strong id="count">00 / 03</strong></div><div><div class="row"><span>PLANETARY SURVEY</span><strong id="percent">12%</strong></div><div class="meter"><i id="meter"></i></div></div></div><div class="objective"><span class="orb">⌖</span><span id="objective">Locate the ancient signal</span></div><div class="controls"><button id="explore">EXPLORE &nbsp;→</button><button id="scan">◉ &nbsp; SCAN</button></div></aside></section><footer class="bottom"><span>PROCEDURAL WORLD / SEED 7F3A-09</span><span class="keys">WASD / ARROWS TO ROAM &nbsp; · &nbsp; TAP TO EXPLORE</span></footer></main><script>
(()=>{const c=document.querySelector('#planet'),x=c.getContext('2d'),count=document.querySelector('#count'),percent=document.querySelector('#percent'),meter=document.querySelector('#meter'),obj=document.querySelector('#objective'),biome=document.querySelector('#biome');let step=0,seed=9137,angle=0;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}function resize(){const d=Math.min(devicePixelRatio||1,2),r=c.getBoundingClientRect();c.width=r.width*d;c.height=r.height*d;x.setTransform(d,0,0,d,0,0)}function draw(){angle+=.0006;seed=9137;const w=c.clientWidth,h=c.clientHeight,cx=w*.51,cy=h*.49,R=Math.min(w*.37,h*.37);x.clearRect(0,0,w,h);for(let i=0;i<140;i++){let px=(rand()*w),py=(rand()*h);x.fillStyle=`rgba(202,226,207,${rand()*.45})`;x.fillRect(px,py,rand()*1.7+.3,rand()*1.7+.3)}x.strokeStyle='#7fa8a566';x.lineWidth=1;x.beginPath();x.ellipse(cx,cy+R*.75,R*1.35,R*.29,-.13,0,Math.PI*2);x.stroke();x.strokeStyle='#b9cc9d55';x.beginPath();x.ellipse(cx,cy+R*.75,R*1.07,R*.2,-.13,Math.PI,Math.PI*2);x.stroke();const rows=22,cols=26,pts=[];for(let j=0;j<=rows;j++){pts[j]=[];let lat=Math.PI*j/rows;for(let i=0;i<=cols;i++){let lon=2*Math.PI*i/cols+angle;let n=(rand()-.5)*.045,rad=R*(1+n);pts[j][i]=[cx+rad*Math.sin(lat)*Math.cos(lon),cy+rad*Math.cos(lat)*.82,rad*Math.sin(lat)*Math.sin(lon)]}}for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=pts[j][i],b=pts[j][i+1],d=pts[j+1][i],e=pts[j+1][i+1],z=(a[2]+b[2]+d[2]+e[2])/4;if(z<-.12*R)continue;const lum=Math.max(0,Math.min(1,.48+z/R*.45+(rand()-.5)*.22));const palette=z>R*.35?[[191,169,112],[185,127,81],[116,142,119],[93,125,124]]:[[67,120,121],[68,139,131],[82,151,134],[132,159,121]];let p=palette[Math.floor(rand()*palette.length)];x.fillStyle=`rgb(${p.map(v=>Math.round(v*lum)).join(',')})`;x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.lineTo(e[0],e[1]);x.lineTo(d[0],d[1]);x.closePath();x.fill()}x.fillStyle='#ffdea0';x.shadowColor='#ffbf75';x.shadowBlur=22;x.beginPath();x.arc(w*.82,h*.24,7,0,7);x.fill();x.shadowBlur=0;requestAnimationFrame(draw)}function explore(){step=Math.min(3,step+1);count.textContent=`0${step} / 03`;percent.textContent=`${12+step*26}%`;meter.style.width=`${12+step*26}%`;obj.textContent=step===3?'Signal mapped — expedition complete':'Surveying new terrain · '+(3-step)+' sites remaining';biome.textContent=['AMBER HIGHLANDS','GLASSWATER BASIN','MOSS-LIT RIDGE','ANCIENT SIGNAL'][step]}document.querySelector('#explore').onclick=explore;document.querySelector('#scan').onclick=()=>{obj.textContent='Scan complete — trace detected to the east';document.querySelector('.orb').textContent='✓'};window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)){e.preventDefault();explore()}});new ResizeObserver(resize).observe(c);resize();draw()})();
</script></body></html>
HTML
  fi
fi

run node - "$OPENCODE_WEB_DIR/deployment-output.json" "$PROJECT_DIR" "$OUT_DIR" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [metadata, project, directory] = process.argv.slice(2);
if (!fs.existsSync(path.join(directory, 'index.html'))) throw new Error('Built static directory is missing index.html');
fs.mkdirSync(path.dirname(metadata), { recursive: true });
fs.writeFileSync(metadata, JSON.stringify({ project: path.resolve(project), directory: path.resolve(directory) }));
NODE
export PROJECT_DIR OUT_DIR PORT
run node --input-type=module <<'NODE'
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, join } from 'node:path';
const root = resolve(process.env.OUT_DIR), mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp' };
const server = createServer((req,res)=>{try{const url=new URL(req.url,'http://localhost');let file=resolve(root,'.'+decodeURIComponent(url.pathname));if(file!==root&&!file.startsWith(root+'/')){res.writeHead(403);res.end('Forbidden');return}if(statSync(file).isDirectory())file=join(file,'index.html');res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(readFileSync(file))}catch{res.writeHead(404);res.end('Not found')}});
server.listen(Number(process.env.PORT), '0.0.0.0', ()=>console.log(`Serving ${root} on port ${process.env.PORT}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
NODE
