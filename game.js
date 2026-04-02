// ══════════════════════════════════════════
//  PENGUIN MAYHEM — game.js  (clean rewrite)
//  Storm + Accounts + Win tracking
// ══════════════════════════════════════════

const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');
const mmc    = document.getElementById('minimap');
const mmx    = mmc.getContext('2d');

let SW = window.innerWidth, SH = window.innerHeight;
canvas.width = SW; canvas.height = SH;
window.addEventListener('resize', () => {
  SW = window.innerWidth; SH = window.innerHeight;
  canvas.width = SW; canvas.height = SH;
});

// ── MOBILE
const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isMobile) {
  document.getElementById('joystick-area').style.display = 'block';
  document.getElementById('shoot-btn').style.display     = 'flex';
  document.getElementById('ammo-wrap').style.bottom      = '165px';
  document.getElementById('kb-hint').style.display       = 'none';
  if (screen.orientation && screen.orientation.lock)
    screen.orientation.lock('landscape').catch(() => {});
}

// ══════════════════════════════════════════
//  ACCOUNTS  (localStorage)
// ══════════════════════════════════════════
let currentUser = null;

function loadUsers() {
  try { return JSON.parse(localStorage.getItem('pm_users') || '{}'); } catch { return {}; }
}
function saveUsers(u) { localStorage.setItem('pm_users', JSON.stringify(u)); }
function loadCurrentUser() {
  const name = localStorage.getItem('pm_current');
  if (!name) return null;
  return loadUsers()[name] || null;
}
function saveCurrentUser() {
  if (!currentUser) return;
  const u = loadUsers(); u[currentUser.username] = currentUser;
  saveUsers(u); localStorage.setItem('pm_current', currentUser.username);
}
function recordWin(cls) {
  if (!currentUser) return;
  currentUser.wins[cls] = (currentUser.wins[cls] || 0) + 1;
  saveCurrentUser(); updateProfileUI();
}

function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('overlay').style.display     = 'none';
}
function showMainMenu() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('overlay').style.display     = 'flex';
  updateProfileUI();
}
function updateProfileUI() {
  if (!currentUser) return;
  document.getElementById('profile-username').textContent = currentUser.username;
  const icons = { surfer:'🏄', soldier:'🪖', mage:'🧊', tank:'🛡️' };
  const names = { surfer:'Surfer', soldier:'Soldier', mage:'Ice Mage', tank:'Tank' };
  document.getElementById('profile-wins').innerHTML =
    ['surfer','soldier','mage','tank'].map(c =>
      `<div class="pw-row"><span class="pw-icon">${icons[c]}</span><span class="pw-name">${names[c]}</span><span class="pw-count">${currentUser.wins[c]||0} wins</span></div>`
    ).join('');
  // Show username in menu top
  const btn = document.getElementById('profile-btn');
  if (btn) btn.title = currentUser.username;
}

document.getElementById('auth-submit').addEventListener('click', () => {
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;
  const mode     = document.getElementById('auth-mode').value;
  const errEl    = document.getElementById('auth-error');
  if (!username || !password) { errEl.textContent = 'Vul alles in!'; return; }
  if (username.length < 3)   { errEl.textContent = 'Username min. 3 tekens.'; return; }
  const users = loadUsers();
  if (mode === 'register') {
    if (users[username]) { errEl.textContent = 'Username al in gebruik!'; return; }
    users[username] = { username, password, wins: {} };
    saveUsers(users); currentUser = users[username];
  } else {
    if (!users[username])                      { errEl.textContent = 'Account niet gevonden!'; return; }
    if (users[username].password !== password) { errEl.textContent = 'Verkeerd wachtwoord!'; return; }
    currentUser = users[username];
  }
  localStorage.setItem('pm_current', username);
  errEl.textContent = ''; showMainMenu();
});

document.getElementById('auth-logout').addEventListener('click', () => {
  currentUser = null; localStorage.removeItem('pm_current');
  document.getElementById('auth-username').value = '';
  document.getElementById('auth-password').value = '';
  document.getElementById('auth-error').textContent = '';
  showAuthScreen();
});

