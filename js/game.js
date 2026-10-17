// Logika, crtanje i kontrole igre. Leveli su u levels.js.
(() => {
const T = 32;
const FLOORS = '.,:;_';
const SOLID = new Set(['#','W','T','B','K','F','H','X','D','M','N','Z']);
const OPAQUE = new Set(['#','W','F','X']);


const CAUGHT_LINES = [
  'Slučaj je prebačen na domaće tijelo. Možeš nastaviti.',
  'Nalog je nekako završio u ladici. Pokušaj ponovno.',
  'Istražni zatvor? Ne, samo informativni razgovor.',
  'Dokazi su proglašeni nezakonitima. Idemo opet.',
  'Stranka je izdala priopćenje: politički progon. Nastavi.'
];

const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const eur = new Intl.NumberFormat('hr-HR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const angDiff = (a,b) => ((b-a+Math.PI*3)%(Math.PI*2))-Math.PI;
function turn(o,a,dt,k=10){ o.ang += angDiff(o.ang,a)*Math.min(1,dt*k); }

// ---------- saved progress ----------
let save = {unlocked:0, stars:[0,0,0], mandates:0};
try { const s = JSON.parse(localStorage.getItem('pd_save2')||'null'); if (s) save = Object.assign(save, s); } catch(e) {}
function persist(){ try { localStorage.setItem('pd_save2', JSON.stringify(save)); } catch(e) {} }

// ---------- level data ----------
let LI=0, L, grid, floorG, H, W, WW, WH, spots, wardrobes, exits, shrine, start, bg, ministers;
function floorNear(M,r,c){
  for (let rad=1; rad<4; rad++) for (const [dr,dc] of [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,1],[-1,1],[1,-1]]){
    const ch = (M[r+dr*rad]||'')[c+dc*rad]; if (ch && FLOORS.includes(ch)) return ch;
  }
  return '.';
}
function loadLevel(i){
  LI = i; L = LEVELS[i]; const M = L.map;
  H = M.length; W = M[0].length; WW = W*T; WH = H*T;
  grid = M.map(r=>r.split('')); floorG = M.map(r=>r.split(''));
  spots=[]; wardrobes=[]; exits=[]; shrine=null; start={c:1,r:1}; ministers=[];
  for (let r=0;r<H;r++) for (let c=0;c<W;c++){
    const ch = M[r][c];
    if (ch==='G') floorG[r][c] = ';';
    else if (!FLOORS.includes(ch) && ch!=='#' && ch!=='C') floorG[r][c] = floorNear(M,r,c);
    if (ch==='A'){ spots.push({c,r}); grid[r][c]=floorG[r][c]; }
    if (ch==='P'){ start={c,r}; grid[r][c]=floorG[r][c]; }
    if (ch==='S'){ shrine={c,r,x:c*T+16,y:r*T+16}; grid[r][c]=floorG[r][c]; }
    if (ch==='W') wardrobes.push({c,r,x:c*T+16,y:r*T+16});
    if (ch==='C') exits.push({c,r,x:c*T+16,y:r*T+16});
    if (ch==='M'){ const k=ministers.length; ministers.push({c,r,x:c*T+16,y:r*T+16,coat:MIN_LOOKS[k%MIN_LOOKS.length][0],hair:MIN_LOOKS[k%MIN_LOOKS.length][1],seed:k*1.7}); }
  }
  buildBg();
}

// ---------- grid helpers ----------
function tileAt(x,y){ const c=Math.floor(x/T), r=Math.floor(y/T); if (r<0||r>=H||c<0||c>=W) return '#'; return grid[r][c]; }
const allGot = () => items && got === items.length;
function solidAt(x,y){ const ch = tileAt(x,y); return SOLID.has(ch) || (ch==='C' && !allGot()); }
function blocked(x,y,r){ return solidAt(x-r,y-r)||solidAt(x+r,y-r)||solidAt(x-r,y+r)||solidAt(x+r,y+r); }
function okP(c,r){ if (r<0||r>=H||c<0||c>=W) return false; const ch=grid[r][c]; return !SOLID.has(ch) && (ch!=='C' || allGot()); }
function okI(c,r){ if (r<0||r>=H||c<0||c>=W) return false; const ch=grid[r][c]; return !SOLID.has(ch) && ch!=='C'; }
function inGnoj(x,y){ return tileAt(x,y)==='G'; }
function los(x1,y1,x2,y2){ const d=Math.hypot(x2-x1,y2-y1), n=Math.ceil(d/6); for(let i=1;i<n;i++){ const t=i/n; if (OPAQUE.has(tileAt(x1+(x2-x1)*t, y1+(y2-y1)*t))) return false; } return true; }
function bfs(sc,sr,tc,tr,ok,diag){
  if (!ok(tc,tr)) return null;
  if (sc===tc && sr===tr) return [];
  const key=(c,r)=>r*W+c, prev=new Map([[key(sc,sr),-1]]), q=[[sc,sr]];
  const dirs = diag ? [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]] : [[1,0],[-1,0],[0,1],[0,-1]];
  let found=false;
  for (let qi=0; qi<q.length; qi++){ const [c,r]=q[qi]; if (c===tc&&r===tr){found=true;break;}
    for (const [dc,dr] of dirs){ const nc=c+dc, nr=r+dr, k=key(nc,nr);
      if (prev.has(k) || !ok(nc,nr)) continue;
      if (dc && dr && (!ok(c+dc,r) || !ok(c,r+dr))) continue;
      prev.set(k,key(c,r)); q.push([nc,nr]); } }
  if (!found) return null;
  const path=[]; let k=key(tc,tr); const s=key(sc,sr); while(k!==s){ path.unshift([k%W,Math.floor(k/W)]); k=prev.get(k); }
  return path;
}
function clearLine(a,b){ const d=Math.hypot(b.x-a.x,b.y-a.y), n=Math.max(1,Math.ceil(d/6)); for(let k=1;k<=n;k++){ const t=k/n; if (blocked(a.x+(b.x-a.x)*t, a.y+(b.y-a.y)*t, 9)) return false; } return true; }
function smooth(pts){
  if (pts.length<3) return pts;
  const out=[pts[0]]; let i=0;
  while (i<pts.length-1){ let j=pts.length-1; while (j>i+1 && !clearLine(pts[i],pts[j])) j--; out.push(pts[j]); i=j; }
  return out;
}

// ---------- audio ----------
let ac=null, muted=false;
function beep(f,d,type='square',vol=.05,slide=0,delay=0){
  if (muted||!ac) return; const t=ac.currentTime+delay, o=ac.createOscillator(), g=ac.createGain();
  o.type=type; o.frequency.setValueAtTime(f,t); if(slide) o.frequency.exponentialRampToValueAtTime(f*slide,t+d);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+d); o.connect(g).connect(ac.destination); o.start(t); o.stop(t+d+.02);
}
const sfx = {
  pick(){ beep(880,.08); beep(1320,.12,'square',.05,0,.07); },
  alarm(){ beep(520,.2,'sawtooth',.05,1.6); },
  huh(){ beep(400,.14,'triangle',.06,1.4); },
  talk(){ beep(220,.1,'square',.05); beep(180,.18,'square',.05,0,.1); },
  fanfare(){ [523,659,784,1047].forEach((f,i)=>beep(f,.16,'square',.05,0,i*.12)); },
  siren(){ for(let i=0;i<4;i++) beep(700,.22,'sawtooth',.045,.7,i*.24); },
  hide(){ beep(160,.12,'triangle',.07); },
  tap(){ beep(660,.04,'triangle',.03); },
  squish(){ beep(90,.18,'sine',.08,.6); },
  win(){ [392,523,659,784,659,1047].forEach((f,i)=>beep(f,.18,'square',.05,0,i*.13)); }
};

// ---------- game state ----------
let player, items, insps, rings, money, got, izjave, shrineUsed, reinforced, running=false, inMenu=true, elapsed=0, everChased=false, noiseT=0, pBubble=null, tclock=0, marker=null, runMode=false, moved=false, hintShown=false, gnojTip=false, chaseAlpha=0, catches=0;
let runMoney=LEVELS.map(()=>0), trucks=[];
const MIN_LOOKS = [['#2f3542','#2b2b2b'],['#3b3f4a','#c9c9c9'],['#283044','#6b4a2b'],['#40444f','#1c1c1c'],['#2b2f38','#8a8a8a']];
const MIN_LINES = ['Voda je ispravna!','Sve je pod kontrolom.','Živjeli!','Mjerenja su odlična.','Tko to širi paniku?'];
// nakon afere s nalazom o mikroplastici ministri gledaju u čaše
const MIN_LINES_MICRO = ['…možda ipak ne.','Što je ovo plavo u čaši?','Nalaz? Kakav nalaz?','Ja sam pio iz boce.','Ovo je sigurno od opozicije.'];
let microPlastic=false;

