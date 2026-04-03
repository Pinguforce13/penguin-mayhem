// ══════════════════════════════════════════
//  PENGUIN MAYHEM — game.js
//  Drag-to-aim, ice breaking, ammo fix, performance
// ══════════════════════════════════════════

const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');
const mmc    = document.getElementById('minimap');
const mmx    = mmc.getContext('2d');

let SW = window.innerWidth, SH = window.innerHeight;
canvas.width = SW; canvas.height = SH;
window.addEventListener('resize', () => { SW=window.innerWidth;SH=window.innerHeight;canvas.width=SW;canvas.height=SH; });

const isMobile = ('ontouchstart' in window)||navigator.maxTouchPoints>0;
if (isMobile) {
  document.getElementById('joystick-area').style.display='block';
  document.getElementById('shoot-btn').style.display='flex';
  document.getElementById('ammo-wrap').style.bottom='165px';
  document.getElementById('kb-hint').style.display='none';
  if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});
}

// ══════════════════════════════════════════ ACCOUNTS
let currentUser=null;
function loadUsers(){try{return JSON.parse(localStorage.getItem('pm_users')||'{}')}catch{return {}}}
function saveUsers(u){try{localStorage.setItem('pm_users',JSON.stringify(u))}catch{}}
function loadCurrentUser(){const n=localStorage.getItem('pm_current');if(!n)return null;return loadUsers()[n]||null;}
function saveCurrentUser(){if(!currentUser)return;const u=loadUsers();u[currentUser.username]=currentUser;saveUsers(u);localStorage.setItem('pm_current',currentUser.username);}
function recordWin(cls){if(!currentUser)return;currentUser.wins[cls]=(currentUser.wins[cls]||0)+1;saveCurrentUser();updateProfileUI();}

function showAuthScreen(){document.getElementById('auth-screen').style.display='flex';document.getElementById('overlay').style.display='none';document.getElementById('profile-btn').style.display='none';}
function showMainMenu(){document.getElementById('auth-screen').style.display='none';document.getElementById('overlay').style.display='flex';document.getElementById('profile-btn').style.display='flex';updateProfileUI();}
function updateProfileUI(){
  if(!currentUser)return;
  document.getElementById('profile-username').textContent=currentUser.username;
  document.getElementById('profile-btn-label').textContent=currentUser.username.slice(0,8);
  const icons={surfer:'🏄',soldier:'🪖',mage:'🧊',tank:'🛡️'};
  const names={surfer:'Surfer',soldier:'Soldier',mage:'Ice Mage',tank:'Tank'};
  document.getElementById('profile-wins').innerHTML=['surfer','soldier','mage','tank'].map(c=>`<div class="pw-row"><span class="pw-icon">${icons[c]}</span><span class="pw-name">${names[c]}</span><span class="pw-count">${currentUser.wins[c]||0} wins</span></div>`).join('');
}

document.getElementById('auth-submit').addEventListener('click',()=>{
  const username=document.getElementById('auth-username').value.trim().toLowerCase();
  const password=document.getElementById('auth-password').value;
  const mode=document.getElementById('auth-mode').value;
  const errEl=document.getElementById('auth-error');
  errEl.textContent='';
  if(!username||!password){errEl.textContent='Vul alles in!';return;}
  if(username.length<3){errEl.textContent='Username min. 3 tekens.';return;}
  const users=loadUsers();
  if(mode==='register'){
    if(users[username]){errEl.textContent='Username al in gebruik!';return;}
    users[username]={username,password,wins:{}};saveUsers(users);currentUser=users[username];
  } else {
    if(!users[username]){errEl.textContent='Account niet gevonden!';return;}
    if(users[username].password!==password){errEl.textContent='Verkeerd wachtwoord!';return;}
    currentUser=users[username];
  }
  localStorage.setItem('pm_current',currentUser.username);
  showMainMenu();
});