document.getElementById('profile-btn').addEventListener('click', () => {
  const p = document.getElementById('profile-panel');
  p.style.display = p.style.display === 'flex' ? 'none' : 'flex';
});
document.getElementById('profile-close').addEventListener('click', () => {
  document.getElementById('profile-panel').style.display = 'none';
});

// On load
currentUser = loadCurrentUser();
if (currentUser) showMainMenu(); else showAuthScreen();

// ══════════════════════════════════════════
//  CHARACTER SELECT
// ══════════════════════════════════════════
let selectedClass = 'surfer';
document.querySelectorAll('.char-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedClass = card.dataset.cls;
  });
});

// ══════════════════════════════════════════
//  MAP CONFIG
// ══════════════════════════════════════════
const TILE = 72, GR = 60, GC = 60, CAM_LERP = 0.10;
let camX = 0, camY = 0;
const T_FLOOR = 0, T_WALL = 1, T_ICE = 2;
let grid = [];

function toScreen(wx, wy) { return { x: wx - camX, y: wy - camY }; }

function initGrid() {
  grid = [];
  for (let r = 0; r < GR; r++) {
    grid[r] = [];
    for (let c = 0; c < GC; c++)
      grid[r][c] = (r===0||r===GR-1||c===0||c===GC-1) ? T_WALL : T_FLOOR;
  }
  for (let r=1;r<GR-1;r++) for (let c=1;c<GC-1;c++) if(Math.random()<.12) grid[r][c]=T_ICE;
  const walls=[
    {r:28,c:28},{r:28,c:29},{r:28,c:30},{r:29,c:28},{r:30,c:28},{r:31,c:28},{r:31,c:29},{r:31,c:30},
    {r:8,c:10},{r:8,c:11},{r:8,c:12},{r:9,c:12},{r:10,c:12},{r:8,c:20},{r:9,c:20},{r:10,c:20},{r:10,c:21},
    {r:8,c:40},{r:8,c:41},{r:9,c:41},{r:10,c:41},{r:8,c:48},{r:9,c:48},{r:10,c:48},{r:10,c:47},
    {r:50,c:10},{r:50,c:11},{r:51,c:11},{r:52,c:11},{r:50,c:22},{r:51,c:22},{r:52,c:22},
    {r:50,c:40},{r:50,c:41},{r:51,c:40},{r:50,c:48},{r:51,c:48},{r:52,c:48},
    {r:20,c:8},{r:21,c:8},{r:22,c:8},{r:22,c:9},{r:30,c:8},{r:31,c:8},{r:32,c:8},
    {r:40,c:8},{r:41,c:8},{r:42,c:8},{r:20,c:50},{r:21,c:50},{r:22,c:50},
    {r:30,c:50},{r:31,c:50},{r:32,c:50},{r:40,c:50},{r:41,c:50},{r:42,c:50},
    {r:15,c:15},{r:15,c:16},{r:16,c:15},{r:15,c:44},{r:15,c:45},{r:16,c:45},
    {r:44,c:15},{r:44,c:16},{r:45,c:15},{r:44,c:44},{r:44,c:45},{r:45,c:44},
    {r:22,c:28},{r:22,c:29},{r:22,c:30},{r:37,c:28},{r:37,c:29},{r:37,c:30},
    {r:28,c:22},{r:29,c:22},{r:30,c:22},{r:28,c:37},{r:29,c:37},{r:30,c:37},
  ];
  walls.forEach(({r,c}) => { if(r>0&&r<GR-1&&c>0&&c<GC-1) grid[r][c]=T_WALL; });
  [{r:4,c:4},{r:4,c:55},{r:55,c:4},{r:55,c:55},{r:29,c:29}].forEach(({r,c}) => {
    for(let dr=-3;dr<=3;dr++) for(let dc=-3;dc<=3;dc++){
      const nr=r+dr,nc=c+dc; if(nr>0&&nr<GR-1&&nc>0&&nc<GC-1) grid[nr][nc]=T_FLOOR;
    }
  });
}