function mkInsp(wps, coat, hair){
  const [c,r]=wps[0];
  return {x:c*T+16,y:r*T+16,ang:Math.PI/2,state:'patrol',wps,wi:1,path:[],wait:.8,look:0,lookBase:0,arr:false,alert:0,last:null,lost:0,frozen:0,repath:0,sawHide:false,seeing:false,coat,hair};
}
const INSP_LOOKS = [['#c9a26a','#6b4a2b'],['#b9b0a0','#d9b45a'],['#a88d6a','#2b2b2b'],['#cdb48a','#8a3b1f']];
function reset(){
  player = {x:start.c*T+16, y:start.r*T+16, ang:-Math.PI/2, hidden:null, path:[], pendingHide:null, runTrip:false, moving:false};
  items = spots.map((s,i)=>({...s, x:s.c*T+16, y:s.r*T+16, def:L.afere[i%L.afere.length], got:false}));
  insps = L.patrols.map((p,k)=>mkInsp(p, ...INSP_LOOKS[k%INSP_LOOKS.length]));
  trucks = (L.trucks||[]).map(t=>({x:t.wps[0][0]*T+16, y:t.wps[0][1]*T+16, ang:0, wps:t.wps, wi:1, sp:t.sp||70, lines:t.lines, li:0, talkT:0, sayCd:3}));
  rings=[]; money=0; got=0; izjave=2; microPlastic=false; shrineUsed=false; reinforced=false; everChased=false; noiseT=0; pBubble=null; marker=null;
  elapsed=0; moved=false; hintShown=false; gnojTip=false; chaseAlpha=0;
  toastQ.length=0; hideToast(); snapCam=true; hud();
}
function hud(){
  $('hLevel').textContent = `${L.kicker} · ${L.name}`;
  $('hAfere').textContent = `${got}/${items.length}`;
  $('hCash').textContent = eur.format(money);
  const tb=$('talkBtn'); tb.firstChild.textContent = `Nemam komentara · ${izjave} `; tb.disabled = izjave<=0;
}
let lastBtnState='';
function syncButtons(){
  const nearW = !player.hidden && !!nearestWardrobe(40);
  const st = `${runMode}|${!!player.hidden}|${nearW}`;
  if (st===lastBtnState) return; lastBtnState=st;
  const rb=$('runBtn'); rb.firstChild.textContent = runMode ? 'Trk ' : 'Hod '; rb.classList.toggle('on',runMode); rb.setAttribute('aria-pressed',String(runMode));
  const hb=$('hideBtn'); hb.firstChild.textContent = player.hidden ? 'Izađi iza fotelje ' : 'Iza fotelje '; hb.classList.toggle('ready', nearW || !!player.hidden);
}

// ---------- toasts ----------
const toastQ=[]; let toastT=0;
function toast(title, body, warn=false){ toastQ.push({title,body,warn}); if (toastT<=0) nextToast(); }
function nextToast(){ const el=$('toast'), t=toastQ.shift(); if(!t){ el.hidden=true; toastT=0; return; }
  el.className='toast'+(t.warn?' warn':''); el.innerHTML=`<h3>${t.title}</h3><p>${t.body}</p>`; el.hidden=false; toastT=3; }
function hideToast(){ $('toast').hidden=true; toastT=0; }
function say(text,t=1.8){ pBubble={text,t}; }

// ---------- player actions ----------
function nearestWardrobe(maxD){ let best=null, bd=maxD; for (const w of wardrobes){ const d=Math.hypot(w.x-player.x,w.y-player.y); if (d<bd){bd=d;best=w;} } return best; }
function hide(w){ player.hidden=w; player.path=[]; marker=null; insps.forEach(i=>{ if(i.seeing) i.sawHide=true; }); sfx.hide(); }
function unhide(){ player.hidden=null; insps.forEach(i=>i.sawHide=false); sfx.hide(); }
function toggleHide(){
  if (!running) return;
  if (player.hidden){ unhide(); return; }
  const w = nearestWardrobe(40);
  if (w){ hide(w); return; }
  const far = nearestWardrobe(9999);
  if (far){ goTo(far.c, far.r, null, null, false); say('Idem iza fotelje…',1.2); }
}
function statement(){
  if (!running || player.hidden) return;
  if (izjave<=0){ toast('Nema više izjava','Svi su već čuli da nemaš komentara.',true); return; }
  const near = insps.filter(i => Math.hypot(i.x-player.x,i.y-player.y) < 150 && i.frozen<=0);
  if (!near.length){ say('Nitko me ništa ne pita?'); return; }
  izjave--; hud(); sfx.talk(); say('NEMAM KOMENTARA!',2);
  near.forEach(i=>{ i.frozen=3.4; i.state='patrol'; i.path=[]; i.wait=0; i.alert=0; i.arr=false; i.sawHide=false; });
}
function goTo(c,r,wx,wy,dbl){
  if (player.hidden) unhide();
  let hideW=null;
  if (grid[r] && grid[r][c]==='W'){
    hideW = wardrobes.find(w=>w.c===c&&w.r===r);
    const cand = [[1,0],[-1,0],[0,1],[0,-1]].map(([dc,dr])=>[c+dc,r+dr]).filter(([cc,rr])=>okP(cc,rr))
      .sort((a,b)=>Math.hypot(a[0]*T+16-player.x,a[1]*T+16-player.y)-Math.hypot(b[0]*T+16-player.x,b[1]*T+16-player.y));
    if (!cand.length) return; [c,r]=cand[0]; wx=wy=null;
  } else if (!okP(c,r)){
    let best=null, bd=1e9;
    for (let dr=-2;dr<=2;dr++) for (let dc=-2;dc<=2;dc++){ const cc=c+dc, rr=r+dr; if(!okP(cc,rr)) continue;
      const d=Math.hypot(dc,dr); if (d<bd){bd=d;best=[cc,rr];} }
    if (!best) return; [c,r]=best; wx=wy=null;
  }
  const sc=Math.floor(player.x/T), sr=Math.floor(player.y/T);
  const p = bfs(sc,sr,c,r,okP,true);
  if (!p){ say('Tamo ne mogu.',1.2); return; }
  const pts = p.map(([cc,rr])=>({x:cc*T+16,y:rr*T+16}));
  if (wx!=null && !blocked(wx,wy,10)){ if (pts.length) pts[pts.length-1]={x:wx,y:wy}; else pts.push({x:wx,y:wy}); }
  player.path = smooth([{x:player.x,y:player.y}, ...pts]).slice(1);
  player.pendingHide = hideW; player.runTrip = !!dbl;
  const end = player.path[player.path.length-1] || {x:player.x,y:player.y};
  marker = {x:end.x, y:end.y, t:0, run:!!dbl, hide:!!hideW};
  moved = true; sfx.tap();
}
function emitNoise(x,y,R){
  rings.push({x,y,r:6,max:R});
  for (const i of insps){
    if (i.frozen>0 || i.state==='chase') continue;
    if (Math.hypot(i.x-x,i.y-y) < R){ investigate(i, Math.floor(x/T), Math.floor(y/T)); sfx.huh(); }
  }
}

// ---------- inspector AI ----------
function setPath(i,c,r){ const p = bfs(Math.floor(i.x/T),Math.floor(i.y/T),c,r,okI,false); i.path = p || []; }
function investigate(i,c,r){ i.state='inv'; i.arr=false; i.look=0; setPath(i,c,r); }
function follow(o,sp,dt){
  if (!o.path.length) return false;
  const [c,r]=o.path[0], tx=c*T+16, ty=r*T+16, dx=tx-o.x, dy=ty-o.y, d=Math.hypot(dx,dy), step=sp*dt;
  if (d<=step){ o.x=tx; o.y=ty; o.path.shift(); return o.path.length===0; }
  o.x+=dx/d*step; o.y+=dy/d*step; turn(o,Math.atan2(dy,dx),dt); return false;
}
function canSee(i){
  if (player.hidden) return false;
  const dx=player.x-i.x, dy=player.y-i.y, d=Math.hypot(dx,dy);
  if (inGnoj(player.x,player.y) && d>34) return false;
  if (d<26) return true;
  if (d>L.vis) return false;
  if (Math.abs(angDiff(i.ang, Math.atan2(dy,dx))) > .6) return false;
  return los(i.x,i.y,player.x,player.y);
}