document.getElementById('auth-logout').addEventListener('click',()=>{
  currentUser=null;localStorage.removeItem('pm_current');
  ['auth-username','auth-password'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('auth-error').textContent='';
  document.getElementById('profile-panel').style.display='none';
  showAuthScreen();
});
document.getElementById('profile-btn').addEventListener('click',()=>{const p=document.getElementById('profile-panel');p.style.display=p.style.display==='flex'?'none':'flex';});
document.getElementById('profile-close').addEventListener('click',()=>{document.getElementById('profile-panel').style.display='none';});

currentUser=loadCurrentUser();
if(currentUser)showMainMenu();else showAuthScreen();

// ══════════════════════════════════════════ CHARACTER SELECT
let selectedClass='surfer';
document.querySelectorAll('.char-card').forEach(card=>{
  card.addEventListener('click',()=>{document.querySelectorAll('.char-card').forEach(c=>c.classList.remove('selected'));card.classList.add('selected');selectedClass=card.dataset.cls;});
});

// ══════════════════════════════════════════ MAP
const TILE=72,GR=50,GC=50,CAM_LERP=0.12;
let camX=0,camY=0;
const T_FLOOR=0,T_WALL=1,T_ICE=2;
let grid=[],iceHP=[],iceTremor=[];

function toScreen(wx,wy){return{x:Math.round(wx-camX),y:Math.round(wy-camY)};}

function initGrid(){
  grid=[];iceHP=[];iceTremor=[];
  for(let r=0;r<GR;r++){grid[r]=[];iceHP[r]=[];iceTremor[r]=[];
    for(let c=0;c<GC;c++){const wall=r===0||r===GR-1||c===0||c===GC-1;grid[r][c]=wall?T_WALL:T_FLOOR;iceHP[r][c]=4;iceTremor[r][c]=0;}}
  for(let r=1;r<GR-1;r++) for(let c=1;c<GC-1;c++) if(Math.random()<.14)grid[r][c]=T_ICE;
  const walls=[{r:23,c:23},{r:23,c:24},{r:23,c:25},{r:24,c:23},{r:25,c:23},{r:25,c:24},{r:25,c:25},{r:7,c:8},{r:7,c:9},{r:8,c:9},{r:9,c:9},{r:7,c:18},{r:7,c:19},{r:8,c:18},{r:9,c:18},{r:7,c:30},{r:7,c:31},{r:8,c:31},{r:9,c:31},{r:7,c:40},{r:7,c:41},{r:8,c:41},{r:9,c:41},{r:40,c:8},{r:40,c:9},{r:41,c:9},{r:42,c:9},{r:40,c:18},{r:40,c:19},{r:41,c:18},{r:42,c:18},{r:40,c:30},{r:40,c:31},{r:41,c:31},{r:42,c:31},{r:40,c:40},{r:40,c:41},{r:41,c:41},{r:42,c:41},{r:16,c:12},{r:17,c:12},{r:18,c:12},{r:18,c:13},{r:16,c:36},{r:17,c:36},{r:18,c:36},{r:18,c:37},{r:31,c:12},{r:32,c:12},{r:33,c:12},{r:31,c:13},{r:31,c:36},{r:32,c:36},{r:33,c:36},{r:33,c:37},{r:23,c:10},{r:24,c:10},{r:25,c:10},{r:23,c:38},{r:24,c:38},{r:25,c:38},{r:10,c:23},{r:10,c:24},{r:10,c:25},{r:38,c:23},{r:38,c:24},{r:38,c:25}];
  walls.forEach(({r,c})=>{if(r>0&&r<GR-1&&c>0&&c<GC-1)grid[r][c]=T_WALL;});
  [{r:4,c:4},{r:4,c:45},{r:45,c:4},{r:45,c:45},{r:24,c:24}].forEach(({r,c})=>{for(let dr=-3;dr<=3;dr++)for(let dc=-3;dc<=3;dc++){const nr=r+dr,nc=c+dc;if(nr>0&&nr<GR-1&&nc>0&&nc<GC-1){grid[nr][nc]=T_FLOOR;iceHP[nr][nc]=4;}}});
}

function isWall(r,c){if(r<0||r>=GR||c<0||c>=GC)return true;return grid[r][c]===T_WALL||iceHP[r][c]<=0;}
function blocked(wx,wy,rad=12){for(const{dx,dy}of[{dx:-rad,dy:-rad},{dx:rad,dy:-rad},{dx:-rad,dy:rad},{dx:rad,dy:rad}])if(isWall(Math.floor((wy+dy)/TILE),Math.floor((wx+dx)/TILE)))return true;return false;}

// ══════════════════════════════════════════ ICE BREAKING
let iceTimer=0,nextBreakTimer=0;
const ICE_BREAK_START=60*18,ICE_BREAK_INTERVAL=80;

function initIce(){iceTimer=0;nextBreakTimer=ICE_BREAK_START;}

function updateIce(){
  iceTimer++;nextBreakTimer--;
  if(nextBreakTimer<=0){nextBreakTimer=ICE_BREAK_INTERVAL;crumbleRing();}
  for(let r=0;r<GR;r++) for(let c=0;c<GC;c++) if(iceTremor[r][c]>0)iceTremor[r][c]--;
  for(const p of players){
    if(!p.alive)continue;
    const tr=Math.floor(p.wy/TILE),tc=Math.floor(p.wx/TILE);
    if(tr>=0&&tr<GR&&tc>=0&&tc<GC&&iceHP[tr][tc]<=0&&grid[tr][tc]!==T_WALL)hurtPlayer(p,2);
  }
}

function crumbleRing(){
  const ring=1+Math.floor(iceTimer/(ICE_BREAK_INTERVAL*10));
  const maxRing=Math.min(ring,Math.floor(GR/2)-3);
  const candidates=[];
  for(let r=maxRing;r<GR-maxRing;r++) for(let c=maxRing;c<GC-maxRing;c++)
    if(r===maxRing||r===GR-1-maxRing||c===maxRing||c===GC-1-maxRing)
      if(grid[r][c]!==T_WALL&&iceHP[r][c]>0)candidates.push({r,c});
  const n=3+Math.floor(Math.random()*4);
  for(let i=0;i<n&&candidates.length>0;i++){
    const idx=Math.floor(Math.random()*candidates.length);
    const{r,c}=candidates.splice(idx,1)[0];
    iceHP[r][c]--;
    if(iceHP[r][c]>0)iceTremor[r][c]=40+Math.floor(Math.random()*30);
    else{iceTremor[r][c]=0;spawnIceFx(r,c);}
  }
}

function spawnIceFx(r,c){const wx=(c+.5)*TILE,wy=(r+.5)*TILE;for(let i=0;i<8;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*3;parts.push({wx,wy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:18+Math.random()*18,ml:36,sz:3+Math.random()*5,col:'#b0d4ec'});}}

// ══════════════════════════════════════════ PARTICLES
let parts=[];
function spawnHitFx(wx,wy,col,n=5){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=1.5+Math.random()*3;parts.push({wx,wy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:10+Math.random()*8,ml:18,sz:2+Math.random()*3,col});}}
function spawnDeathFx(wx,wy,col){for(let i=0;i<20;i++)parts.push({wx:wx+(Math.random()-.5)*20,wy:wy+(Math.random()-.5)*20,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:22+Math.random()*18,ml:40,sz:3+Math.random()*6,col});}