function isWall(r, c) {
  if(r<0||r>=GR||c<0||c>=GC) return true;
  return grid[r][c]===T_WALL;
}
function blocked(wx, wy, rad=10) {
  for(const {dx,dy} of [{dx:-rad,dy:-rad},{dx:rad,dy:-rad},{dx:-rad,dy:rad},{dx:rad,dy:rad}])
    if(isWall(Math.floor((wy+dy)/TILE), Math.floor((wx+dx)/TILE))) return true;
  return false;
}

// ══════════════════════════════════════════
//  STORM  — shrinks from outside in
// ══════════════════════════════════════════
let stormRadius = GC / 2;
let stormTimer  = 0;
const STORM_START  = 60 * 12;  // 12s grace period
const STORM_SPEED  = 0.025;    // tiles per frame shrink
const STORM_DAMAGE = 0.15;     // hp per frame outside zone
const STORM_MIN_R  = 5;

function initStorm() { stormRadius = GC / 2; stormTimer = 0; }

function updateStorm() {
  stormTimer++;
  if (stormTimer > STORM_START)
    stormRadius = Math.max(STORM_MIN_R, stormRadius - STORM_SPEED);

  const cx = GC/2*TILE, cy = GR/2*TILE;
  for (const p of players) {
    if (!p.alive) continue;
    const dx = p.wx-cx, dy = p.wy-cy;
    if (Math.sqrt(dx*dx+dy*dy)/TILE > stormRadius) {
      p.hp = Math.max(0, p.hp - STORM_DAMAGE);
      if (p.hp <= 0) killPlayer(p);
    }
  }
}

function drawStorm() {
  const cx=GC/2*TILE, cy=GR/2*TILE;
  const {x:scx,y:scy}=toScreen(cx,cy);
  const safeR=stormRadius*TILE;

  ctx.save();
  ctx.fillStyle='rgba(0,20,70,0.48)';
  ctx.beginPath();
  ctx.rect(0,0,SW,SH);
  ctx.arc(scx,scy,safeR,0,Math.PI*2,true);
  ctx.fill();

  const pulse=0.5+Math.sin(Date.now()*.005)*.5;
  ctx.strokeStyle=`rgba(60,160,255,${0.5+pulse*.4})`;
  ctx.lineWidth=3+pulse*3; ctx.shadowColor='#3a9fff'; ctx.shadowBlur=10;
  ctx.beginPath(); ctx.arc(scx,scy,safeR,0,Math.PI*2); ctx.stroke();
  ctx.restore();

  if (stormTimer < STORM_START) {
    const sec=Math.ceil((STORM_START-stormTimer)/60);
    ctx.save(); ctx.fillStyle='rgba(60,160,255,0.9)'; ctx.font='700 15px Segoe UI';
    ctx.textAlign='center'; ctx.shadowColor='#000'; ctx.shadowBlur=6;
    ctx.fillText(`⚠️ Storm begint over ${sec}s`, SW/2, 58); ctx.restore();
  } else {
    ctx.save(); ctx.fillStyle='rgba(60,160,255,0.7)'; ctx.font='700 13px Segoe UI';
    ctx.textAlign='center'; ctx.shadowColor='#000'; ctx.shadowBlur=4;
    ctx.fillText('⚠️ STORM ACTIEF — ga naar het midden!', SW/2, 58); ctx.restore();
  }
}

// ══════════════════════════════════════════
//  PARTICLES
// ══════════════════════════════════════════
let parts = [];
function spawnHitFx(wx,wy,col,n=6){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=1.5+Math.random()*3;parts.push({wx,wy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:14+Math.random()*10,ml:24,sz:2+Math.random()*3,col});}}
function spawnDeathFx(wx,wy,col){for(let i=0;i<22;i++)parts.push({wx:wx+(Math.random()-.5)*20,wy:wy+(Math.random()-.5)*20,vx:(Math.random()-.5)*6,vy:(Math.random()-.5)*6,life:30+Math.random()*20,ml:50,sz:4+Math.random()*6,col});}