// ---------- update ----------
const keys={};
function update(dt){
  elapsed+=dt; tclock+=dt;
  if (toastT>0){ toastT-=dt; if(toastT<=0) nextToast(); }
  if (pBubble){ pBubble.t-=dt; if(pBubble.t<=0) pBubble=null; }
  if (marker) marker.t+=dt;

  // --- player ---
  let mx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
  let my=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
  const shift = keys.ShiftLeft||keys.ShiftRight;
  const run = runMode || shift || player.runTrip;
  const gnoj = inGnoj(player.x,player.y);
  let sp = (run?158:94) * (gnoj?.68:1);
  player.moving=false;
  if ((mx||my) && !player.hidden){
    player.path=[]; player.pendingHide=null; marker=null; moved=true;
    const m=Math.hypot(mx,my); mx/=m; my/=m; const s=sp*dt;
    const nx=player.x+mx*s; if (!blocked(nx,player.y,10)) player.x=nx;
    const ny=player.y+my*s; if (!blocked(player.x,ny,10)) player.y=ny;
    turn(player,Math.atan2(my,mx),dt,14); player.moving=true;
  } else if (player.path.length && !player.hidden){
    const p=player.path[0], dx=p.x-player.x, dy=p.y-player.y, d=Math.hypot(dx,dy), s=sp*dt;
    if (d<=s){ player.x=p.x; player.y=p.y; player.path.shift(); }
    else { player.x+=dx/d*s; player.y+=dy/d*s; turn(player,Math.atan2(dy,dx),dt,14); }
    player.moving=true;
    if (!player.path.length){
      player.runTrip=false; marker=null;
      if (player.pendingHide){ const w=player.pendingHide; player.pendingHide=null; if (Math.hypot(w.x-player.x,w.y-player.y)<44) hide(w); }
    }
  }
  if (player.moving && run){ noiseT-=dt; if (noiseT<=0){ emitNoise(player.x,player.y,150); noiseT=.45; } } else noiseT=0;
  if (gnoj && !gnojTip){ gnojTip=true; sfx.squish(); toast(L.pile==='otpad'?'Zakopao si se u otpad':'U gnojivu si', L.pile==='otpad'?'Istražitelji te ne vide dok si u hrpi, osim izbliza. Smrdi, ali radi.':'Istražitelji te ne vide dok si u hrpi, osim izbliza.'); }
  if (!moved && elapsed>6 && !hintShown){ hintShown=true; toast('Kako se kreće?','Klikni ili dodirni bilo gdje na tlocrtu i lik ide tamo. Dvoklik = trk.',true); }

  // --- pickups ---
  for (const it of items){
    if (!it.got && !player.hidden && Math.hypot(it.x-player.x,it.y-player.y)<20){
      it.got=true; got++; money+=it.def.val; sfx.pick(); hud();
      if (it.def.fx==='mikroplastika') microPlastic=true;
      toast(it.def.name, `${it.def.txt} <em>+${eur.format(it.def.val)}</em>`);
      if (got===4 && !reinforced){ reinforced=true; const n=mkInsp(L.reinforce,'#9c7a4e','#1c1c1c'); n.state='inv'; insps.push(n); sfx.alarm(); toast('Pojačanje iz Luksemburga!','Još jedan istražitelj ulazi kroz garažu.',true); }
      if (allGot()){ sfx.fanfare(); toast('Aktovka je puna','Bježi do auta, prati zelenu strelicu.'); }
    }
  }
  if (shrine && !shrineUsed && Math.hypot(shrine.x-player.x,shrine.y-player.y)<20){
    shrineUsed=true; izjave++; hud(); sfx.fanfare(); toast('Oltarić PPD-a','Stranka te voli. Dobio si još jednu izjavu „Nemam komentara“.');
  }
  if (allGot() && Math.floor(player.x/T) >= W-1){ levelWin(); return; }

  // --- inspectors ---
  let anyChase=false;
  for (const i of insps){
    if (i.frozen>0){ i.frozen-=dt; i.seeing=false; continue; }
    i.seeing = canSee(i);
    const dPl = Math.hypot(player.x-i.x, player.y-i.y);
    if (i.seeing){
      i.last={c:Math.floor(player.x/T), r:Math.floor(player.y/T)}; i.lost=0;
      if (i.state!=='chase'){ i.alert += dt*(dPl<80?5:1.9); if (i.alert>=1){ i.state='chase'; i.repath=0; everChased=true; sfx.alarm(); } }
    } else if (i.state!=='chase') i.alert=Math.max(0,i.alert-dt*.5);

    if (i.state==='chase'){
      anyChase=true;
      const tracking = i.seeing || (i.sawHide && player.hidden);
      if (!tracking){ i.lost+=dt; if (i.lost>2.2 && i.last){ i.alert=0; investigate(i,i.last.c,i.last.r); continue; } }
      i.repath-=dt;
      if (i.repath<=0){ i.repath=.25; const tg = tracking ? {c:Math.floor(player.x/T), r:Math.floor(player.y/T)} : i.last; if (tg) setPath(i,tg.c,tg.r); if (i.path.length>1){ const [c0,r0]=i.path[0]; if (Math.hypot(c0*T+16-i.x,r0*T+16-i.y)<T*.6 && Math.floor(i.x/T)===c0 && Math.floor(i.y/T)===r0) i.path.shift(); } }
      if (tracking && dPl<44){ const a=Math.atan2(player.y-i.y,player.x-i.x); i.x+=Math.cos(a)*105*dt; i.y+=Math.sin(a)*105*dt; turn(i,a,dt); }
      else if (!follow(i,105,dt) && !i.path.length && !tracking && i.last){ i.alert=0; investigate(i,i.last.c,i.last.r); }
    } else if (i.state==='inv'){
      if (!i.arr){ if (follow(i,70,dt) || !i.path.length){ i.arr=true; i.look=2.4; i.lookBase=i.ang; } }
      else { i.look-=dt; i.ang=i.lookBase+Math.sin(i.look*2.6)*1.1; if (i.look<=0){ i.state='patrol'; i.path=[]; i.wait=0; } }
    } else {
      if (i.path.length){ if (follow(i,L.patrolSp,dt)){ i.wait=1.1; i.lookBase=i.ang; } }
      else if (i.wait>0){ i.wait-=dt; i.ang=i.lookBase+Math.sin(i.wait*3)*.7; }
      else { const [c,r]=i.wps[i.wi]; i.wi=(i.wi+1)%i.wps.length; setPath(i,c,r); i.lookBase=i.ang; }
    }
    if ((!player.hidden || i.sawHide) && Math.hypot(player.x-i.x,player.y-i.y)<22){ caught(i.sawHide && player.hidden); return; }
  }
  chaseAlpha += ((anyChase?1:0)-chaseAlpha)*Math.min(1,dt*4);
  for (const t of trucks){
    const [c,r]=t.wps[t.wi], tx=c*T+16, ty=r*T+16, dx=tx-t.x, dy=ty-t.y, d=Math.hypot(dx,dy), s=t.sp*dt;
    if (d<=s){ t.x=tx; t.y=ty; t.wi=(t.wi+1)%t.wps.length; } else { t.x+=dx/d*s; t.y+=dy/d*s; t.ang=Math.atan2(dy,dx); }
    if (!player.hidden){
      const [hw,hd]=truckHalf(t), px=player.x-t.x, py=player.y-t.y, ox=hw+11-Math.abs(px), oy=hd+11-Math.abs(py);
      if (ox>0 && oy>0){
        const nx = ox<oy ? player.x+Math.sign(px||1)*ox : player.x, ny = ox<oy ? player.y : player.y+Math.sign(py||1)*oy;
        if (!blocked(nx,ny,10)){ player.x=nx; player.y=ny; player.path=[]; marker=null; }
      }
    }
    if (t.talkT>0) t.talkT-=dt; else if ((t.sayCd-=dt)<=0){ t.talkT=3; t.sayCd=8; t.li=(t.li+1)%t.lines.length; }
  }
  rings = rings.filter(rg => (rg.r += 260*dt) < rg.max);
  syncButtons();
}