// ══════════════════════════════════════════ CLASSES
const CLASSES={
  surfer: {col:'#5ac8fa',hp:85, spd:2.2,fr:28,maxA:6,relT:120,dmg:14,bspd:7,name:'Surfer'},
  soldier:{col:'#ff9a5a',hp:95, spd:1.8,fr:20,maxA:8,relT:90, dmg:18,bspd:8,name:'Soldier'},
  mage:   {col:'#a080f8',hp:70, spd:1.6,fr:38,maxA:4,relT:150,dmg:24,bspd:6,name:'Ice Mage'},
  tank:   {col:'#f0c040',hp:180,spd:1.2,fr:55,maxA:3,relT:180,dmg:28,bspd:5.5,name:'Tank'},
};

// ══════════════════════════════════════════ PLAYERS
let players=[],bullets=[];
const PLAYER_R=14;

function spawnAll(){
  players=[];bullets=[];
  const spawns=[{wx:4.5*TILE,wy:4.5*TILE},{wx:45.5*TILE,wy:4.5*TILE},{wx:4.5*TILE,wy:45.5*TILE},{wx:45.5*TILE,wy:45.5*TILE},{wx:24.5*TILE,wy:24.5*TILE}];
  const allCls=['surfer','soldier','mage','tank'],bots=allCls.filter(c=>c!==selectedClass);
  while(bots.length<4)bots.push(bots[Math.floor(Math.random()*bots.length)]);
  [{cls:selectedClass,isP:true},{cls:bots[0],isP:false},{cls:bots[1],isP:false},{cls:bots[2],isP:false},{cls:bots[3],isP:false}].forEach((cfg,i)=>{
    const d=CLASSES[cfg.cls],s=spawns[i];
    players.push({wx:s.wx,wy:s.wy,vx:0,vy:0,cls:cfg.cls,isP:cfg.isP,hp:d.hp,mhp:d.hp,spd:d.spd,fr:d.fr,ammo:d.maxA,maxA:d.maxA,relT:d.relT,relCd:0,dmg:d.dmg,bspd:d.bspd,col:d.col,name:cfg.isP?'JIJ':d.name,alive:true,cd:0,inv:0,angle:Math.PI/4,frz:0,ait:0,bob:Math.random()*Math.PI*2});
  });
}