// ══════════════════════════════════════════
//  CLASSES
// ══════════════════════════════════════════
const CLASSES={
  surfer: {col:'#5ac8fa',hp:85, spd:2.2,fr:22,maxA:6,relT:85, dmg:14,bspd:7.0,name:'Surfer'},
  soldier:{col:'#ff9a5a',hp:95, spd:1.8,fr:16,maxA:8,relT:70, dmg:18,bspd:8.0,name:'Soldier'},
  mage:   {col:'#a080f8',hp:70, spd:1.6,fr:30,maxA:4,relT:110,dmg:24,bspd:6.0,name:'Ice Mage'},
  tank:   {col:'#f0c040',hp:180,spd:1.2,fr:45,maxA:3,relT:125,dmg:24,bspd:5.5,name:'Tank'},
};

// ══════════════════════════════════════════
//  PLAYERS & BULLETS
// ══════════════════════════════════════════
let players=[],bullets=[];
const PLAYER_R=14;

function spawnAll(){
  players=[]; bullets=[];
  const spawns=[{wx:4.5*TILE,wy:4.5*TILE},{wx:55.5*TILE,wy:4.5*TILE},{wx:4.5*TILE,wy:55.5*TILE},{wx:55.5*TILE,wy:55.5*TILE},{wx:29.5*TILE,wy:29.5*TILE}];
  const allCls=['surfer','soldier','mage','tank'];
  const bots=allCls.filter(c=>c!==selectedClass);
  while(bots.length<4) bots.push(bots[Math.floor(Math.random()*bots.length)]);
  [{cls:selectedClass,isP:true},{cls:bots[0],isP:false},{cls:bots[1],isP:false},{cls:bots[2],isP:false},{cls:bots[3],isP:false}]
    .forEach((cfg,i)=>{
      const d=CLASSES[cfg.cls],s=spawns[i];
      players.push({wx:s.wx,wy:s.wy,vx:0,vy:0,cls:cfg.cls,isP:cfg.isP,hp:d.hp,mhp:d.hp,spd:d.spd,fr:d.fr,ammo:d.maxA,maxA:d.maxA,relT:d.relT,relCd:0,dmg:d.dmg,bspd:d.bspd,col:d.col,name:cfg.isP?'JIJ':d.name,alive:true,cd:0,inv:0,angle:0,frz:0,ait:0,bob:Math.random()*Math.PI*2});
    });
}

// ══════════════════════════════════════════
//  INPUT
// ══════════════════════════════════════════
const K={};
window.addEventListener('keydown',e=>{K[e.code]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();});
window.addEventListener('keyup',e=>{K[e.code]=false;});

const joy={active:false,id:-1,dx:0,dy:0};
const joyArea=document.getElementById('joystick-area');
const joyKnob=document.getElementById('joystick-knob');
const JOY_R=55;
function joyCenter(){const r=joyArea.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};}
joyArea.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];joy.active=true;joy.id=t.identifier;joy.dx=0;joy.dy=0;},{passive:false});
window.addEventListener('touchmove',e=>{e.preventDefault();if(!joy.active)return;for(const t of e.changedTouches){if(t.identifier!==joy.id)continue;const jc=joyCenter();let dx=t.clientX-jc.x,dy=t.clientY-jc.y;const d=Math.sqrt(dx*dx+dy*dy);if(d>JOY_R){dx=dx/d*JOY_R;dy=dy/d*JOY_R;}joy.dx=dx/JOY_R;joy.dy=dy/JOY_R;joyKnob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;}},{passive:false});
window.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(t.identifier===joy.id){joy.active=false;joy.dx=0;joy.dy=0;joyKnob.style.transform='translate(-50%,-50%)';}});

let shootHeld=false;
const shootBtn=document.getElementById('shoot-btn');
shootBtn.addEventListener('touchstart',e=>{e.preventDefault();shootHeld=true;},{passive:false});
shootBtn.addEventListener('touchend',e=>{e.preventDefault();shootHeld=false;});

// ══════════════════════════════════════════
//  GAME LOOP
// ══════════════════════════════════════════
let running=false,fid=null,lt=0;