// ---------- screens ----------
function starStr(n){ return '★'.repeat(n)+`<i>${'★'.repeat(3-n)}</i>`; }
function showOverlay(html){ const o=$('overlay'); o.innerHTML=`<div class="card">${html}</div>`; o.hidden=false; running=false; const b=o.querySelector('.go'); if (b) b.focus({preventScroll:true}); }
function showMenu(){
  inMenu=true;
  const lv = LEVELS.map((l,k)=>`<button class="lvl" data-lvl="${k}" ${k>save.unlocked?'disabled':''}><span class="n">${l.kicker}${k>save.unlocked?' · zaključan':''}</span><span class="t">${l.name}</span><span class="s">${starStr(save.stars[k]||0)}</span></button>`).join('');
  showOverlay(`<p class="kicker menu-top"><img class="menu-logo" src="assets/logo.png" alt="HDZ">Satirička stealth igra</p><h1>Puni Džepovi</h1>
    <p>Premijer Andrej Plenković, predsjednik HDZ-a, mora pokupiti sve afere prije nego ga uhvate istražitelji EUROLUPE. Ti si lik sa zlatnim krugom ispod nogu.</p>
    <ul class="howto">
      <li><b>Klik / dodir</b> lik ide tamo</li>
      <li><b>Dvoklik</b> trči tamo, ali bučno</li>
      <li><b>Klik na fotelju</b> sakrij se iza nje: imunitet</li>
      <li><b>Nemam komentara</b> zamrzne istražitelje</li>
    </ul>
    <div class="levels">${lv}</div>
    <button class="go" id="playBtn">Igraj ${LEVELS[Math.min(save.unlocked,LEVELS.length-1)].kicker}</button>
    <p class="fine">Satira. Afere u igri temelje se na medijskim izvještajima i sudskim odlukama. Gdje presude nema ili nije pravomoćna, vrijedi presumpcija nevinosti. Igra je fikcija i ne tvrdi da je premijer osobno počinio ijedno kazneno djelo.</p>`);
  $('playBtn').onclick = () => startLevel(Math.min(save.unlocked, LEVELS.length-1));
  document.querySelectorAll('.lvl').forEach(b => b.onclick = () => startLevel(+b.dataset.lvl));
}
function caught(inWardrobe){
  catches++; sfx.siren();
  const line = inWardrobe ? 'Vidjeli su te kako se skrivaš iza saborske fotelje. Sabor ti je skinuo imunitet.' : (L.caughtLines||CAUGHT_LINES)[Math.floor(Math.random()*(L.caughtLines||CAUGHT_LINES).length)];
  showOverlay(`<p class="kicker">EUROLUPA · Zapisnik o uhićenju</p><h1 class="red">Uhićen!</h1><p>${line}</p>
    <div class="stats"><div class="stat"><span>Afere</span><b>${got}/${items.length}</b></div><div class="stat"><span>Opljačkano</span><b>${eur.format(money)}</b></div><div class="stat"><span>Uhićenja</span><b>${catches}</b></div></div>
    <p class="fine">Pravomoćnih presuda: 0.</p>
    <div class="row"><button class="go" id="againBtn">Prebaci nadležnost i ponovi</button><button class="go alt" id="menuBtn">Izbornik</button></div>`);
  $('againBtn').onclick = () => startLevel(LI); $('menuBtn').onclick = showMenu;
}
function levelWin(){
  sfx.win();
  const mm=Math.floor(elapsed/60), ss=String(Math.floor(elapsed%60)).padStart(2,'0');
  const ach=[['Afere u aktovci, auto pobjegao',true],['Nitko te nije gonio',!everChased],[`Ispod ${Math.floor(L.par/60)}:${String(L.par%60).padStart(2,'0')}`,elapsed<L.par]];
  const stars = ach.filter(a=>a[1]).length;
  save.stars[LI]=Math.max(save.stars[LI]||0,stars); save.unlocked=Math.max(save.unlocked,Math.min(LI+1,LEVELS.length-1)); runMoney[LI]=money; persist();
  const last = LI===LEVELS.length-1;
  if (last){ finale(stars, ach, mm, ss); return; }
  showOverlay(`<p class="kicker">${L.kicker} · ${L.name} · riješeno</p><h1 class="green">Pobjegao si!</h1>
    <div class="stars">${starStr(stars)}</div>
    <div class="stats"><div class="stat"><span>Opljačkano</span><b>${eur.format(money)}</b></div><div class="stat"><span>Vrijeme</span><b>${mm}:${ss}</b></div><div class="stat"><span>Uhićenja</span><b>${catches}</b></div></div>
    <ul class="ach">${ach.map(([t,on])=>`<li class="${on?'on':''}">${t}</li>`).join('')}</ul>
    <div class="row"><button class="go" id="nextBtn">Dalje: ${LEVELS[LI+1].name}</button><button class="go alt" id="againBtn">Ponovi level</button></div>`);
  $('nextBtn').onclick = () => startLevel(LI+1); $('againBtn').onclick = () => startLevel(LI);
}
function finale(stars, ach, mm, ss){
  save.mandates++; persist();
  const total = runMoney.reduce((a,b)=>a+b,0);
  const pct = (33+Math.random()*6).toFixed(1).replace('.',',');
  showOverlay(`<p class="kicker">Izborna noć · Stožer PPD-a</p><h1 class="green">Mandat osvojen!</h1>
    <div class="stars">${starStr(stars)}</div>
    <p>Sve aktovke su u autu, istražitelji su u čudu, a PPD je osvojio ${pct} % glasova. Ovo ti je ${save.mandates}. mandat zaredom.</p>
    <div class="stats"><div class="stat"><span>Ukupno opljačkano</span><b>${eur.format(total)}</b></div><div class="stat"><span>Zadnji level</span><b>${mm}:${ss}</b></div><div class="stat"><span>Uhićenja</span><b>${catches}</b></div></div>
    <ul class="ach">${ach.map(([t,on])=>`<li class="${on?'on':''}">${t}</li>`).join('')}</ul>
    <p class="fine">Pravomoćnih presuda: 0. Afera u medijima: sve. Posljedica: nijedna.</p>
    <div class="row"><button class="go" id="menuBtn">Novi mandat</button></div>`);
  catches=0; $('menuBtn').onclick = showMenu;
}
function pause(){
  if (!running) return;
  showOverlay(`<p class="kicker">${L.kicker} · ${L.name}</p><h1>Pauza</h1><p>Sjednica Vlade je prekinuta zbog konzultacija.</p>
    <div class="row"><button class="go" id="resBtn">Nastavi</button><button class="go alt" id="rstBtn">Ispočetka</button><button class="go alt" id="menuBtn">Izbornik</button></div>`);
  $('resBtn').onclick = resume; $('rstBtn').onclick = () => startLevel(LI); $('menuBtn').onclick = showMenu;
}
function resume(){ $('overlay').hidden=true; running=true; inMenu=false; last=performance.now(); try{ cv.focus({preventScroll:true}); }catch(e){} }
function startLevel(i){
  if (!ac){ try{ ac=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  if (ac && ac.state==='suspended') ac.resume();
  loadLevel(i); resize(); reset(); resume();
  toast(`${L.kicker}: ${L.name}`, L.tip);
}

// ---------- rendering (nagnuta 3/4 kamera) ----------
const TILT = 0.7, PAD = 36;
const HGT = {'#':26,'W':30,'F':13,'T':9,'B':7,'K':11,'H':9,'X':15,'D':14,'N':12,'Z':5};
let vw=0, vh=0, dpr=1, scale=1, camX=0, camY=0, snapCam=true, blocks=[];
const VH = () => WH*TILT + PAD;
function resize(){
  const st=cv.parentElement.getBoundingClientRect(); vw=st.width; vh=st.height; dpr=Math.min(window.devicePixelRatio||1,2);
  cv.width=Math.max(1,Math.round(vw*dpr)); cv.height=Math.max(1,Math.round(vh*dpr));
  cv.style.width=vw+'px'; cv.style.height=vh+'px';
  const fit=Math.min(vw/WW, vh/VH()); scale=Math.max(fit, 40/T); snapCam=true;
}
function rr(g,x,y,w,h,r){ g.beginPath(); if (g.roundRect) g.roundRect(x,y,w,h,r); else g.rect(x,y,w,h); }
function hash(c,r){ return ((c*73856093)^(r*19349663))>>>0; }
function shade(hex,k){ const n=parseInt(hex.slice(1),16); let r=n>>16, g=(n>>8)&255, b=n&255; r=clamp(Math.round(r*k),0,255); g=clamp(Math.round(g*k),0,255); b=clamp(Math.round(b*k),0,255); return `rgb(${r},${g},${b})`; }
function drawFloor(g,c,r,ch){
  const x=c*T, y=r*T;
  if (ch===','){ for(let i=0;i<2;i++)for(let j=0;j<2;j++){ g.fillStyle=((c*2+i+r*2+j)%2)?'#e9f0f2':'#cddbe0'; g.fillRect(x+i*16,y+j*16,16,16);} }
  else if (ch===':'){ g.fillStyle='#4aa89c'; g.fillRect(x,y,T,T); g.fillStyle='#43998e'; g.fillRect(x+((r%2)?4:20),y+12,6,6); }
  else if (ch===';'){ g.fillStyle='#7cc25a'; g.fillRect(x,y,T,T); const h=hash(c,r); g.fillStyle='#69ad49'; for(let k=0;k<3;k++){ g.fillRect(x+((h>>(k*5))%26)+2,y+((h>>(k*5+3))%24)+4,2,5); } }
  else if (ch==='_'){ const h=hash(c,r); g.fillStyle='#b8b3a8'; g.fillRect(x,y,T,T); g.fillStyle='#a9a398'; g.fillRect(x,y,T,1); g.fillRect(x,y,1,T); g.fillStyle='#9c968a'; for(let k=0;k<3;k++) g.fillRect(x+((h>>(k*4))%28)+2,y+((h>>(k*4+2))%28)+2,2,2); if (h%5===0){ g.strokeStyle='#8f897c'; g.lineWidth=1; g.beginPath(); g.moveTo(x+6,y+8); g.lineTo(x+14,y+15); g.lineTo(x+12,y+24); g.stroke(); } }
  else { g.fillStyle='#e8a25a'; g.fillRect(x,y,T,T); g.fillStyle='#d48d47'; g.fillRect(x,y+10,T,2); g.fillRect(x,y+21,T,2); g.fillRect(x+((c+r)%2?8:22),y,2,10); }
}
function isWall(c,r){ return r<0||r>=H||c<0||c>=W||grid[r][c]==='#'; }
function buildBg(){
  bg=document.createElement('canvas'); bg.width=WW*2; bg.height=WH*2; const g=bg.getContext('2d'); g.scale(2,2);
  g.fillStyle='#0a1128'; g.fillRect(0,0,WW,WH);
  blocks=[];
  for (let r=0;r<H;r++) for (let c=0;c<W;c++){
    const ch=grid[r][c];
    if (ch!=='#' && ch!=='C') drawFloor(g,c,r,floorG[r][c]);
    if (ch==='G' && L.pile==='otpad'){
      // hrpa otpada: vreće, folija, bačvica
      const x=c*T, y=r*T, h=hash(c,r);
      g.fillStyle='rgba(30,30,30,.3)'; g.beginPath(); g.ellipse(x+16,y+19,15,12,0,0,Math.PI*2); g.fill();
      [[16,18,11,'#2b2d33'],[8,22,7,'#3a3d45'],[24,21,7,'#1f2126'],[15,10,7,'#4a4f5a']].forEach(([dx,dy,rad,col],k)=>{ g.fillStyle=col; g.beginPath(); g.arc(x+dx+((h>>k)%3)-1,y+dy,rad,0,Math.PI*2); g.fill(); });
      g.fillStyle='#d7dde6'; g.fillRect(x+6+(h%8),y+12,6,3); g.fillStyle='#3fa7d6'; g.fillRect(x+18,y+8+(h%5),5,4);
      g.fillStyle='#e0b02a'; g.fillRect(x+20,y+20,6,7); g.fillStyle='#1f2126'; g.fillRect(x+20,y+22,6,1.5);
      g.fillStyle='rgba(120,200,90,.55)'; g.beginPath(); g.arc(x+11,y+25,2.5,0,Math.PI*2); g.fill();
    } else if (ch==='G'){
      const x=c*T, y=r*T, h=hash(c,r);
      g.fillStyle='rgba(60,35,15,.3)'; g.beginPath(); g.ellipse(x+16,y+19,15,12,0,0,Math.PI*2); g.fill();
      [[16,18,12],[9,21,7],[23,21,7],[16,10,7]].forEach(([dx,dy,rad],k)=>{ g.fillStyle=k%2?'#7a4a24':'#8b5a2e'; g.beginPath(); g.arc(x+dx+((h>>k)%3)-1,y+dy,rad,0,Math.PI*2); g.fill(); });
      g.fillStyle='#a06a3a'; g.beginPath(); g.arc(x+13,y+12,3,0,Math.PI*2); g.fill();
    }
    if (HGT[ch]) blocks.push({c,r,ch,depth:(r+1)*T-0.01});
  }
  // sjene zidova i namještaja na podu
  g.fillStyle='rgba(10,17,40,.22)';
  for (const b of blocks){ if (b.ch==='#' && !isWall(b.c,b.r+1)) g.fillRect(b.c*T,(b.r+1)*T,T,7); }
  // plakati s logom na vidljivim prednjim stranama zidova, svako drugo polje u nizu
  let prev=null, run=0;
  for (const b of blocks){
    if (b.ch!=='#' || isWall(b.c,b.r+1)){ prev=null; continue; }
    run = prev && prev.r===b.r && prev.c===b.c-1 ? run+1 : 0; prev=b;
    b.logo = run%2===0;
  }
  for (const s of L.signs||[]) for (const b of blocks) if (b.r===s.r && b.c>=s.c && b.c<s.c+s.w) b.logo=false;
}
// --- 3D blokovi (zidovi, namještaj) ---
function drawBlock(b){
  const {c,r,ch}=b, h=HGT[ch], x=c*T, y0=r*T*TILT, th=T*TILT, y1=y0+th;
  const inset = ch==='#' ? 0 : 2;
  const X=x+inset, Wd=T-inset*2;
  const below = r+1<H ? grid[r+1][c] : '#';
  const showFront = ch!=='#' || below!=='#';
  if (ch==='#'){
    if (showFront){ ctx.fillStyle='#173d8e'; ctx.fillRect(x,y1-h,T,h); ctx.fillStyle='#2350ad'; ctx.fillRect(x,y1-h,T,3); ctx.fillStyle='rgba(0,0,0,.18)'; ctx.fillRect(x,y1-4,T,4);
      if (b.logo && imgOk(LOGO)){ const lw=T-4, lh=lw*LOGO.naturalHeight/LOGO.naturalWidth; ctx.drawImage(LOGO,x+2,y1-h/2-lh/2,lw,lh); } }
    ctx.fillStyle='#2a5bc0'; ctx.fillRect(x,y0-h,T,th);
    ctx.fillStyle='#5b93f0';
    if (!isWall(c,r-1)) ctx.fillRect(x,y0-h,T,3);
    if (!isWall(c-1,r)) ctx.fillRect(x,y0-h,3,th);
    if (!isWall(c+1,r)) ctx.fillRect(x+T-3,y0-h,3,th);
    if (below!=='#'){ ctx.fillStyle='#7aaaf7'; ctx.fillRect(x,y1-h-2,T,2); }
    return;
  }
  if (ch==='W'){
    // saborska fotelja: tko se sakrije iza nje, ima imunitet
    const behind = player && player.hidden && player.hidden.c===c && player.hidden.r===r, cx=x+T/2;
    ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(cx,y1-1,T/2,4,0,0,Math.PI*2); ctx.fill();
    if (behind){
      const k=(Math.sin(tclock*4)+1)/2; ctx.fillStyle=`rgba(255,207,74,${.18+k*.15})`; ctx.beginPath(); ctx.ellipse(cx,y1-h/2,T*.75,h*.8,0,0,Math.PI*2); ctx.fill();
      // čuči iza naslona i viri preko ruba
      const peek = Math.sin(tclock*1.6)*3, hx = cx+3+peek, hy = y1-h-15+Math.max(0,Math.sin(tclock*1.1))*5;
      ctx.fillStyle='#243150'; rr(ctx,X+Wd-6,y1-h+3,7,13,3); ctx.fill();
      if (imgOk(HEAD.calm)){ const hh=21, hw=hh*HEAD.calm.naturalWidth/HEAD.calm.naturalHeight; ctx.drawImage(HEAD.calm,hx-hw/2,hy,hw,hh); }
    }
    ctx.fillStyle='#5e1520'; rr(ctx,X+2,y1-h,Wd-4,h-8,6); ctx.fill();
    ctx.fillStyle='#8a2432'; rr(ctx,X+4,y1-h+2,Wd-8,h-13,5); ctx.fill();
    ctx.fillStyle='#d9a93a'; for (const [bx,by] of [[-5,8],[0,8],[5,8],[-2.5,14],[2.5,14]]){ ctx.beginPath(); ctx.arc(cx+bx,y1-h+by,1,0,Math.PI*2); ctx.fill(); }
    ctx.fillStyle='#a3313f'; rr(ctx,X+1,y1-12,Wd-2,6,3); ctx.fill();
    ctx.fillStyle='#6a1822'; ctx.fillRect(X+1,y1-7,Wd-2,6);
    ctx.fillStyle='#4f111a'; rr(ctx,X-1,y1-16,5,15,2); ctx.fill(); rr(ctx,X+Wd-4,y1-16,5,15,2); ctx.fill();
    return;
  }
  const PAL = {N:['#b5b7bb','#8a8d92'],Z:['#6b6f78','#4a4e57'],D:['#d4a92a','#a8831b'],F:['#f3f6f8','#b9c4cb'],T:['#c98b4e','#9b6232'],B:['#efe9fb','#6d3f86'],K:['#7a8aa3','#4f5d73'],H:['#ffffff','#8fa3b8'],X:['#e2c25a','#c79f3a']}[ch];
  ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x+T/2,y1-1,T/2,4,0,0,Math.PI*2); ctx.fill();
  // prednja strana
  ctx.fillStyle=PAL[1]; ctx.fillRect(X,y1-h,Wd,h);
  // gornja strana
  ctx.fillStyle=PAL[0]; ctx.fillRect(X,y0-h,Wd,th);
  const ty=y0-h;
  if (ch==='N'){
    // Teslin kip na postolju
    const cx=x+T/2, by=ty+th/2;
    ctx.fillStyle='#4d6b5a'; ctx.fillRect(cx-4,by-9,3,9); ctx.fillRect(cx+1,by-9,3,9);
    rr(ctx,cx-6,by-27,12,20,4); ctx.fill(); ctx.fillStyle='#3e5a4a'; ctx.fillRect(cx-1,by-27,2,18);
    ctx.fillStyle='#5f806c'; ctx.beginPath(); ctx.arc(cx,by-32,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#3a5243'; ctx.beginPath(); ctx.arc(cx,by-34,5.2,Math.PI,0); ctx.fill();
    ctx.fillStyle='#f2f2ee'; ctx.font='800 6px "Barlow Semi Condensed",sans-serif'; ctx.textAlign='center'; ctx.fillText('N. TESLA',cx,y1-h/2+2.5);
  } else if (ch==='Z'){
    // tabla naselja
    ctx.fillStyle='#9aa0a8'; ctx.fillRect(X+4,ty-14,2,15); ctx.fillRect(X+Wd-6,ty-14,2,15);
    ctx.fillStyle='#f4f4f0'; rr(ctx,x-7,ty-28,T+14,14,2); ctx.fill(); ctx.strokeStyle='#1d1d1d'; ctx.lineWidth=1.4; ctx.stroke();
    ctx.fillStyle='#111'; ctx.font='800 10px "Barlow Semi Condensed",sans-serif'; ctx.textAlign='center'; ctx.fillText('GOSPIĆ',x+T/2,ty-17.5);
  } else if (ch==='D'){
    // bačva s opasnim otpadom
    ctx.fillStyle='#2b2b2b'; ctx.fillRect(X,y1-h+3,Wd,2.5); ctx.fillRect(X,y1-5,Wd,2.5);
    ctx.fillStyle='#c4951f'; ctx.beginPath(); ctx.ellipse(x+T/2,ty+th/2,Wd/2-2,th/2-3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1f1f1f'; ctx.beginPath(); ctx.moveTo(x+T/2,y1-h+6.5); ctx.lineTo(x+T/2+4,y1-h+12.5); ctx.lineTo(x+T/2-4,y1-h+12.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#d4a92a'; ctx.fillRect(x+T/2-.6,y1-h+8.3,1.2,2.4);
  } else if (ch==='F'){
    ctx.strokeStyle='#58636b'; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(x+T/2,ty+th/2,7,5,0,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle='#8a969e'; ctx.fillRect(X+4,y1-h+4,Wd-8,2);
  } else if (ch==='T'){
    ctx.save(); ctx.translate(x+T/2,ty+th/2); ctx.scale(1,TILT); ctx.rotate((c*7+r*3)%5*.2-.4); ctx.fillStyle='#fdfaf2'; ctx.fillRect(-6,-8,12,15); ctx.fillStyle='#9fb0e0'; ctx.fillRect(-4,-5,8,1.5); ctx.fillRect(-4,-2,8,1.5); ctx.restore();
  } else if (ch==='B'){
    const top=!(r>0 && grid[r-1][c]==='B');
    if (top){ ctx.fillStyle='#fff'; rr(ctx,X+4,ty+3,Wd-8,8,4); ctx.fill(); } else { ctx.fillStyle='#9b7bd1'; ctx.fillRect(X+1,ty,Wd-2,th-2); }
  } else if (ch==='K'){
    ctx.fillStyle='#5d6c84'; ctx.fillRect(X,ty,Wd,6);
  } else if (ch==='H'){
    const left=!(c>0 && grid[r][c-1]==='H');
    if (left){ ctx.fillStyle='#e9eef5'; rr(ctx,X+3,ty+4,9,th-8,3); ctx.fill(); } else { ctx.fillStyle='#8fd3f0'; ctx.fillRect(X,ty+2,Wd-2,th-4); }
  } else if (ch==='X'){
    ctx.fillStyle='#c79f3a'; for(let k=0;k<3;k++) ctx.fillRect(X+2,ty+4+k*6,Wd-4,1.5);
    for(let k=0;k<2;k++) ctx.fillRect(X+2,y1-h+4+k*5,Wd-4,1.5);
  }
}
// --- likovi (uspravni, nagnuta kamera) ---
const HEAD = {calm:new Image(), panic:new Image()};
HEAD.calm.src='assets/lopov.png'; HEAD.panic.src='assets/lopov-panika.png';
const LOGO = new Image(); LOGO.src='assets/logo.png';
const CHAR_S = 1.3; // veličina lopova i istražitelja
const imgOk = im => im.complete && im.naturalWidth>0;
function dirOf(a){ const cx=Math.cos(a), sy=Math.sin(a); if (Math.abs(cx)>Math.abs(sy)) return cx>0?'R':'L'; return sy>0?'D':'U'; }
function drawChar(x,yv,ang,moving,kind,o){
  const d=dirOf(ang), ph = moving ? Math.sin(tclock*14 + (o.seed||0)) : 0;
  const isP = kind==='p';
  const suit = isP ? '#243150' : o.coat;
  const sink = o.sink||0;
  ctx.save(); ctx.translate(x,yv+sink); ctx.scale(CHAR_S,CHAR_S);
  if (o.alpha!=null) ctx.globalAlpha=o.alpha;
  // sjena
  ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0,0,12,4.5,0,0,Math.PI*2); ctx.fill();
  // noge
  ctx.fillStyle = isP ? '#1c2540' : '#3a3530';
  ctx.fillRect(-6, -11 - Math.max(0,ph)*2.5, 5, 11); ctx.fillRect(1, -11 - Math.max(0,-ph)*2.5, 5, 11);
  ctx.fillStyle='#0d0d10'; ctx.fillRect(-7,-2-Math.max(0,ph)*2.5,6,3); ctx.fillRect(1,-2-Math.max(0,-ph)*2.5,6,3);
  // vreća iza leđa (kad gleda dolje / sa strane)
  const bagSide = d==='L' ? 9 : -9;
  const drawBag = () => { ctx.fillStyle='#7a5a2e'; ctx.beginPath(); ctx.ellipse(bagSide,-20,8,9,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#5e4320'; ctx.fillRect(bagSide-3,-30,6,4); ctx.fillStyle='#ffcf4a'; ctx.font='900 11px "Barlow Semi Condensed",sans-serif'; ctx.textAlign='center'; ctx.fillText('€',bagSide,-16); };
  if (isP) drawBag();
  // tijelo
  ctx.fillStyle=suit; rr(ctx,-9,-30,18,21,6); ctx.fill();
  if (kind==='i'){ ctx.fillStyle='rgba(0,0,0,.18)'; ctx.fillRect(-1,-28,2,18); ctx.fillStyle=shade(o.coat,.8); ctx.fillRect(-9,-14,18,3); }
  if ((isP||kind==='m') && d!=='U'){
    // tamnoplavo odijelo: bijela košulja, kravata s točkicama, značka sa zastavicom
    const side = d==='L'||d==='R', fx = side ? (d==='R'?4:-4) : 0;
    ctx.fillStyle='#f4f6fa'; ctx.beginPath(); ctx.moveTo(fx-(side?2:4.5),-30); ctx.lineTo(fx+(side?2:4.5),-30); ctx.lineTo(fx,-19); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#1a1d2b'; ctx.beginPath(); ctx.moveTo(fx-1.3,-29); ctx.lineTo(fx+1.3,-29); ctx.lineTo(fx+1.9,-19); ctx.lineTo(fx,-16.5); ctx.lineTo(fx-1.9,-19); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#c9cfe0'; for (const [tx,ty] of [[-.6,-26],[.6,-23],[-.6,-20]]) ctx.fillRect(fx+tx-.4,ty,.8,.8);
    ctx.strokeStyle='#18213a'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(fx-(side?2:4.5),-30); ctx.lineTo(fx-1.5,-17); ctx.moveTo(fx+(side?2:4.5),-30); ctx.lineTo(fx+1.5,-17); ctx.stroke();
    if (d==='D' && isP){ ctx.fillStyle='#d8262f'; ctx.fillRect(4,-25,3.4,1); ctx.fillStyle='#fff'; ctx.fillRect(4,-24,3.4,1); ctx.fillStyle='#1f4fa8'; ctx.fillRect(4,-23,3.4,1); }
  }
  // ruke
  ctx.fillStyle=suit;
  const sw = ph*3;
  if (d==='L'||d==='R'){ ctx.fillRect(-3+sw,-28,6,15); }
  else { ctx.fillRect(-12,-28+sw,5,14); ctx.fillRect(7,-28-sw,5,14); }
  ctx.fillStyle='#f0c39b';
  if (d==='L'||d==='R') { ctx.beginPath(); ctx.arc(sw,-12,3,0,Math.PI*2); ctx.fill(); }
  else { const sip=o.sip||0; ctx.beginPath(); ctx.arc(-9.5,-13+sw,2.8,0,Math.PI*2); ctx.arc(9.5-5*sip,-13-sw-19*sip,2.8,0,Math.PI*2); ctx.fill(); }
  // povećalo
  if (kind==='i' && d!=='U'){ const mx = d==='L'?-13:13; ctx.strokeStyle='#3a3a3a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(d==='D'?9.5:sw,-13); ctx.lineTo(mx,-20); ctx.stroke(); ctx.fillStyle='rgba(200,235,255,.85)'; ctx.strokeStyle='#e8e8e8'; ctx.beginPath(); ctx.arc(mx,-24,5,0,Math.PI*2); ctx.fill(); ctx.stroke(); }
  // glava s fotografije (bobblehead); straga se vidi samo sijeda kosa
  if (isP && imgOk(HEAD.calm)){
    const hh=32, cy=-44;
    if (d==='U'){
      ctx.fillStyle='#a3a4aa'; ctx.beginPath(); ctx.ellipse(0,cy,12,15.5,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#cfd0d5'; ctx.lineWidth=1.3; ctx.beginPath(); for (const k of [-6,0,6]){ ctx.moveTo(k,cy-14); ctx.quadraticCurveTo(k*1.3,cy-4,k*.9,cy+8); } ctx.stroke();
    } else {
      const img = o.panic && imgOk(HEAD.panic) ? HEAD.panic : HEAD.calm, hw=hh*img.naturalWidth/img.naturalHeight;
      ctx.save(); if (d==='L') ctx.scale(-1,1); ctx.drawImage(img,-hw/2,cy-hh/2,hw,hh); ctx.restore();
    }
    ctx.restore(); return;
  }
  ctx.fillStyle='#f0c39b'; ctx.beginPath(); ctx.arc(0,-38,9,0,Math.PI*2); ctx.fill();
  if (isP){
    // sijeda kosa začešljana unatrag
    const HAIR='#a3a4aa', HAIR_LT='#cfd0d5', ox = d==='L'?-1:d==='R'?1:0;
    ctx.fillStyle=HAIR;
    if (d==='U'){ ctx.beginPath(); ctx.arc(0,-38.5,9.5,0,Math.PI*2); ctx.fill(); }
    else {
      ctx.beginPath(); ctx.arc(0,-40,9.5,Math.PI,0); ctx.fill();
      ctx.fillRect(-9.5,-41,2.6,6); ctx.fillRect(6.9,-41,2.6,6);
      if (ox){ ctx.beginPath(); ctx.ellipse(-ox*4.5,-38,5.5,7.5,0,0,Math.PI*2); ctx.fill(); }
    }
    ctx.beginPath(); ctx.ellipse(ox*1.5,-46.5,8.6,4.4,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=HAIR_LT; ctx.lineWidth=1.1; ctx.beginPath();
    for (const k of [-4,0,4]){ ctx.moveTo(k+ox*3,-49); ctx.quadraticCurveTo(k+ox*3+(ox?-ox*5:k*.4),-46,k+ox*3-(ox?ox*7:-k*.6),-42.5); }
    ctx.stroke();
    if (d!=='U'){
      // oči, obrve, naočale bez okvira, osmijeh
      const eyes = d==='D' ? [-3.6,3.6] : [ox*4.2];
      ctx.fillStyle='#8f9096'; for (const ex of eyes) ctx.fillRect(ex-2.2,-40.3,4.4,1.1);
      ctx.fillStyle='#24324f'; for (const ex of eyes) ctx.fillRect(ex-1,-37.6,2,2);
      ctx.fillStyle='rgba(225,238,250,.35)'; ctx.strokeStyle='rgba(235,242,250,.95)'; ctx.lineWidth=.8;
      for (const ex of eyes){ rr(ctx,ex-2.9,-38.8,5.8,4,1.6); ctx.fill(); ctx.stroke(); }
      ctx.beginPath();
      if (d==='D'){ ctx.moveTo(-.7,-37.4); ctx.lineTo(.7,-37.4); } else { ctx.moveTo(ox*1.3,-37.4); ctx.lineTo(-ox*5,-38); }
      ctx.stroke();
      ctx.strokeStyle='#b3624a'; ctx.lineWidth=1; ctx.beginPath();
      if (d==='D') ctx.arc(0,-33.8,2.8,.2*Math.PI,.8*Math.PI); else { ctx.moveTo(ox*6,-32.4); ctx.quadraticCurveTo(ox*7.4,-32.2,ox*8.2,-33.2); }
      ctx.stroke();
    }
  } else if (kind==='m'){
    // ministar s čašom vode
    ctx.fillStyle=o.hair; ctx.beginPath(); ctx.arc(0,-40,9.3,Math.PI,0); ctx.fill(); ctx.fillRect(-9.3,-41,2.4,5); ctx.fillRect(6.9,-41,2.4,5);
    const ey = o.micro ? -36 : -37; ctx.fillStyle='#222'; ctx.fillRect(-4+(o.micro?1:0),ey,2,2.2); ctx.fillRect(2+(o.micro?1:0),ey,2,2.2);
    ctx.strokeStyle='#9a4f3a'; ctx.lineWidth=1; ctx.beginPath();
    if (o.micro) ctx.arc(0,-30.6,2.4,1.2*Math.PI,1.8*Math.PI); else ctx.arc(0,-33.5,2.4,.2*Math.PI,.8*Math.PI);
    ctx.stroke();
    const sip=o.sip||0, gx=9.5-5*sip, gy=-13-19*sip;
    ctx.fillStyle='rgba(170,215,255,.85)'; ctx.fillRect(gx-2.3,gy-8,4.6,7.5); ctx.fillStyle='#fff'; ctx.fillRect(gx-2.3,gy-8,4.6,1);
    if (o.micro){ const cols=['#ff4d5e','#3d8bff','#ffcf4a','#6fe39a','#c86bff']; for (let k=0;k<6;k++){ ctx.fillStyle=cols[k%cols.length]; ctx.fillRect(gx-1.8+((k*7+Math.floor(tclock*3))%4)*.9, gy-6.5+((k*5)%6), 1, 1); } }
  } else {
    // plava kapa sa zvijezdom
    ctx.fillStyle='#2c63d9'; ctx.beginPath(); ctx.arc(0,-40,9.4,Math.PI,0); ctx.fill(); ctx.fillRect(-9.4,-41,18.8,3);
    if (d==='U'){ ctx.fillStyle=o.hair; ctx.beginPath(); ctx.arc(0,-36,8.6,0,Math.PI); ctx.fill(); }
    else {
      ctx.fillStyle='#1d4aa3'; const ox=d==='L'?-5:d==='R'?5:0; ctx.fillRect(-7+ox,-39,14,3);
      ctx.fillStyle='#ffcf4a'; ctx.beginPath(); for(let k=0;k<5;k++){ const a=k*Math.PI*2/5-Math.PI/2; ctx.lineTo(Math.cos(a)*3+ox*.2,-44+Math.sin(a)*3); ctx.lineTo(Math.cos(a+.63)*1.3+ox*.2,-44+Math.sin(a+.63)*1.3);} ctx.fill();
      ctx.fillStyle='#222';
      if (d==='D'){ ctx.fillRect(-4,-36,2,2.4); ctx.fillRect(2,-36,2,2.4); } else { ctx.fillRect(ox*.8-1,-36,2,2.4); }
      if (o.frozen){ ctx.strokeStyle='#222'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(0,-31,2.5,0,Math.PI); ctx.stroke(); }
    }
  }
  ctx.restore();
}
function truckHalf(t){ return Math.abs(Math.cos(t.ang))>=Math.abs(Math.sin(t.ang)) ? [30,13] : [13,30]; }
function drawBox(xa,xb,ya,yb,h,top,front){
  ctx.fillStyle=front; ctx.fillRect(xa,yb*TILT-h,xb-xa,h);
  ctx.fillStyle=top; ctx.fillRect(xa,ya*TILT-h,xb-xa,(yb-ya)*TILT);
}
function drawTruck(t){
  // kamion s otpadom: kabina sprijeda, kontejner straga
  const [hw,hd]=truckHalf(t), hor=hw>hd, fwd = hor ? Math.sign(Math.cos(t.ang)||1) : Math.sign(Math.sin(t.ang)||1);
  const x0=t.x-hw, x1=t.x+hw, y0=t.y-hd, y1=t.y+hd, CAB=16;
  ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(t.x,y1*TILT,hw+3,5,0,0,Math.PI*2); ctx.fill();
  let cab, box;
  if (hor){ cab = fwd>0 ? [x1-CAB,x1,y0,y1] : [x0,x0+CAB,y0,y1]; box = fwd>0 ? [x0,x1-CAB-1,y0,y1] : [x0+CAB+1,x1,y0,y1]; }
  else { cab = fwd>0 ? [x0,x1,y1-CAB,y1] : [x0,x1,y0,y0+CAB]; box = fwd>0 ? [x0,x1,y0,y1-CAB-1] : [x0,x1,y0+CAB+1,y1]; }
  const parts = [[...box,20,'#4b7a52','#355a3b','box'],[...cab,15,'#eef1f4','#c3c9d1','cab']].sort((a,b)=>a[3]-b[3]);
  for (const [xa,xb,ya,yb,h,top,front,kind] of parts){
    drawBox(xa,xb,ya,yb,h,top,front);
    if (kind==='box'){ const hh=hash(Math.round(xa),Math.round(ya)); ctx.fillStyle='#2b2d33';
      for (let k=0;k<4;k++){ ctx.beginPath(); ctx.arc(xa+5+((xb-xa-10)*(k+.5)/4), ya*TILT-h+((yb-ya)*TILT)*(.35+.3*((hh>>k)&1)), 4,0,Math.PI*2); ctx.fill(); }
      ctx.fillStyle='#e0b02a'; ctx.fillRect(xa+3,yb*TILT-h+6,xb-xa-6,2); }
    else { ctx.fillStyle='#7fb3e0';
      if (hor) ctx.fillRect(fwd>0?xb-5:xa+1, ya*TILT-h+2, 4, (yb-ya)*TILT-4);
      else if (fwd>0) ctx.fillRect(xa+3,yb*TILT-h+2,xb-xa-6,6); else ctx.fillRect(xa+3,ya*TILT-h+1,xb-xa-6,3); }
  }
  ctx.fillStyle='#151515'; for (const wx of hor?[x0+7,x1-9]:[x0+3,x1-7]) ctx.fillRect(wx,y1*TILT-4,6,4);
}
function drawWallSign(s){
  const x0=s.c*T+3, x1=(s.c+s.w)*T-3, yb=(s.r+1)*T*TILT, h=HGT['#'], y=yb-h/2-8;
  ctx.fillStyle=s.bg; rr(ctx,x0,y,x1-x0,16,s.cloth?1:3); ctx.fill();
  if (s.cloth){ ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x0-3,y-4); ctx.moveTo(x1,y); ctx.lineTo(x1+3,y-4); ctx.stroke(); }
  else { ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.lineWidth=1.2; ctx.stroke(); }
  ctx.fillStyle=s.fg; ctx.font=`${s.cloth?'800 11px "Barlow Semi Condensed"':'400 10px Bungee'},sans-serif`; ctx.textAlign='center'; ctx.fillText(s.text,(x0+x1)/2,y+12);
}
function drawBackdrop(){
  // Velebit u noći iznad mape
  if (L.backdrop!=='velebit') return;
  const top=-PAD-170, base=-18;
  ctx.fillStyle='rgba(255,255,255,.55)'; for (let k=0;k<40;k++){ const h=hash(k,7); ctx.fillRect(h%WW, top+((h>>9)%110), 1.5, 1.5); }
  ctx.fillStyle='rgba(255,240,200,.85)'; ctx.beginPath(); ctx.arc(WW*.82,top+30,12,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#0a1128'; ctx.beginPath(); ctx.arc(WW*.82+5,top+27,11,0,Math.PI*2); ctx.fill();
  for (const [col,amp,step,off] of [['#2a3868',135,74,3],['#3a4b85',95,56,11]]){
    const pts=[]; for (let x=-step; x<=WW+step; x+=step){ const h=hash(Math.round(x/step)+off,off); pts.push([x+(h%20)-10, base-amp*(.45+((h>>5)%100)/180)]); }
    ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(-step,base); for (const [x,y] of pts) ctx.lineTo(x,y); ctx.lineTo(WW+step,base); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(228,235,252,.9)';
    for (const [x,y] of pts) if (y<base-amp*.6){ ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-9,y+10); ctx.lineTo(x-3,y+7); ctx.lineTo(x+2,y+11); ctx.lineTo(x+9,y+10); ctx.closePath(); ctx.fill(); }
  }
  ctx.fillStyle='rgba(205,215,245,.6)'; ctx.font='400 14px Bungee,sans-serif'; ctx.textAlign='left'; ctx.fillText('V E L E B I T', 16, base-36);
}
function label(x,y,text,col,size=10){ ctx.font=`800 ${size}px "Barlow Semi Condensed",sans-serif`; ctx.textAlign='center'; ctx.fillStyle=col; ctx.fillText(text,x,y); }
function bubble(x,y,text,col='#fff',bg='rgba(15,22,48,.93)',size=11){
  ctx.font=`800 ${size}px "Barlow Semi Condensed",sans-serif`; ctx.textAlign='center';
  const w=Math.max(16, ctx.measureText(text).width+10), h=size+6;
  ctx.fillStyle=bg; rr(ctx,x-w/2,y-h,w,h,6); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x-4,y); ctx.lineTo(x+4,y); ctx.lineTo(x,y+5); ctx.fill();
  ctx.fillStyle=col; ctx.fillText(text,x,y-5);
}
// --- sloj poda (crtano u svjetskim koordinatama, spljošteno) ---
function drawGround(){
  ctx.save(); ctx.scale(1,TILT);
  ctx.imageSmoothingEnabled=true; ctx.drawImage(bg,0,0,WW,WH);
  for (const e of exits){
    const x=e.c*T, y=e.r*T, on=allGot();
    ctx.fillStyle='#2b3140'; ctx.fillRect(x,y,T,T);
    for (let k=0;k<4;k++){ ctx.fillStyle = k%2 ? '#1b1b1b' : (on && Math.sin(tclock*8)>0 ? '#6fe39a' : '#ffcf4a'); ctx.fillRect(x+4,y+k*8,T-8,8); }
  }
  if (shrine){
    const pulse = shrineUsed ? 0 : (Math.sin(tclock*4)+1)/2;
    ctx.fillStyle = shrineUsed ? 'rgba(120,120,140,.45)' : `rgba(255,207,74,${.2+pulse*.25})`;
    ctx.beginPath(); ctx.arc(shrine.x,shrine.y,15+pulse*4,0,Math.PI*2); ctx.fill();
  }
  for (const it of items){ if (it.got) continue;
    ctx.fillStyle='rgba(255,207,74,.3)'; ctx.beginPath(); ctx.arc(it.x,it.y,13+Math.sin(tclock*4+it.r)*2,0,Math.PI*2); ctx.fill();
  }
  // putanja
  if (player.path.length){
    ctx.fillStyle = player.runTrip ? '#ff9f43' : '#3d8bff';
    let px=player.x, py=player.y, carry=10;
    for (const p of player.path){ const dx=p.x-px, dy=p.y-py, d=Math.hypot(dx,dy);
      let s=carry; while (s<d){ const t=s/d; ctx.beginPath(); ctx.ellipse(px+dx*t,py+dy*t,3.4,3.4,0,0,Math.PI*2); ctx.fill(); s+=12; }
      carry=s-d; px=p.x; py=p.y; }
    if (marker){ const k=(Math.sin(marker.t*6)+1)/2;
      ctx.strokeStyle = marker.hide ? '#6fe39a' : (marker.run ? '#ff9f43' : '#3d8bff'); ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(marker.x,marker.y,8+k*3,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(marker.x-5,marker.y-5); ctx.lineTo(marker.x+5,marker.y+5); ctx.moveTo(marker.x+5,marker.y-5); ctx.lineTo(marker.x-5,marker.y+5); ctx.stroke(); }
  }
  // vidna polja
  for (const i of insps){ if (i.frozen>0) continue;
    const n=30, R=L.vis, A=.6; ctx.beginPath(); ctx.moveTo(i.x,i.y);
    for (let k=0;k<=n;k++){ const a=i.ang-A+2*A*k/n, cs=Math.cos(a), sn=Math.sin(a); let d=0;
      while (d<R){ d+=5; if (OPAQUE.has(tileAt(i.x+cs*d,i.y+sn*d))){ d-=3; break; } }
      ctx.lineTo(i.x+cs*d,i.y+sn*d); }
    ctx.closePath();
    const col = i.state==='chase' ? '255,77,94' : i.state==='inv' ? '255,160,60' : '255,236,130';
    const gr=ctx.createRadialGradient(i.x,i.y,10,i.x,i.y,R); gr.addColorStop(0,`rgba(${col},.45)`); gr.addColorStop(1,`rgba(${col},.08)`); ctx.fillStyle=gr; ctx.fill();
  }
  for (const rg of rings){ ctx.strokeStyle=`rgba(255,255,255,${.55*(1-rg.r/rg.max)})`; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(rg.x,rg.y,rg.r,0,Math.PI*2); ctx.stroke(); }
  // zlatni krug ispod igrača
  const pr = player.hidden ? {x:player.hidden.x, y:player.hidden.y+T*.6} : player;
  ctx.fillStyle='rgba(255,207,74,.22)'; ctx.beginPath(); ctx.arc(pr.x,pr.y,19,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#ffcf4a'; ctx.lineWidth=3; ctx.setLineDash([7,5]); ctx.lineDashOffset=-tclock*20; ctx.beginPath(); ctx.arc(pr.x,pr.y,19,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
  if (elapsed<4){ for (let k=0;k<2;k++){ const ph=((elapsed*0.9+k*.5)%1), rad=22+ph*80; ctx.strokeStyle=`rgba(255,207,74,${.85*(1-ph)})`; ctx.lineWidth=3.5; ctx.beginPath(); ctx.arc(pr.x,pr.y,rad,0,Math.PI*2); ctx.stroke(); } }
  ctx.restore();
}
function drawPlayerSprite(alpha){
  const g=inGnoj(player.x,player.y);
  drawChar(player.x, player.y*TILT, player.ang, player.moving, 'p', {alpha: alpha!=null?alpha:(g?.6:1), sink: g?6:0, panic: chaseAlpha>.5});
}
function render(){
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle='#0a1128'; ctx.fillRect(0,0,vw,vh);
  if (!bg) return;
  const sw=WW*scale, sh=VH()*scale;
  const focusY = (player.hidden ? player.hidden.y : player.y)*TILT + PAD - 20;
  const focusX = player.hidden ? player.hidden.x : player.x;
  const tx = sw<=vw ? -(vw-sw)/2 : clamp(focusX*scale-vw/2, 0, sw-vw);
  const ty = sh<=vh ? -(vh-sh)/2 : clamp(focusY*scale-vh/2, 0, sh-vh);
  if (snapCam){ camX=tx; camY=ty; snapCam=false; } else { camX+=(tx-camX)*.14; camY+=(ty-camY)*.14; }
  ctx.setTransform(dpr*scale,0,0,dpr*scale,-camX*dpr,-camY*dpr+PAD*dpr*scale);
  drawBackdrop();
  drawGround();
  // dubinski sortirani sloj
  const dyn=[];
  for (const s of L.signs||[]) dyn.push({depth:(s.r+1)*T-0.005, f:()=>drawWallSign(s)});
  for (const t of trucks) dyn.push({depth:t.y+truckHalf(t)[1], f:()=>drawTruck(t)});
  for (const m of ministers) dyn.push({depth:m.y, f:()=>drawChar(m.x, m.y*TILT, Math.PI/2, false, 'm', {coat:m.coat, hair:m.hair, sip:microPlastic ? .42 : Math.pow(Math.max(0,Math.sin(tclock*1.2+m.seed)),6), micro:microPlastic})});
  for (const it of items) if (!it.got) dyn.push({depth:it.y, f:()=>{ const b=Math.sin(tclock*3+it.c)*2.5; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='19px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif'; ctx.fillText(it.def.ico, it.x, it.y*TILT-16+b); ctx.textBaseline='alphabetic'; }});
  if (shrine) dyn.push({depth:shrine.y, f:()=>{ const x=shrine.x, y=shrine.y*TILT; ctx.fillStyle=shrineUsed?'#5d6070':'#7a5a12'; ctx.fillRect(x-2,y-22,4,22); ctx.fillStyle=shrineUsed?'#7a7d92':'#ffcf4a'; ctx.beginPath(); ctx.arc(x,y-28,10,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#1b1630'; ctx.fillRect(x-2,y-34,3,12); ctx.fillRect(x-2,y-34,7,3); ctx.fillRect(x+3,y-34,3,7); ctx.fillRect(x-2,y-29,7,3); label(x,y+10,'PPD',shrineUsed?'#7a7d92':'#ffcf4a',9); }});
  for (const i of insps) dyn.push({depth:i.y, f:()=>drawChar(i.x, i.y*TILT, i.ang, i.path.length>0 && i.frozen<=0, 'i', {coat:i.coat, hair:i.hair, seed:i.x, frozen:i.frozen>0})});
  if (!player.hidden) dyn.push({depth:player.y+0.001, f:()=>drawPlayerSprite()});
  dyn.sort((a,b)=>a.depth-b.depth);
  let di=0;
  for (const b of blocks){ while (di<dyn.length && dyn[di].depth<b.depth){ dyn[di++].f(); } drawBlock(b); }
  while (di<dyn.length) dyn[di++].f();
  // "rendgen" obris igrača da se nikad ne izgubi iza zida
  if (!player.hidden) drawPlayerSprite(.3);
  // oblačići
  for (const i of insps){ const by=i.y*TILT-52*CHAR_S;
    if (i.frozen>0) bubble(i.x,by,'…bez komentara…','#9fb0e0');
    else if (i.state==='chase') bubble(i.x,by,'!','#ff4d5e','rgba(15,22,48,.93)',15);
    else if (i.state==='inv') bubble(i.x,by,'?','#ffcf4a','rgba(15,22,48,.93)',15);
    else if (i.alert>.05){ ctx.strokeStyle='#ffcf4a'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(i.x,by-6,5,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,i.alert)); ctx.stroke(); }
  }
  if (player.hidden){ const w=player.hidden; bubble(w.x, w.y*TILT-HGT.W-14, 'iza fotelje · klikni je za izlaz', '#ffcf4a'); }
  else {
    const w=nearestWardrobe(40); if (w && !player.path.length) bubble(w.x, w.y*TILT-HGT.W-12, 'E · iza fotelje', '#6fe39a');
    if (elapsed<4){ const b=Math.abs(Math.sin(tclock*5))*5; bubble(player.x, player.y*TILT-66*CHAR_S-b, 'TI', '#1b1630', '#ffcf4a', 14); }
  }
  if (pBubble) bubble(player.x, player.y*TILT-66*CHAR_S, pBubble.text, '#ffcf4a');
  if (ministers.length && tclock%5<2.6){ const k=Math.floor(tclock/5), m=ministers[k%ministers.length]; const lines = microPlastic ? MIN_LINES_MICRO : MIN_LINES; bubble(m.x, m.y*TILT-50*CHAR_S, lines[k%lines.length], microPlastic?'#ffb2c1':'#9fe3ff'); }
  for (const t of trucks) if (t.talkT>0) bubble(t.x, t.y*TILT-34, t.lines[t.li], '#ffcf4a');
  if (allGot() && !player.hidden){
    const e=exits[0], ex=e.x, ey=(e.y+16)*TILT, px=player.x, py=player.y*TILT-20, a=Math.atan2(ey-py, ex-px), pul=Math.sin(tclock*6)*3;
    ctx.save(); ctx.translate(px+Math.cos(a)*(34+pul), py+Math.sin(a)*(34+pul)); ctx.rotate(a);
    ctx.fillStyle='#6fe39a'; ctx.strokeStyle='#0a1128'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(-7,-10); ctx.lineTo(-2,0); ctx.lineTo(-7,10); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
  }
  if (chaseAlpha>.02){
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const g=ctx.createRadialGradient(vw/2,vh/2,Math.min(vw,vh)*.35,vw/2,vh/2,Math.max(vw,vh)*.75);
    g.addColorStop(0,'rgba(255,40,60,0)'); g.addColorStop(1,`rgba(255,40,60,${.35*chaseAlpha*(.75+.25*Math.sin(tclock*8))})`);
    ctx.fillStyle=g; ctx.fillRect(0,0,vw,vh);
  }
}
function screenToWorld(sx,sy){
  const vx=(sx+camX)/scale, vy=(sy+camY)/scale-PAD;
  // klik na fotelju: gleda se cijela nacrtana fotelja, ne samo pod ispod nje
  for (const w of wardrobes){ const x=w.c*T, y0=w.r*T*TILT, y1=y0+T*TILT; if (vx>=x && vx<=x+T && vy>=y0-HGT.W && vy<=y1) return {x:w.x,y:w.y,ward:w}; }
  return {x:vx, y:vy/TILT};
}

// ---------- loop ----------
let last=performance.now();
function frame(now){
  const dt=Math.min(.05,Math.max(0,(now-last)/1000)); last=now;
  if (running) update(dt); else tclock+=dt;
  render();
  requestAnimationFrame(frame);
}

// ---------- input ----------
let lastTap={t:0,x:0,y:0};
cv.addEventListener('pointerdown', e => {
  try { cv.focus({preventScroll:true}); } catch(_) {}
  if (!running) return;
  e.preventDefault();
  const r=cv.getBoundingClientRect(), sx=e.clientX-r.left, sy=e.clientY-r.top;
  const hit=screenToWorld(sx,sy), wx=hit.x, wy=hit.y;
  const now=performance.now(), dbl = now-lastTap.t < 340 && Math.hypot(sx-lastTap.x, sy-lastTap.y) < 40;
  lastTap={t:now,x:sx,y:sy};
  if (player.hidden && hit.ward===player.hidden){ unhide(); return; }
  goTo(Math.floor(wx/T), Math.floor(wy/T), wx, wy, dbl);
});
const GAME_KEYS=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'];
addEventListener('keydown', e => {
  if (GAME_KEYS.includes(e.code) && running) e.preventDefault();
  keys[e.code]=true; if (e.repeat) return;
  if (e.code==='KeyP' || e.code==='Escape'){ if (running) pause(); else if (!inMenu && !$('overlay').hidden && $('resBtn')) resume(); return; }
  if (!running) return;
  if (e.code==='KeyE') toggleHide();
  if (e.code==='KeyQ') statement();
});
addEventListener('keyup', e => { keys[e.code]=false; });
addEventListener('blur', () => { for (const k in keys) keys[k]=false; });
$('runBtn').addEventListener('click', () => { runMode=!runMode; lastBtnState=''; if (player) syncButtons(); });
$('hideBtn').addEventListener('click', toggleHide);
$('talkBtn').addEventListener('click', statement);
$('pauseBtn').addEventListener('click', () => { if (running) pause(); });
$('muteBtn').addEventListener('click', () => { muted=!muted; $('muteBtn').textContent=muted?'Zvuk: ne':'Zvuk: da'; $('muteBtn').setAttribute('aria-pressed',String(muted)); });
if (document.fullscreenEnabled && !matchMedia('(pointer:coarse)').matches){
  $('fsBtn').hidden=false;
  $('fsBtn').addEventListener('click', () => { const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(()=>{}); });
}
document.addEventListener('visibilitychange', () => { if (document.hidden && running) pause(); });

new ResizeObserver(() => { if (L) resize(); }).observe($('stage'));
loadLevel(Math.min(save.unlocked, LEVELS.length-1)); resize(); reset(); showMenu();
requestAnimationFrame(frame);
})();