// ══════════════════════════════════════════ INPUT
const K={};
window.addEventListener('keydown',e=>{K[e.code]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();});
window.addEventListener('keyup',e=>{K[e.code]=false;});

const joy={active:false,id:-1,dx:0,dy:0};
const joyArea=document.getElementById('joystick-area');
const joyKnob=document.getElementById('joystick-knob');
const JOY_R=52;
function joyCenter(){const r=joyArea.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};}
joyArea.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];joy.active=true;joy.id=t.identifier;joy.dx=0;joy.dy=0;},{passive:false});
window.addEventListener('touchmove',e=>{e.preventDefault();if(!joy.active)return;for(const t of e.changedTouches){if(t.identifier!==joy.id)continue;const jc=joyCenter();let dx=t.clientX-jc.x,dy=t.clientY-jc.y;const d=Math.sqrt(dx*dx+dy*dy);if(d>JOY_R){dx=dx/d*JOY_R;dy=dy/d*JOY_R;}joy.dx=dx/JOY_R;joy.dy=dy/JOY_R;joyKnob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;}},{passive:false});
window.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(t.identifier===joy.id){joy.active=false;joy.dx=0;joy.dy=0;joyKnob.style.transform='translate(-50%,-50%)';}});

// AIM JOYSTICK — drag shoot button
const aim={active:false,id:-1,startX:0,startY:0,dx:0,dy:0,ready:false};
const shootBtnEl=document.getElementById('shoot-btn');
shootBtnEl.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];aim.active=true;aim.id=t.identifier;aim.startX=t.clientX;aim.startY=t.clientY;aim.dx=0;aim.dy=0;aim.ready=false;shootBtnEl.style.background='rgba(255,120,80,.5)';},{passive:false});
window.addEventListener('touchmove',e=>{if(!aim.active)return;for(const t of e.changedTouches){if(t.identifier!==aim.id)continue;const dx=t.clientX-aim.startX,dy=t.clientY-aim.startY;if(Math.sqrt(dx*dx+dy*dy)>10){aim.dx=dx;aim.dy=dy;aim.ready=true;}const max=65,cdx=Math.max(-max,Math.min(max,dx)),cdy=Math.max(-max,Math.min(max,dy));shootBtnEl.style.transform=`translate(${cdx}px,${cdy}px)`;if(players[0])players[0].angle=Math.atan2(aim.dy,aim.dx);}},{passive:false});
window.addEventListener('touchend',e=>{for(const t of e.changedTouches){if(t.identifier!==aim.id)continue;if(players.length>0){const me=players[0];if(me&&me.alive&&me.cd===0&&me.ammo>0){if(aim.ready)me.angle=Math.atan2(aim.dy,aim.dx);shoot(me);}}aim.active=false;aim.ready=false;shootBtnEl.style.transform='';shootBtnEl.style.background='rgba(255,80,50,.22)';}});

// ══════════════════════════════════════════ GAME LOOP
let running=false,fid=null,lt=0;