function update(ts){
  const dt=Math.min(ts-lt,50);lt=ts;
  if(!running){fid=requestAnimationFrame(update);return;}

  for(const p of players){
    if(!p.alive)continue;
    p.inv=Math.max(0,p.inv-1); p.cd=Math.max(0,p.cd-1);
    if(p.ammo<p.maxA){p.relCd--;if(p.relCd<=0){p.ammo=p.maxA;p.relCd=0;}}
    if(p.frz>0){p.frz--;continue;}
    p.isP?doPlayerInput(p):doBotAI(p);
    const SPD=p.spd*2.2;
    const nx=p.wx+p.vx*SPD,ny=p.wy+p.vy*SPD;
    if(!blocked(nx,p.wy,PLAYER_R))p.wx=nx; else p.vx=0;
    if(!blocked(p.wx,ny,PLAYER_R))p.wy=ny; else p.vy=0;
    p.wx=Math.max(PLAYER_R+TILE,Math.min((GC-1)*TILE-PLAYER_R,p.wx));
    p.wy=Math.max(PLAYER_R+TILE,Math.min((GR-1)*TILE-PLAYER_R,p.wy));
    p.vx*=.78; p.vy*=.78;
  }

  const me=players[0];
  if(me&&me.alive){
    camX+=(me.wx-SW/2-camX)*CAM_LERP; camY+=(me.wy-SH/2-camY)*CAM_LERP;
    camX=Math.max(0,Math.min(GC*TILE-SW,camX)); camY=Math.max(0,Math.min(GR*TILE-SH,camY));
  }

  updateBullets(); updateStorm();
  for(const p of parts){p.wx+=p.vx;p.wy+=p.vy;p.vx*=.92;p.vy*=.92;p.life--;}
  parts=parts.filter(p=>p.life>0);

  updateHUD(); drawMinimap();
  const alive=players.filter(p=>p.alive);
  document.getElementById('alive-num').textContent=alive.length;
  if(alive.length<=1){
    running=false;
    const winner=alive[0];
    if(winner&&winner.isP) recordWin(winner.cls);
    setTimeout(()=>showResult(winner),700);
  }
  draw(); fid=requestAnimationFrame(update);
}

function doPlayerInput(p){
  let dx=0,dy=0;
  if(K['ArrowLeft']||K['KeyA'])dx-=1;if(K['ArrowRight']||K['KeyD'])dx+=1;
  if(K['ArrowUp']||K['KeyW'])dy-=1;if(K['ArrowDown']||K['KeyS'])dy+=1;
  if(joy.active){dx+=joy.dx;dy+=joy.dy;}
  const len=Math.sqrt(dx*dx+dy*dy);
  if(len>0){p.vx=dx/len;p.vy=dy/len;p.angle=Math.atan2(dy,dx);}
  if((K['Space']||shootHeld)&&p.cd===0&&p.ammo>0)shoot(p);
}

function doBotAI(p){
  let near=null,nd=Infinity;
  for(const o of players){if(!o.alive||o===p)continue;const dx=o.wx-p.wx,dy=o.wy-p.wy,d=Math.sqrt(dx*dx+dy*dy);if(d<nd){nd=d;near=o;}}
  const cx=GC/2*TILE,cy=GR/2*TILE;
  const ddx=p.wx-cx,ddy=p.wy-cy;
  const outside=Math.sqrt(ddx*ddx+ddy*ddy)/TILE>stormRadius-3;
  p.ait--;
  if(p.ait<=0){
    p.ait=20+Math.random()*25;
    if(outside){const ln=Math.sqrt(ddx*ddx+ddy*ddy)||1;p.vx=-ddx/ln;p.vy=-ddy/ln;}
    else if(near){const dx=near.wx-p.wx,dy=near.wy-p.wy,ln=Math.sqrt(dx*dx+dy*dy)||1;p.vx=dx/ln+(Math.random()-.5)*.4;p.vy=dy/ln+(Math.random()-.5)*.4;const vl=Math.sqrt(p.vx*p.vx+p.vy*p.vy)||1;p.vx/=vl;p.vy/=vl;}
  }
  if(near){const dx=near.wx-p.wx,dy=near.wy-p.wy;p.angle=Math.atan2(dy,dx);if(nd<TILE*8&&p.cd===0&&p.ammo>0)shoot(p);}
}

function shoot(p){
  if(p.ammo<=0)return;
  p.cd=p.fr;p.ammo--;if(p.ammo===0)p.relCd=p.relT;
  const n=p.cls==='soldier'?2:1;
  for(let i=0;i<n;i++){
    const spread=n>1?(i-.5)*.1:0,ang=p.angle+spread;
    bullets.push({wx:p.wx+Math.cos(ang)*(PLAYER_R+4),wy:p.wy+Math.sin(ang)*(PLAYER_R+4),vx:Math.cos(ang)*p.bspd*2,vy:Math.sin(ang)*p.bspd*2,own:p,dmg:p.dmg,col:p.col,life:80,frz:p.cls==='mage',trail:[]});
  }
  if(p.isP)renderAmmo(p);
}

function updateBullets(){
  bullets=bullets.filter(b=>b.life>0);
  for(const b of bullets){
    b.trail.push({wx:b.wx,wy:b.wy});if(b.trail.length>5)b.trail.shift();
    b.wx+=b.vx;b.wy+=b.vy;b.life--;
    if(isWall(Math.floor(b.wy/TILE),Math.floor(b.wx/TILE))){spawnHitFx(b.wx,b.wy,b.col,5);b.life=0;continue;}
    if(b.wx<0||b.wx>GC*TILE||b.wy<0||b.wy>GR*TILE){b.life=0;continue;}
    for(const p of players){
      if(!p.alive||p===b.own||p.inv>0)continue;
      const dx=p.wx-b.wx,dy=p.wy-b.wy;
      if(Math.sqrt(dx*dx+dy*dy)<PLAYER_R+5){hurtPlayer(p,b.dmg);if(b.frz)p.frz=70;spawnHitFx(b.wx,b.wy,b.col,8);b.life=0;break;}
    }
  }
}

function hurtPlayer(p,dmg){if(p.inv>0)return;p.hp=Math.max(0,p.hp-dmg);p.inv=35;spawnHitFx(p.wx,p.wy,p.col,10);if(p.hp<=0)killPlayer(p);}
function killPlayer(p){p.alive=false;p.hp=0;spawnDeathFx(p.wx,p.wy,p.col);}