function update(ts){
  const dt=Math.min(ts-lt,50);lt=ts;
  if(!running){fid=requestAnimationFrame(update);return;}

  for(const p of players){
    if(!p.alive)continue;
    p.inv=Math.max(0,p.inv-1);p.cd=Math.max(0,p.cd-1);
    if(p.ammo<p.maxA){p.relCd--;if(p.relCd<=0){p.ammo=p.maxA;p.relCd=0;}}
    if(p.frz>0){p.frz--;continue;}
    p.isP?doPlayerInput(p):doBotAI(p);
    const SPD=p.spd*2.2,nx=p.wx+p.vx*SPD,ny=p.wy+p.vy*SPD;
    if(!blocked(nx,p.wy,PLAYER_R))p.wx=nx;else p.vx=0;
    if(!blocked(p.wx,ny,PLAYER_R))p.wy=ny;else p.vy=0;
    p.wx=Math.max(PLAYER_R+TILE,Math.min((GC-1)*TILE-PLAYER_R,p.wx));
    p.wy=Math.max(PLAYER_R+TILE,Math.min((GR-1)*TILE-PLAYER_R,p.wy));
    p.vx*=.78;p.vy*=.78;
  }

  const me=players[0];
  if(me&&me.alive){camX+=(me.wx-SW/2-camX)*CAM_LERP;camY+=(me.wy-SH/2-camY)*CAM_LERP;camX=Math.max(0,Math.min(GC*TILE-SW,camX));camY=Math.max(0,Math.min(GR*TILE-SH,camY));}

  updateBullets();updateIce();
  for(const p of parts){p.wx+=p.vx;p.wy+=p.vy;p.vx*=.90;p.vy*=.90;p.life--;}
  parts=parts.filter(p=>p.life>0);

  updateHUD();
  if(Math.floor(ts/50)%3===0)drawMinimap();

  const alive=players.filter(p=>p.alive);
  document.getElementById('alive-num').textContent=alive.length;
  if(alive.length<=1){running=false;const winner=alive[0];if(winner&&winner.isP)recordWin(winner.cls);setTimeout(()=>showResult(winner),700);}

  draw();fid=requestAnimationFrame(update);
}

function doPlayerInput(p){
  let dx=0,dy=0;
  if(K['ArrowLeft']||K['KeyA'])dx-=1;if(K['ArrowRight']||K['KeyD'])dx+=1;
  if(K['ArrowUp']||K['KeyW'])dy-=1;if(K['ArrowDown']||K['KeyS'])dy+=1;
  if(joy.active){dx+=joy.dx;dy+=joy.dy;}
  const len=Math.sqrt(dx*dx+dy*dy);
  if(len>0){p.vx=dx/len;p.vy=dy/len;if(!aim.active)p.angle=Math.atan2(dy,dx);}
  if(K['Space']&&p.cd===0&&p.ammo>0)shoot(p);
}

function doBotAI(p){
  let near=null,nd=Infinity;
  for(const o of players){if(!o.alive||o===p)continue;const dx=o.wx-p.wx,dy=o.wy-p.wy,d=Math.sqrt(dx*dx+dy*dy);if(d<nd){nd=d;near=o;}}
  p.ait--;
  if(p.ait<=0){p.ait=18+Math.random()*22;if(near){const dx=near.wx-p.wx,dy=near.wy-p.wy,ln=Math.sqrt(dx*dx+dy*dy)||1;p.vx=dx/ln+(Math.random()-.5)*.4;p.vy=dy/ln+(Math.random()-.5)*.4;const vl=Math.sqrt(p.vx*p.vx+p.vy*p.vy)||1;p.vx/=vl;p.vy/=vl;}}
  if(near){const dx=near.wx-p.wx,dy=near.wy-p.wy;p.angle=Math.atan2(dy,dx);if(nd<TILE*7&&p.cd===0&&p.ammo>0)shoot(p);}
}

function shoot(p){
  if(p.ammo<=0)return;
  p.cd=p.fr;p.ammo--;
  if(p.ammo===0)p.relCd=p.relT;
  const n=p.cls==='soldier'?2:1;
  for(let i=0;i<n;i++){const spread=n>1?(i-.5)*.1:0,ang=p.angle+spread;bullets.push({wx:p.wx+Math.cos(ang)*(PLAYER_R+4),wy:p.wy+Math.sin(ang)*(PLAYER_R+4),vx:Math.cos(ang)*p.bspd*2,vy:Math.sin(ang)*p.bspd*2,own:p,dmg:p.dmg,col:p.col,life:75,frz:p.cls==='mage',trail:[]});}
  if(p.isP)renderAmmo(p);
}

function updateBullets(){
  bullets=bullets.filter(b=>b.life>0);
  for(const b of bullets){
    b.trail.push({wx:b.wx,wy:b.wy});if(b.trail.length>4)b.trail.shift();
    b.wx+=b.vx;b.wy+=b.vy;b.life--;
    if(isWall(Math.floor(b.wy/TILE),Math.floor(b.wx/TILE))){spawnHitFx(b.wx,b.wy,b.col,4);b.life=0;continue;}
    if(b.wx<0||b.wx>GC*TILE||b.wy<0||b.wy>GR*TILE){b.life=0;continue;}
    for(const p of players){if(!p.alive||p===b.own||p.inv>0)continue;const dx=p.wx-b.wx,dy=p.wy-b.wy;if(Math.sqrt(dx*dx+dy*dy)<PLAYER_R+5){hurtPlayer(p,b.dmg);if(b.frz)p.frz=70;spawnHitFx(b.wx,b.wy,b.col,6);b.life=0;break;}}
  }
}

function hurtPlayer(p,dmg){if(p.inv>0)return;p.hp=Math.max(0,p.hp-dmg);p.inv=30;spawnHitFx(p.wx,p.wy,p.col,8);if(p.hp<=0)killPlayer(p);}
function killPlayer(p){p.alive=false;p.hp=0;spawnDeathFx(p.wx,p.wy,p.col);}