// ══════════════════════════════════════════
//  DRAW
// ══════════════════════════════════════════
function draw(){
  ctx.clearRect(0,0,SW,SH);
  ctx.fillStyle='#c8e8f4';ctx.fillRect(0,0,SW,SH);
  for(let r=0;r<GR;r++){
    for(let c=0;c<GC;c++){
      const wx=c*TILE,wy=r*TILE,{x,y}=toScreen(wx,wy);
      if(x>SW+TILE||x<-TILE||y>SH+TILE||y<-TILE)continue;
      const cell=grid[r][c];
      if(cell===T_WALL){
        ctx.fillStyle='#2a3e5a';ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle='#3a5070';ctx.fillRect(x+2,y+2,TILE-4,TILE*.55);
        ctx.fillStyle='#1a2a3e';ctx.fillRect(x,y+TILE-6,TILE,6);
        ctx.strokeStyle='#1a2a3e';ctx.lineWidth=1;ctx.strokeRect(x,y,TILE,TILE);
      } else {
        ctx.fillStyle=cell===T_ICE?'#ddf0fa':'#eef8ff';ctx.fillRect(x,y,TILE,TILE);
        ctx.strokeStyle='rgba(160,210,240,.35)';ctx.lineWidth=.5;ctx.strokeRect(x,y,TILE,TILE);
        if(cell===T_ICE){ctx.fillStyle='rgba(255,255,255,.4)';ctx.fillRect(x+4,y+4,TILE*.4,3);}
      }
    }
  }
  for(const p of parts){const{x,y}=toScreen(p.wx,p.wy);ctx.save();ctx.globalAlpha=(p.life/p.ml)*.8;ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(x,y,Math.max(.5,p.sz*(p.life/p.ml)),0,Math.PI*2);ctx.fill();ctx.restore();}

  drawStorm();

  for(const b of bullets){
    for(let i=0;i<b.trail.length;i++){const t=b.trail[i],{x,y}=toScreen(t.wx,t.wy);ctx.save();ctx.globalAlpha=(i/b.trail.length)*.5;ctx.fillStyle=b.col;ctx.beginPath();ctx.arc(x,y,3*(i/b.trail.length),0,Math.PI*2);ctx.fill();ctx.restore();}
    const{x,y}=toScreen(b.wx,b.wy);
    ctx.save();ctx.fillStyle='#fff';ctx.shadowColor=b.col;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();ctx.fillStyle=b.col;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  for(const p of players)if(p.alive)drawPlayer(p);
}

function drawPlayer(p){
  const{x:px,y:py}=toScreen(p.wx,p.wy),R=PLAYER_R;
  ctx.save();
  if(p.inv>0&&Math.floor(p.inv/3)%2===0)ctx.globalAlpha=.3;
  if(p.frz>0){ctx.shadowColor='#80d0ff';ctx.shadowBlur=16;}
  ctx.save();ctx.globalAlpha=(ctx.globalAlpha||1)*.2;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(px+3,py+3,R,R*.7,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.fillStyle=p.frz>0?'#c0e8ff':'#16162a';ctx.beginPath();ctx.arc(px,py,R,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(px,py,R*.6,0,Math.PI*2);ctx.fill();
  const ax=px+Math.cos(p.angle)*R,ay=py+Math.sin(p.angle)*R;
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ax,ay,4,0,Math.PI*2);ctx.fill();
  const ex=px+Math.cos(p.angle)*R*.45,ey=py+Math.sin(p.angle)*R*.45;
  const perpX=-Math.sin(p.angle)*4,perpY=Math.cos(p.angle)*4;
  ctx.fillStyle='#fff';
  ctx.beginPath();ctx.arc(ex+perpX,ey+perpY,2.5,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(ex-perpX,ey-perpY,2.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#050d1a';
  ctx.beginPath();ctx.arc(ex+perpX+Math.cos(p.angle),ey+perpY+Math.sin(p.angle),1.3,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(ex-perpX+Math.cos(p.angle),ey-perpY+Math.sin(p.angle),1.3,0,Math.PI*2);ctx.fill();
  const bw=R*2.5,bx=px-bw/2,by=py-R-12,hpP=p.hp/p.mhp;
  ctx.fillStyle='rgba(10,24,40,.75)';ctx.fillRect(bx,by,bw,5);
  ctx.fillStyle=hpP>.5?'#3ad870':hpP>.25?'#f0c040':'#f04040';ctx.fillRect(bx,by,bw*hpP,5);
  if(p.isP){ctx.fillStyle=p.col;ctx.font='700 10px Segoe UI';ctx.textAlign='center';ctx.fillText('YOU',px,py-R-16);}
  else{ctx.font='13px serif';ctx.textAlign='center';ctx.fillText({soldier:'🪖',mage:'🧊',tank:'🛡️'}[p.cls]||'🐧',px,py-R-16);}
  if(p.frz>0){ctx.fillStyle='rgba(110,195,255,.25)';ctx.beginPath();ctx.arc(px,py,R+4,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}

// ══════════════════════════════════════════
//  MINIMAP
// ══════════════════════════════════════════
function drawMinimap(){
  const S=92;mmx.clearRect(0,0,S,S);const sc=S/GC;
  for(let r=0;r<GR;r++)for(let c=0;c<GC;c++){
    const cell=grid[r][c];
    mmx.fillStyle=cell===T_WALL?'#2a3e5a':cell===T_ICE?'#aad8f0':'#d0eefa';
    mmx.fillRect(c*sc,r*sc,sc,sc);
  }
  const pulse=0.5+Math.sin(Date.now()*.005)*.5;
  mmx.strokeStyle=`rgba(60,160,255,${0.5+pulse*.4})`;mmx.lineWidth=1.5;
  mmx.beginPath();mmx.arc(GC/2*sc,GR/2*sc,stormRadius*sc,0,Math.PI*2);mmx.stroke();
  for(const p of players){if(!p.alive)continue;mmx.fillStyle=p.col;mmx.beginPath();mmx.arc(p.wx/TILE*sc,p.wy/TILE*sc,p.isP?3:2,0,Math.PI*2);mmx.fill();}
  const vx=(camX/TILE)*sc,vy=(camY/TILE)*sc,vw=(SW/TILE)*sc,vh=(SH/TILE)*sc;
  mmx.strokeStyle='rgba(255,255,255,.4)';mmx.lineWidth=1;mmx.strokeRect(vx,vy,vw,vh);
}

// ══════════════════════════════════════════
//  HUD
// ══════════════════════════════════════════
function renderAmmo(p){
  const wrap=document.getElementById('ammo-dots');wrap.innerHTML='';
  for(let i=0;i<p.maxA;i++){const d=document.createElement('div');d.className='ammo-dot'+(i>=p.ammo?' empty':'');wrap.appendChild(d);}
}
function updateHUD(){
  const me=players[0];if(!me)return;
  const hpP=me.hp/me.mhp;
  const icons={surfer:'🏄',soldier:'🪖',mage:'🧊',tank:'🛡️'};
  document.getElementById('my-hp-name').textContent=(icons[me.cls]||'🐧')+' '+me.name.toUpperCase()+' — JIJ';
  document.getElementById('my-hp-name').style.color=me.col;
  document.getElementById('my-hp-bar').style.width=(hpP*100)+'%';
  document.getElementById('my-hp-bar').style.background=hpP>.5?'linear-gradient(90deg,#3ad870,#5ac8fa)':hpP>.25?'linear-gradient(90deg,#f0c040,#e08020)':'linear-gradient(90deg,#f04040,#c02020)';
  document.getElementById('my-hp-text').textContent=Math.ceil(me.hp)+' / '+me.mhp+' HP'+(me.ammo===0?' — HERLADEN...':'');
  renderAmmo(me);
  const bc=document.getElementById('bot-cards');
  if(!bc.children.length){
    players.slice(1).forEach((p,i)=>{
      const d=document.createElement('div');d.className='bot-card';d.id='bc'+i;
      d.innerHTML=`<div class="bot-dot" style="background:${p.col}"></div><div class="bot-info"><div class="bot-name">${p.name}</div><div class="bot-bar-bg"><div class="bot-bar-fill" id="bbf${i}" style="width:100%;background:${p.col}"></div></div></div>`;
      bc.appendChild(d);
    });
  }
  players.slice(1).forEach((p,i)=>{
    const f=document.getElementById('bbf'+i),c=document.getElementById('bc'+i);
    if(f)f.style.width=(p.hp/p.mhp*100)+'%';if(c)c.classList.toggle('dead',!p.alive);
  });
}

// ══════════════════════════════════════════
//  RESULT
// ══════════════════════════════════════════
function showResult(winner){
  document.getElementById('overlay').style.display='flex';
  const rt=document.getElementById('result-text');
  if(!winner)rt.innerHTML='<span class="lose">💀 Gelijkspel!</span>';
  else if(winner.isP)rt.innerHTML='<span class="win">🏆 JIJ WINT! Win opgeslagen!</span>';
  else rt.innerHTML=`<span class="lose">💀 ${winner.name} won. Opnieuw?</span>`;
  document.getElementById('play-btn').textContent='▶ OPNIEUW';
}

// ══════════════════════════════════════════
//  START
// ══════════════════════════════════════════
document.getElementById('play-btn').addEventListener('click',()=>{
  document.getElementById('overlay').style.display='none';
  document.getElementById('result-text').innerHTML='';
  document.getElementById('bot-cards').innerHTML='';
  document.getElementById('profile-panel').style.display='none';
  initGrid();spawnAll();initStorm();
  const me=players[0];
  camX=me.wx-SW/2;camY=me.wy-SH/2;
  renderAmmo(me);
  running=true;
  if(fid)cancelAnimationFrame(fid);
  lt=performance.now();fid=requestAnimationFrame(update);
});