// ══════════════════════════════════════════ DRAW
function draw(){
  ctx.fillStyle='#d0eaf8';ctx.fillRect(0,0,SW,SH);
  const sC=Math.max(0,Math.floor(camX/TILE)-1),eC=Math.min(GC,Math.ceil((camX+SW)/TILE)+1);
  const sR=Math.max(0,Math.floor(camY/TILE)-1),eR=Math.min(GR,Math.ceil((camY+SH)/TILE)+1);

  for(let r=sR;r<eR;r++) for(let c=sC;c<eC;c++){
    const wx=c*TILE,wy=r*TILE,cell=grid[r][c],hp=iceHP[r][c],tremor=iceTremor[r][c];
    const shk=tremor>0?(Math.random()-.5)*(tremor>20?3:1.5):0;
    const{x,y}=toScreen(wx+shk,wy+shk*.5);
    if(cell===T_WALL){
      ctx.fillStyle='#2a3e5a';ctx.fillRect(x,y,TILE,TILE);
      ctx.fillStyle='#3a5272';ctx.fillRect(x+2,y+2,TILE-4,Math.floor(TILE*.5));
      ctx.fillStyle='#18283c';ctx.fillRect(x,y+TILE-5,TILE,5);
    } else if(hp<=0){
      ctx.fillStyle='#1a5080';ctx.fillRect(x,y,TILE,TILE);
      ctx.fillStyle=`rgba(60,140,210,.15)`;ctx.fillRect(x+4,y+Math.floor(TILE*.35),TILE-8,4);
    } else {
      const cols=['#90b8d4','#aacce0','#c8e0f0','#e4f4ff'];
      ctx.fillStyle=cols[4-hp]||'#e4f4ff';ctx.fillRect(x,y,TILE,TILE);
      ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(x+2,y+2,TILE-4,Math.floor(TILE*.26));
      if(hp<=3){
        ctx.strokeStyle=`rgba(50,90,130,${hp<=1?.7:hp<=2?.42:.22})`;ctx.lineWidth=hp<=1?1.5:.8;ctx.beginPath();
        ctx.moveTo(x+8,y+10);ctx.lineTo(x+22,y+20);ctx.moveTo(x+22,y+20);ctx.lineTo(x+18,y+32);
        if(hp<=2){ctx.moveTo(x+28,y+8);ctx.lineTo(x+16,y+24);ctx.moveTo(x+6,y+28);ctx.lineTo(x+14,y+16);}
        if(hp<=1){ctx.moveTo(x+2,y+2);ctx.lineTo(x+TILE-2,y+TILE-2);ctx.moveTo(x+TILE-2,y+2);ctx.lineTo(x+2,y+TILE-2);}
        ctx.stroke();
      }
      ctx.strokeStyle='rgba(130,190,220,.18)';ctx.lineWidth=.5;ctx.strokeRect(x,y,TILE,TILE);
    }
  }

  // Particles
  ctx.save();
  for(const p of parts){const{x,y}=toScreen(p.wx,p.wy);if(x<-20||x>SW+20||y<-20||y>SH+20)continue;ctx.globalAlpha=(p.life/p.ml)*.8;ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(x,y,Math.max(.5,p.sz*(p.life/p.ml)),0,Math.PI*2);ctx.fill();}
  ctx.restore();

  // Bullets
  for(const b of bullets){
    for(let i=0;i<b.trail.length;i++){const t=b.trail[i],{x,y}=toScreen(t.wx,t.wy);ctx.globalAlpha=(i/b.trail.length)*.38;ctx.fillStyle=b.col;ctx.beginPath();ctx.arc(x,y,2*(i/b.trail.length)+1,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;
    const{x,y}=toScreen(b.wx,b.wy);if(x<-10||x>SW+10||y<-10||y>SH+10)continue;
    ctx.shadowColor=b.col;ctx.shadowBlur=8;
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=b.col;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
  }
  ctx.globalAlpha=1;

  // Aim indicator
  const me=players[0];
  if(me&&me.alive&&aim.active&&aim.ready){
    const{x:px,y:py}=toScreen(me.wx,me.wy);
    ctx.save();ctx.strokeStyle=me.col;ctx.lineWidth=2;ctx.globalAlpha=.55;ctx.setLineDash([7,6]);
    ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(me.angle)*110,py+Math.sin(me.angle)*110);ctx.stroke();
    ctx.setLineDash([]);ctx.restore();
  }

  for(const p of players)if(p.alive)drawPlayer(p);
}

function drawPlayer(p){
  const{x:px,y:py}=toScreen(p.wx,p.wy);
  if(px<-40||px>SW+40||py<-40||py>SH+40)return;
  const R=PLAYER_R;
  ctx.save();
  if(p.inv>0&&Math.floor(p.inv/3)%2===0)ctx.globalAlpha=.28;
  if(p.frz>0){ctx.shadowColor='#80d0ff';ctx.shadowBlur=12;}

  // Shadow
  ctx.save();ctx.globalAlpha=(ctx.globalAlpha||1)*.15;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(px+2,py+2,R,R*.6,0,0,Math.PI*2);ctx.fill();ctx.restore();

  ctx.fillStyle=p.frz>0?'#c0e8ff':'#16162a';ctx.beginPath();ctx.arc(px,py,R,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(px,py,R*.58,0,Math.PI*2);ctx.fill();

  // Facing dot
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px+Math.cos(p.angle)*R,py+Math.sin(p.angle)*R,4,0,Math.PI*2);ctx.fill();

  // Eyes
  const ex=px+Math.cos(p.angle)*R*.42,ey=py+Math.sin(p.angle)*R*.42;
  const px2=-Math.sin(p.angle)*4,py2=Math.cos(p.angle)*4;
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex+px2,ey+py2,2.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(ex-px2,ey-py2,2.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(ex+px2+Math.cos(p.angle),ey+py2+Math.sin(p.angle),1.3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(ex-px2+Math.cos(p.angle),ey-py2+Math.sin(p.angle),1.3,0,Math.PI*2);ctx.fill();

  // HP bar
  const bw=R*2.4,bx=px-bw/2,by=py-R-10,hpP=p.hp/p.mhp;
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(bx,by,bw,5);
  ctx.fillStyle=hpP>.5?'#3ad870':hpP>.25?'#f0c040':'#f04040';ctx.fillRect(bx,by,bw*hpP,5);

  ctx.font='700 10px Segoe UI';ctx.textAlign='center';
  if(p.isP){ctx.fillStyle=p.col;ctx.fillText('YOU',px,py-R-14);}
  else{ctx.font='12px serif';ctx.fillText({soldier:'🪖',mage:'🧊',tank:'🛡️'}[p.cls]||'🐧',px,py-R-14);}

  if(p.frz>0){ctx.fillStyle='rgba(110,195,255,.2)';ctx.beginPath();ctx.arc(px,py,R+4,0,Math.PI*2);ctx.fill();}
  ctx.shadowBlur=0;ctx.restore();
}

// ══════════════════════════════════════════ MINIMAP
function drawMinimap(){
  const S=92;mmx.clearRect(0,0,S,S);const sc=S/GC;
  for(let r=0;r<GR;r++) for(let c=0;c<GC;c++){
    const cell=grid[r][c],hp=iceHP[r][c];
    mmx.fillStyle=cell===T_WALL?'#2a3e5a':hp<=0?'#1a5080':hp<=2?'#7aaac4':hp<=3?'#98c0d8':'#c0dcea';
    mmx.fillRect(c*sc,r*sc,sc,sc);
  }
  for(const p of players){if(!p.alive)continue;mmx.fillStyle=p.col;mmx.beginPath();mmx.arc(p.wx/TILE*sc,p.wy/TILE*sc,p.isP?3:2,0,Math.PI*2);mmx.fill();}
  const vx=(camX/TILE)*sc,vy=(camY/TILE)*sc,vw=(SW/TILE)*sc,vh=(SH/TILE)*sc;
  mmx.strokeStyle='rgba(255,255,255,.35)';mmx.lineWidth=1;mmx.strokeRect(vx,vy,vw,vh);
}

// ══════════════════════════════════════════ HUD
function renderAmmo(p){const wrap=document.getElementById('ammo-dots');wrap.innerHTML='';for(let i=0;i<p.maxA;i++){const d=document.createElement('div');d.className='ammo-dot'+(i>=p.ammo?' empty':'');wrap.appendChild(d);}}

function updateHUD(){
  const me=players[0];if(!me)return;
  const hpP=me.hp/me.mhp;
  const icons={surfer:'🏄',soldier:'🪖',mage:'🧊',tank:'🛡️'};
  document.getElementById('my-hp-name').textContent=(icons[me.cls]||'🐧')+' '+me.name.toUpperCase()+' — JIJ';
  document.getElementById('my-hp-name').style.color=me.col;
  document.getElementById('my-hp-bar').style.width=(hpP*100)+'%';
  document.getElementById('my-hp-bar').style.background=hpP>.5?'linear-gradient(90deg,#3ad870,#5ac8fa)':hpP>.25?'linear-gradient(90deg,#f0c040,#e08020)':'linear-gradient(90deg,#f04040,#c02020)';
  const reloadSec=me.ammo===0?` — HERLADEN (${Math.ceil(me.relCd/60)}s)`:'';
  document.getElementById('my-hp-text').textContent=Math.ceil(me.hp)+' / '+me.mhp+' HP'+reloadSec;
  renderAmmo(me);
  const bc=document.getElementById('bot-cards');
  if(!bc.children.length){players.slice(1).forEach((p,i)=>{const d=document.createElement('div');d.className='bot-card';d.id='bc'+i;d.innerHTML=`<div class="bot-dot" style="background:${p.col}"></div><div class="bot-info"><div class="bot-name">${p.name}</div><div class="bot-bar-bg"><div class="bot-bar-fill" id="bbf${i}" style="width:100%;background:${p.col}"></div></div></div>`;bc.appendChild(d);});}
  players.slice(1).forEach((p,i)=>{const f=document.getElementById('bbf'+i),c=document.getElementById('bc'+i);if(f)f.style.width=(p.hp/p.mhp*100)+'%';if(c)c.classList.toggle('dead',!p.alive);});
}

// ══════════════════════════════════════════ RESULT + START
function showResult(winner){
  document.getElementById('overlay').style.display='flex';
  const rt=document.getElementById('result-text');
  if(!winner)rt.innerHTML='<span class="lose">💀 Gelijkspel!</span>';
  else if(winner.isP)rt.innerHTML='<span class="win">🏆 JIJ WINT! Win opgeslagen ✓</span>';
  else rt.innerHTML=`<span class="lose">💀 ${winner.name} won.</span>`;
  document.getElementById('play-btn').textContent='▶ OPNIEUW';
}

document.getElementById('play-btn').addEventListener('click',()=>{
  document.getElementById('overlay').style.display='none';
  document.getElementById('result-text').innerHTML='';
  document.getElementById('bot-cards').innerHTML='';
  document.getElementById('profile-panel').style.display='none';
  initGrid();spawnAll();initIce();
  const me=players[0];camX=me.wx-SW/2;camY=me.wy-SH/2;
  renderAmmo(me);running=true;
  if(fid)cancelAnimationFrame(fid);
  lt=performance.now();fid=requestAnimationFrame(update);
});
