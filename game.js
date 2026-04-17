// ══════════════════════════════════════════
//  PENGUIN MAYHEM — game.js
//  Mountain system + Snowball Fight mode
// ══════════════════════════════════════════

const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
const mmc=document.getElementById('minimap'),mmx=mmc.getContext('2d');
let SW=window.innerWidth,SH=window.innerHeight;
canvas.width=SW;canvas.height=SH;
window.addEventListener('resize',()=>{SW=window.innerWidth;SH=window.innerHeight;canvas.width=SW;canvas.height=SH;});

const isMobile=('ontouchstart' in window)||navigator.maxTouchPoints>0;
if(isMobile){
  document.getElementById('joystick-area').style.display='block';
  document.getElementById('shoot-btn').style.display='flex';
  document.getElementById('ammo-wrap').style.bottom='220px';
  document.getElementById('kb-hint').style.display='none';
  if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});
}

// ══════════════════════════════════════════
//  MOUNTAIN SYSTEM
// ══════════════════════════════════════════
const MODES=['showdown','snowball'];
const ZONES=[
  {name:'Base Camp',   min:0,   max:10,  col:'#3a7a5a', icon:'⛺'},
  {name:'Snow Trail',  min:10,  max:25,  col:'#4a8aaa', icon:'🏔️'},
  {name:'Ice Ridge',   min:25,  max:50,  col:'#5a9aba', icon:'🧊'},
  {name:'Blizzard Peak',min:50, max:75,  col:'#6aaada', icon:'🌨️'},
  {name:'Summit',      min:75,  max:100, col:'#80c0f0', icon:'🏁'},
  {name:'Above Clouds',min:100, max:999, col:'#a0d8ff', icon:'✨'},
];
const CLS=['surfer','soldier','mage','tank'];

function getZone(km){
  for(let i=ZONES.length-1;i>=0;i--) if(km>=ZONES[i].min) return ZONES[i];
  return ZONES[0];
}

function getMountainKm(mode){
  if(!currentUser||!currentUser.mountains)return 0;
  const m=currentUser.mountains[mode];
  if(!m)return 0;
  return CLS.reduce((sum,c)=>sum+(m[c]||0),0);
}

function getMountainKmPerChar(mode,cls){
  if(!currentUser||!currentUser.mountains)return 0;
  return (currentUser.mountains?.[mode]?.[cls])||0;
}

function addMountainKm(mode,cls,km){
  if(!currentUser)return;
  if(!currentUser.mountains)currentUser.mountains={};
  if(!currentUser.mountains[mode])currentUser.mountains[mode]={};
  const cur=currentUser.mountains[mode][cls]||0;
  currentUser.mountains[mode][cls]=Math.max(0,cur+km);
  saveCurrentUser();
  updateMountainDisplay();
  updateCharKmDisplay();
}

function updateMountainDisplay(){
  MODES.forEach(mode=>{
    const km=getMountainKm(mode);
    const zone=getZone(km);
    const label=`${zone.icon} ${zone.name} — ${km.toFixed(1)} km`;
    // popup labels
    const mpm=document.getElementById('mpm-'+mode);
    if(mpm)mpm.textContent=label;
  });
  // Update current mode label in menu button
  const modeNames={showdown:'⚔️ Showdown',snowball:'❄️ Snowball Fight'};
  const lbl=document.getElementById('current-mode-label');
  if(lbl)lbl.textContent=modeNames[selectedMode]||selectedMode;
}

function updateCharKmDisplay(){
  CLS.forEach(cls=>{
    const el=document.getElementById('ckm-'+cls);
    if(!el)return;
    const km=getMountainKmPerChar(selectedMode,cls);
    const zone=getZone(km);
    el.textContent=`${zone.icon} ${km.toFixed(1)} km`;
  });
}

function updateProfileMountains(){
  const el=document.getElementById('profile-mountains');
  if(!el)return;
  el.innerHTML=MODES.map(mode=>{
    const totalKm=getMountainKm(mode);
    const zone=getZone(totalKm);
    const pct=Math.min(100,(totalKm/100)*100);
    const charKms=CLS.map(c=>{
      const km=getMountainKmPerChar(mode,c);
      return `<span class="pm-char">${{surfer:'🏄',soldier:'🪖',mage:'🧊',tank:'🛡️'}[c]} ${km.toFixed(1)}km</span>`;
    }).join('');
    return `<div class="pm-row">
      <div class="pm-header">
        <span class="pm-mode">${mode==='showdown'?'⚔️ Showdown':'❄️ Snowball'}</span>
        <span class="pm-zone" style="color:${zone.col}">${zone.icon} ${zone.name}</span>
        <span class="pm-km">${totalKm.toFixed(1)} km</span>
      </div>
      <div class="pm-bar-bg"><div class="pm-bar-fill" style="width:${pct}%;background:${zone.col}"></div></div>
      <div class="pm-chars">${charKms}</div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════
//  ACCOUNTS
// ══════════════════════════════════════════
let currentUser=null;
function loadUsers(){try{return JSON.parse(localStorage.getItem('pm_users')||'{}')}catch{return {};}}
function saveUsers(u){try{localStorage.setItem('pm_users',JSON.stringify(u));}catch{}}
function loadCurrentUser(){const n=localStorage.getItem('pm_current');if(!n)return null;return loadUsers()[n]||null;}
function saveCurrentUser(){if(!currentUser)return;const u=loadUsers();u[currentUser.username]=currentUser;saveUsers(u);localStorage.setItem('pm_current',currentUser.username);}
function recordWin(cls){
  if(!currentUser)return;
  currentUser.wins[cls]=(currentUser.wins[cls]||0)+1;
  const streak=(currentUser.streak||0)+1;
  currentUser.streak=streak;
  const bonus=streak>=3?0.5:0;
  addMountainKm(selectedMode,cls,1+bonus);
  saveCurrentUser();updateProfileUI();
}
function recordLoss(cls){
  if(!currentUser)return;
  currentUser.streak=0;
  addMountainKm(selectedMode,cls,-0.5);
  saveCurrentUser();
}

function showAuthScreen(){document.getElementById('auth-screen').style.display='flex';document.getElementById('overlay').style.display='none';document.getElementById('profile-btn').style.display='none';}
function showMainMenu(){
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('overlay').style.display='flex';
  document.getElementById('profile-btn').style.display='flex';
  document.getElementById('profile-panel').style.display='none';
  document.getElementById('result-overlay').style.display='none';
  document.getElementById('exit-btn').style.display='none';
  document.getElementById('mode-popup').style.display='none';
  updateProfileUI();updateMountainDisplay();updateCharKmDisplay();
}
function updateProfileUI(){
  if(!currentUser)return;
  document.getElementById('profile-username').textContent=currentUser.username;
  document.getElementById('profile-btn-label').textContent=currentUser.username.slice(0,8);
  const icons={surfer:'🏄',soldier:'🪖',mage:'🧊',tank:'🛡️'};
  const names={surfer:'Surfer',soldier:'Soldier',mage:'Ice Mage',tank:'Tank'};
  document.getElementById('profile-wins').innerHTML=CLS.map(c=>`<div class="pw-row"><span class="pw-icon">${icons[c]}</span><span class="pw-name">${names[c]}</span><span class="pw-count">${currentUser.wins[c]||0} wins</span></div>`).join('');
  updateProfileMountains();
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
    users[username]={username,password,wins:{},mountains:{},streak:0};saveUsers(users);currentUser=users[username];
  } else {
    if(!users[username]){errEl.textContent='Account niet gevonden!';return;}
    if(users[username].password!==password){errEl.textContent='Verkeerd wachtwoord!';return;}
    currentUser=users[username];
    if(!currentUser.mountains)currentUser.mountains={};
    if(currentUser.streak===undefined)currentUser.streak=0;
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
document.getElementById('profile-btn').addEventListener('click',()=>{const p=document.getElementById('profile-panel');p.style.display=p.style.display==='flex'?'none':'flex';updateProfileMountains();});
document.getElementById('profile-close').addEventListener('click',()=>{document.getElementById('profile-panel').style.display='none';});
currentUser=loadCurrentUser();
if(currentUser){if(!currentUser.mountains)currentUser.mountains={};if(currentUser.streak===undefined)currentUser.streak=0;showMainMenu();}else showAuthScreen();

// ══════════════════════════════════════════
//  GAMEMODE + CHARACTER SELECT
// ══════════════════════════════════════════
let selectedMode='showdown';
let selectedClass='surfer';

// ── GAMEMODE POPUP
document.getElementById('open-modes-btn').addEventListener('click',()=>{
  document.getElementById('mode-popup').style.display='flex';
  updateMountainDisplay();
});
document.getElementById('mode-popup-close').addEventListener('click',()=>{
  document.getElementById('mode-popup').style.display='none';
});
document.querySelectorAll('.mode-popup-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.mode-popup-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    selectedMode=btn.dataset.mode;
    updateCharKmDisplay();
    const modeNames={showdown:'⚔️ Showdown',snowball:'❄️ Snowball Fight'};
    const lbl=document.getElementById('current-mode-label');
    if(lbl)lbl.textContent=modeNames[selectedMode]||selectedMode;
    document.getElementById('mode-popup').style.display='none';
  });
});
document.querySelectorAll('.char-card').forEach(card=>{
  card.addEventListener('click',()=>{
    document.querySelectorAll('.char-card').forEach(c=>c.classList.remove('selected'));
    card.classList.add('selected');
    selectedClass=card.dataset.cls;
  });
});

// ══════════════════════════════════════════
//  MAP CONFIG
// ══════════════════════════════════════════
const TILE=72,GR=50,GC=50,CAM_LERP=0.12;
let camX=0,camY=0;
const T_FLOOR=0,T_WALL=1,T_ICE=2;
let grid=[],iceHP=[],iceTremor=[];
// Snowball: paint layer per tile — 0=neutral, 1=blue(player), 2=red(bots)
let paintGrid=[];

function toScreen(wx,wy){return{x:Math.round(wx-camX),y:Math.round(wy-camY)};}

function initGrid(){
  grid=[];iceHP=[];iceTremor=[];paintGrid=[];
  for(let r=0;r<GR;r++){grid[r]=[];iceHP[r]=[];iceTremor[r]=[];paintGrid[r]=[];
    for(let c=0;c<GC;c++){const wall=r===0||r===GR-1||c===0||c===GC-1;grid[r][c]=wall?T_WALL:T_FLOOR;iceHP[r][c]=4;iceTremor[r][c]=0;paintGrid[r][c]=0;}}
  for(let r=1;r<GR-1;r++) for(let c=1;c<GC-1;c++) if(Math.random()<.14)grid[r][c]=T_ICE;
  const walls=[{r:23,c:23},{r:23,c:24},{r:23,c:25},{r:24,c:23},{r:25,c:23},{r:25,c:24},{r:25,c:25},{r:7,c:8},{r:7,c:9},{r:8,c:9},{r:9,c:9},{r:7,c:18},{r:7,c:19},{r:8,c:18},{r:9,c:18},{r:7,c:30},{r:7,c:31},{r:8,c:31},{r:9,c:31},{r:7,c:40},{r:7,c:41},{r:8,c:41},{r:9,c:41},{r:40,c:8},{r:40,c:9},{r:41,c:9},{r:42,c:9},{r:40,c:18},{r:40,c:19},{r:41,c:18},{r:42,c:18},{r:40,c:30},{r:40,c:31},{r:41,c:31},{r:42,c:31},{r:40,c:40},{r:40,c:41},{r:41,c:41},{r:42,c:41},{r:16,c:12},{r:17,c:12},{r:18,c:12},{r:18,c:13},{r:16,c:36},{r:17,c:36},{r:18,c:36},{r:18,c:37},{r:31,c:12},{r:32,c:12},{r:33,c:12},{r:31,c:13},{r:31,c:36},{r:32,c:36},{r:33,c:36},{r:33,c:37},{r:23,c:10},{r:24,c:10},{r:25,c:10},{r:23,c:38},{r:24,c:38},{r:25,c:38},{r:10,c:23},{r:10,c:24},{r:10,c:25},{r:38,c:23},{r:38,c:24},{r:38,c:25}];
  walls.forEach(({r,c})=>{if(r>0&&r<GR-1&&c>0&&c<GC-1)grid[r][c]=T_WALL;});
  [{r:4,c:4},{r:4,c:45},{r:45,c:4},{r:45,c:45},{r:24,c:24}].forEach(({r,c})=>{for(let dr=-3;dr<=3;dr++)for(let dc=-3;dc<=3;dc++){const nr=r+dr,nc=c+dc;if(nr>0&&nr<GR-1&&nc>0&&nc<GC-1){grid[nr][nc]=T_FLOOR;iceHP[nr][nc]=4;}}});
}
function isWall(r,c){if(r<0||r>=GR||c<0||c>=GC)return true;return grid[r][c]===T_WALL;}
function blocked(wx,wy,rad=12){for(const{dx,dy}of[{dx:-rad,dy:-rad},{dx:rad,dy:-rad},{dx:-rad,dy:rad},{dx:rad,dy:rad}])if(isWall(Math.floor((wy+dy)/TILE),Math.floor((wx+dx)/TILE)))return true;return false;}

// ══════════════════════════════════════════
//  ICE BREAKING
// ══════════════════════════════════════════
let iceTimer=0,iceRing=1,icePhase=0,icePhaseTimer=0;
const ICE_GRACE=60*14,ICE_TREMOR_DUR=60*3,ICE_BREAK_DUR=60*1,ICE_NEXT_RING=60*5,ICE_RING_MAX=Math.floor(GR/2)-2;
function initIce(){iceTimer=0;iceRing=1;icePhase=0;icePhaseTimer=ICE_GRACE;}
function updateIce(){
  if(selectedMode==='snowball')return; // no ice breaking in snowball
  iceTimer++;icePhaseTimer--;
  for(let r=0;r<GR;r++) for(let c=0;c<GC;c++) if(iceTremor[r][c]>0)iceTremor[r][c]--;
  if(icePhaseTimer<=0){
    if(icePhase===0){icePhase=1;icePhaseTimer=ICE_TREMOR_DUR;setRingTremor(iceRing);}
    else if(icePhase===1){icePhase=2;icePhaseTimer=ICE_BREAK_DUR;breakRing(iceRing);}
    else{iceRing++;if(iceRing<=ICE_RING_MAX){icePhase=0;icePhaseTimer=ICE_NEXT_RING;}else icePhase=99;}
  }
  for(const p of players){
    if(!p.alive)continue;
    const tr=Math.floor(p.wy/TILE),tc=Math.floor(p.wx/TILE);
    if(tr<0||tr>=GR||tc<0||tc>=GC)continue;
    const inW=iceHP[tr][tc]<=0&&grid[tr][tc]!==T_WALL;
    if(inW){if(!p.inWater){p.inWater=true;p.stunTimer=120;spawnSplash(p.wx,p.wy);}p.vx*=.5;p.vy*=.5;if(p.stunTimer<=0)hurtPlayer(p,.8);}else{p.inWater=false;}
    if(p.stunTimer>0)p.stunTimer--;
  }
}
function setRingTremor(ring){for(let r=ring;r<GR-ring;r++) for(let c=ring;c<GC-ring;c++) if(r===ring||r===GR-1-ring||c===ring||c===GC-1-ring) if(grid[r][c]!==T_WALL&&iceHP[r][c]>0)iceTremor[r][c]=ICE_TREMOR_DUR;}
function breakRing(ring){for(let r=ring;r<GR-ring;r++) for(let c=ring;c<GC-ring;c++) if(r===ring||r===GR-1-ring||c===ring||c===GC-1-ring) if(grid[r][c]!==T_WALL&&iceHP[r][c]>0){iceHP[r][c]=0;iceTremor[r][c]=0;spawnIceFx(r,c);}}

// ══════════════════════════════════════════
//  SNOWBALL MODE
// ══════════════════════════════════════════
let sbTimer=0;
const SB_DURATION=60*90; // 90 seconds

function initSnowball(){sbTimer=SB_DURATION;paintGrid.forEach(r=>r.fill(0));}

function paintTile(wx,wy,team){
  const r=Math.floor(wy/TILE),c=Math.floor(wx/TILE);
  if(r<0||r>=GR||c<0||c>=GC||grid[r][c]===T_WALL)return;
  paintGrid[r][c]=team; // 1=blue(player), 2=red(bot)
}

function getScores(){
  let blue=0,red=0,total=0;
  for(let r=0;r<GR;r++) for(let c=0;c<GC;c++){
    if(grid[r][c]===T_WALL)continue;
    total++;
    if(paintGrid[r][c]===1)blue++;
    else if(paintGrid[r][c]===2)red++;
  }
  return{blue,red,total,bluePct:Math.round(blue/total*100),redPct:Math.round(red/total*100)};
}

function updateSnowball(){
  if(selectedMode!=='snowball')return;
  sbTimer--;
  if(sbTimer<=0){
    running=false;
    const{bluePct,redPct}=getScores();
    const won=bluePct>redPct;
    if(won)recordWin(selectedClass);else recordLoss(selectedClass);
    setTimeout(()=>showResult(won?players[0]:players[1]),500);
    return;
  }
  // Paint tiles under players
  for(const p of players){
    if(!p.alive)continue;
    paintTile(p.wx,p.wy,p.isP?1:2);
  }
  // Snowball bullets paint on hit
  // (handled in updateBullets via paintOnHit flag)
  updateScoreHUD();
}

function updateScoreHUD(){
  const{bluePct,redPct}=getScores();
  document.getElementById('sb-blue-score').textContent=`🔵 ${bluePct}%`;
  document.getElementById('sb-red-score').textContent=`🔴 ${redPct}%`;
  // Countdown
  const sec=Math.ceil(sbTimer/60);
  document.getElementById('alive-num').textContent=sec;
  document.getElementById('alive-lbl').textContent='sec';
}

// ══════════════════════════════════════════
//  PARTICLES
// ══════════════════════════════════════════
let parts=[];
function spawnHitFx(wx,wy,col,n=5){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=1.5+Math.random()*3;parts.push({wx,wy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:10+Math.random()*8,ml:18,sz:2+Math.random()*3,col});}}
function spawnDeathFx(wx,wy,col){for(let i=0;i<20;i++)parts.push({wx:wx+(Math.random()-.5)*20,wy:wy+(Math.random()-.5)*20,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:22+Math.random()*18,ml:40,sz:3+Math.random()*6,col});}
function spawnIceFx(r,c){const wx=(c+.5)*TILE,wy=(r+.5)*TILE;for(let i=0;i<10;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*4;parts.push({wx:wx+(Math.random()-.5)*TILE*.6,wy:wy+(Math.random()-.5)*TILE*.6,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:20+Math.random()*20,ml:40,sz:4+Math.random()*6,col:'#d0eeff'});}}
function spawnSplash(wx,wy){for(let i=0;i<16;i++){const a=(i/16)*Math.PI*2,s=2+Math.random()*3;parts.push({wx,wy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:22+Math.random()*18,ml:40,sz:3+Math.random()*5,col:i%2===0?'#5ac8fa':'#90d8f8'});}for(let i=0;i<8;i++){const a=(i/8)*Math.PI*2;parts.push({wx,wy,vx:Math.cos(a)*4,vy:Math.sin(a)*4-5,life:30,ml:30,sz:5,col:'#b0e8ff',gravity:.3});}}
function spawnSnowballFx(wx,wy,col){for(let i=0;i<8;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*3;parts.push({wx,wy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:15+Math.random()*10,ml:25,sz:4+Math.random()*4,col});}}

// ══════════════════════════════════════════
//  CLASSES
// ══════════════════════════════════════════
const CLASSES={
  surfer: {col:'#5ac8fa',hp:85, spd:2.2,fr:28,maxA:6,relT:120,dmg:14,bspd:7,name:'Surfer'},
  soldier:{col:'#ff9a5a',hp:95, spd:1.8,fr:20,maxA:8,relT:90, dmg:18,bspd:8,name:'Soldier'},
  mage:   {col:'#a080f8',hp:70, spd:1.6,fr:38,maxA:4,relT:150,dmg:24,bspd:6,name:'Ice Mage'},
  tank:   {col:'#f0c040',hp:180,spd:1.2,fr:55,maxA:3,relT:180,dmg:28,bspd:5.5,name:'Tank'},
};

// ══════════════════════════════════════════
//  PLAYERS & BULLETS
// ══════════════════════════════════════════
let players=[],bullets=[];
const PLAYER_R=14;

function spawnAll(){
  players=[];bullets=[];
  const spawns=[{wx:4.5*TILE,wy:4.5*TILE},{wx:45.5*TILE,wy:4.5*TILE},{wx:4.5*TILE,wy:45.5*TILE},{wx:45.5*TILE,wy:45.5*TILE},{wx:24.5*TILE,wy:24.5*TILE}];
  const allCls=CLS.filter(c=>c!==selectedClass);
  while(allCls.length<4)allCls.push(allCls[Math.floor(Math.random()*allCls.length)]);
  [{cls:selectedClass,isP:true},{cls:allCls[0],isP:false},{cls:allCls[1],isP:false},{cls:allCls[2],isP:false},{cls:allCls[3],isP:false}].forEach((cfg,i)=>{
    const d=CLASSES[cfg.cls],s=spawns[i];
    // In snowball: player is blue team (isP), bots are red team
    // Respawn in snowball mode
    players.push({wx:s.wx,wy:s.wy,vx:0,vy:0,cls:cfg.cls,isP:cfg.isP,hp:d.hp,mhp:d.hp,spd:d.spd,fr:d.fr,ammo:d.maxA,maxA:d.maxA,relT:d.relT,relCd:0,dmg:d.dmg,bspd:d.bspd,col:cfg.isP?'#5ac8fa':(d.col),sbCol:cfg.isP?'#3a80f0':'#e04040',name:cfg.isP?'JIJ':d.name,alive:true,cd:0,inv:0,angle:Math.PI/4,frz:0,ait:0,bob:Math.random()*Math.PI*2,inWater:false,stunTimer:0,reloadSlots:[],respawnTimer:0});
  });
}

// ══════════════════════════════════════════
//  INPUT
// ══════════════════════════════════════════
const K={};
window.addEventListener('keydown',e=>{K[e.code]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();});
window.addEventListener('keyup',e=>{K[e.code]=false;});

const joy={active:false,id:-1,dx:0,dy:0};
const joyArea=document.getElementById('joystick-area'),joyKnob=document.getElementById('joystick-knob');
const JOY_R=52;
function joyCenter(){const r=joyArea.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};}
joyArea.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];joy.active=true;joy.id=t.identifier;joy.dx=0;joy.dy=0;},{passive:false});
window.addEventListener('touchmove',e=>{e.preventDefault();if(!joy.active)return;for(const t of e.changedTouches){if(t.identifier!==joy.id)continue;const jc=joyCenter();let dx=t.clientX-jc.x,dy=t.clientY-jc.y;const d=Math.sqrt(dx*dx+dy*dy);if(d>JOY_R){dx=dx/d*JOY_R;dy=dy/d*JOY_R;}joy.dx=dx/JOY_R;joy.dy=dy/JOY_R;joyKnob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;}},{passive:false});
window.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(t.identifier===joy.id){joy.active=false;joy.dx=0;joy.dy=0;joyKnob.style.transform='translate(-50%,-50%)';}});

const aim={active:false,id:-1,startX:0,startY:0,dx:0,dy:0,ready:false};
const shootBtnEl=document.getElementById('shoot-btn');
shootBtnEl.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];aim.active=true;aim.id=t.identifier;aim.startX=t.clientX;aim.startY=t.clientY;aim.dx=0;aim.dy=0;aim.ready=false;shootBtnEl.style.background='rgba(255,120,80,.5)';},{passive:false});
window.addEventListener('touchmove',e=>{if(!aim.active)return;for(const t of e.changedTouches){if(t.identifier!==aim.id)continue;const dx=t.clientX-aim.startX,dy=t.clientY-aim.startY;if(Math.sqrt(dx*dx+dy*dy)>10){aim.dx=dx;aim.dy=dy;aim.ready=true;}const max=65,cdx=Math.max(-max,Math.min(max,dx)),cdy=Math.max(-max,Math.min(max,dy));shootBtnEl.style.transform=`translate(${cdx}px,${cdy}px)`;if(players[0])players[0].angle=Math.atan2(aim.dy,aim.dx);}},{passive:false});
window.addEventListener('touchend',e=>{for(const t of e.changedTouches){if(t.identifier!==aim.id)continue;if(players.length>0){const me=players[0];if(me&&me.alive&&me.cd===0&&me.ammo>0){if(aim.ready)me.angle=Math.atan2(aim.dy,aim.dx);shoot(me);}}aim.active=false;aim.ready=false;shootBtnEl.style.transform='';shootBtnEl.style.background='rgba(255,80,50,.22)';}});

// ══════════════════════════════════════════
//  GAME LOOP
// ══════════════════════════════════════════
let running=false,fid=null,lt=0;

function update(ts){
  const dt=Math.min(ts-lt,50);lt=ts;
  if(!running){fid=requestAnimationFrame(update);return;}

  for(const p of players){
    // Snowball respawn
    if(!p.alive&&selectedMode==='snowball'){
      p.respawnTimer--;
      if(p.respawnTimer<=0){
        p.alive=true;p.hp=p.mhp;p.inWater=false;p.stunTimer=0;
        // Respawn at own base
        const sp=p.isP?{wx:4.5*TILE,wy:4.5*TILE}:{wx:45.5*TILE,wy:45.5*TILE};
        p.wx=sp.wx;p.wy=sp.wy;
      }
      continue;
    }
    if(!p.alive)continue;
    p.inv=Math.max(0,p.inv-1);p.cd=Math.max(0,p.cd-1);
    if(!p.reloadSlots)p.reloadSlots=[];
    p.reloadSlots=p.reloadSlots.map(t=>t-1);
    const reloaded=p.reloadSlots.filter(t=>t<=0).length;
    if(reloaded>0){p.ammo=Math.min(p.maxA,p.ammo+reloaded);p.reloadSlots=p.reloadSlots.filter(t=>t>0);if(p.isP)renderAmmo(p);}
    if(p.frz>0||p.stunTimer>0){p.frz=Math.max(0,p.frz-1);continue;}
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

  updateBullets();updateIce();updateSnowball();

  for(const p of parts){p.wx+=p.vx;p.wy+=p.vy;if(p.gravity)p.vy+=p.gravity;p.vx*=.90;if(!p.gravity)p.vy*=.90;p.life--;}
  parts=parts.filter(p=>p.life>0);

  updateHUD();
  if(Math.floor(ts/50)%3===0)drawMinimap();

  if(selectedMode==='showdown'){
    const alive=players.filter(p=>p.alive);
    document.getElementById('alive-num').textContent=alive.length;
    if(alive.length<=1){
      running=false;
      const winner=alive[0];
      if(winner&&winner.isP){recordWin(selectedClass);}
      else{recordLoss(selectedClass);}
      setTimeout(()=>showResult(winner),700);
    }
  }

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
  // In snowball: bots try to go to unpainted areas too
  for(const o of players){if(!o.alive||o===p||o.isP===p.isP)continue;const dx=o.wx-p.wx,dy=o.wy-p.wy,d=Math.sqrt(dx*dx+dy*dy);if(d<nd){nd=d;near=o;}}
  p.ait--;
  if(p.ait<=0){
    p.ait=35+Math.random()*45;
    if(near){const dx=near.wx-p.wx,dy=near.wy-p.wy,ln=Math.sqrt(dx*dx+dy*dy)||1;p.vx=dx/ln+(Math.random()-.5)*1.2;p.vy=dy/ln+(Math.random()-.5)*1.2;const vl=Math.sqrt(p.vx*p.vx+p.vy*p.vy)||1;p.vx/=vl;p.vy/=vl;}
  }
  if(near){const dx=near.wx-p.wx,dy=near.wy-p.wy;p.angle=Math.atan2(dy,dx)+(Math.random()-.5)*.5;if(nd<TILE*4&&p.cd===0&&p.ammo>0&&Math.random()<.6)shoot(p);}
}

function shoot(p){
  if(p.ammo<=0)return;
  p.cd=p.fr;p.ammo--;
  if(!p.reloadSlots)p.reloadSlots=[];
  p.reloadSlots.push(p.relT);
  const n=p.cls==='soldier'?2:1;
  // In snowball: bullets are snowballs that paint tiles
  const isSnow=selectedMode==='snowball';
  const team=p.isP?1:2;
  for(let i=0;i<n;i++){
    const spread=n>1?(i-.5)*.1:0,ang=p.angle+spread;
    bullets.push({wx:p.wx+Math.cos(ang)*(PLAYER_R+4),wy:p.wy+Math.sin(ang)*(PLAYER_R+4),vx:Math.cos(ang)*p.bspd*2,vy:Math.sin(ang)*p.bspd*2,own:p,dmg:isSnow?0:p.dmg,col:isSnow?(p.isP?'#3a80f0':'#e04040'):p.col,life:75,frz:p.cls==='mage'&&!isSnow,trail:[],snow:isSnow,team});
  }
  if(p.isP)renderAmmo(p);
}

function updateBullets(){
  bullets=bullets.filter(b=>b.life>0);
  for(const b of bullets){
    b.trail.push({wx:b.wx,wy:b.wy});if(b.trail.length>4)b.trail.shift();
    b.wx+=b.vx;b.wy+=b.vy;b.life--;
    const tr=Math.floor(b.wy/TILE),tc=Math.floor(b.wx/TILE);
    if(isWall(tr,tc)){
      if(b.snow){paintTile(b.wx,b.wy,b.team);spawnSnowballFx(b.wx,b.wy,b.col);}
      else spawnHitFx(b.wx,b.wy,b.col,4);
      b.life=0;continue;
    }
    if(b.wx<0||b.wx>GC*TILE||b.wy<0||b.wy>GR*TILE){b.life=0;continue;}
    // Paint 3x3 area for snowballs in flight (continuous painting)
    if(b.snow) paintTile(b.wx,b.wy,b.team);
    for(const p of players){
      if(!p.alive||p===b.own||p.inv>0)continue;
      if(b.snow&&p.isP===b.own.isP)continue; // don't hit teammates in snowball
      const dx=p.wx-b.wx,dy=p.wy-b.wy;
      if(Math.sqrt(dx*dx+dy*dy)<PLAYER_R+5){
        if(b.snow){
          // Snowball hit: paint big splat, respawn in snowball mode
          for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) paintTile(b.wx+dc*TILE,b.wy+dr*TILE,b.team);
          spawnSnowballFx(b.wx,b.wy,b.col);
          hurtPlayer(p,25);
        } else {
          hurtPlayer(p,b.dmg);
          if(b.frz)p.frz=70;
          spawnHitFx(b.wx,b.wy,b.col,6);
        }
        b.life=0;break;
      }
    }
  }
}

function hurtPlayer(p,dmg){
  if(p.inv>0)return;p.hp=Math.max(0,p.hp-dmg);p.inv=30;
  spawnHitFx(p.wx,p.wy,p.col,8);
  if(p.hp<=0)killPlayer(p);
}
function killPlayer(p){
  p.alive=false;p.hp=0;
  spawnDeathFx(p.wx,p.wy,p.col);
  if(selectedMode==='snowball')p.respawnTimer=180; // 3s respawn
}

// ══════════════════════════════════════════
//  DRAW
// ══════════════════════════════════════════
const PAINT_BLUE='rgba(40,100,220,0.35)';
const PAINT_RED ='rgba(220,40,40,0.35)';

function draw(){
  ctx.fillStyle='#060e1e';ctx.fillRect(0,0,SW,SH);
  const sC=Math.max(0,Math.floor(camX/TILE)-1),eC=Math.min(GC,Math.ceil((camX+SW)/TILE)+1);
  const sR=Math.max(0,Math.floor(camY/TILE)-1),eR=Math.min(GR,Math.ceil((camY+SH)/TILE)+1);
  const wt=Date.now()*.001;

  for(let r=sR;r<eR;r++) for(let c=sC;c<eC;c++){
    const wx=c*TILE,wy=r*TILE,cell=grid[r][c],hp=iceHP[r][c],tremor=iceTremor[r][c];
    const shk=tremor>0?(Math.random()-.5)*(tremor>ICE_TREMOR_DUR*.5?4:2):0;
    const{x,y}=toScreen(wx+shk,wy+shk*.5);
    if(cell===T_WALL){
      ctx.fillStyle='#2a3e5a';ctx.fillRect(x,y,TILE,TILE);
      ctx.fillStyle='#3a5272';ctx.fillRect(x+2,y+2,TILE-4,Math.floor(TILE*.48));
      ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(x+2,y+2,TILE-4,5);
      ctx.fillStyle='#18283c';ctx.fillRect(x,y+TILE-5,TILE,5);
      ctx.strokeStyle='#1a2a3e';ctx.lineWidth=1;ctx.strokeRect(x,y,TILE,TILE);
    } else if(hp<=0){
      const wave=Math.sin(wt*1.2+r*.8+c*.6);
      ctx.fillStyle='#06121e';ctx.fillRect(x,y,TILE,TILE);
      ctx.fillStyle=`rgba(15,55,110,${.22+wave*.07})`;ctx.fillRect(x+2,y+Math.floor(TILE*.22),TILE-4,4);
      ctx.fillStyle=`rgba(15,55,110,${.14+Math.sin(wt*1.6+r*.5+c*.9)*.05})`;ctx.fillRect(x+5,y+Math.floor(TILE*.58),TILE-10,3);
      ctx.strokeStyle='rgba(15,50,90,.4)';ctx.lineWidth=.5;ctx.strokeRect(x,y,TILE,TILE);
    } else {
      const iceC=['#b0d4ee','#cce4f6','#e2f2fc','#f2faff'];
      ctx.fillStyle=iceC[hp-1]||'#f2faff';ctx.fillRect(x,y,TILE,TILE);
      ctx.fillStyle='rgba(255,255,255,.38)';ctx.fillRect(x+1,y+1,TILE-2,Math.floor(TILE*.2));
      ctx.fillStyle='rgba(255,255,255,.2)';ctx.beginPath();ctx.moveTo(x+3,y+3);ctx.lineTo(x+TILE*.38,y+3);ctx.lineTo(x+3,y+TILE*.38);ctx.closePath();ctx.fill();
      if(hp<=3){
        ctx.strokeStyle=`rgba(70,120,170,${hp<=1?.8:hp<=2?.55:.3})`;ctx.lineWidth=hp<=1?2:hp<=2?1.2:.8;ctx.beginPath();
        ctx.moveTo(x+8,y+12);ctx.lineTo(x+24,y+22);ctx.moveTo(x+24,y+22);ctx.lineTo(x+18,y+36);
        if(hp<=2){ctx.moveTo(x+32,y+8);ctx.lineTo(x+18,y+26);ctx.moveTo(x+5,y+30);ctx.lineTo(x+16,y+18);}
        if(hp<=1){ctx.moveTo(x+2,y+2);ctx.lineTo(x+TILE-2,y+TILE-2);ctx.moveTo(x+TILE-2,y+2);ctx.lineTo(x+2,y+TILE-2);ctx.moveTo(x+TILE/2,y+2);ctx.lineTo(x+TILE/2,y+TILE-2);}
        ctx.stroke();
      }
      if(tremor>ICE_TREMOR_DUR*.55){const g=(tremor-ICE_TREMOR_DUR*.55)/(ICE_TREMOR_DUR*.45);ctx.fillStyle=`rgba(255,100,30,${g*.35})`;ctx.fillRect(x,y,TILE,TILE);}
      ctx.strokeStyle='rgba(180,220,255,.22)';ctx.lineWidth=.5;ctx.strokeRect(x,y,TILE,TILE);

      // Snowball paint overlay
      if(selectedMode==='snowball'&&paintGrid[r][c]!==0){
        ctx.fillStyle=paintGrid[r][c]===1?PAINT_BLUE:PAINT_RED;
        ctx.fillRect(x,y,TILE,TILE);
      }
    }
  }

  if(icePhase===1){
    const sec=Math.ceil(icePhaseTimer/60),pulse=.8+Math.sin(Date.now()*.01)*.2;
    ctx.save();ctx.fillStyle=`rgba(255,120,40,${pulse})`;ctx.font='bold 15px Segoe UI';ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=8;ctx.fillText(`⚠️ Ijs breekt in ${sec}s!`,SW/2,55);ctx.restore();
  }

  // Snowball timer
  if(selectedMode==='snowball'&&running){
    const sec=Math.ceil(sbTimer/60);
    const pulse=sec<=10?.7+Math.sin(Date.now()*.015)*.3:1;
    ctx.save();ctx.fillStyle=`rgba(200,240,255,${pulse})`;ctx.font='bold 14px Segoe UI';ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=6;ctx.fillText(`⏱️ ${sec}s`,SW/2,55);ctx.restore();
  }

  // Particles
  ctx.save();
  for(const p of parts){const{x,y}=toScreen(p.wx,p.wy);if(x<-20||x>SW+20||y<-20||y>SH+20)continue;ctx.globalAlpha=(p.life/p.ml)*.85;ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(x,y,Math.max(.5,p.sz*(p.life/p.ml)),0,Math.PI*2);ctx.fill();}
  ctx.restore();

  // Bullets
  for(const b of bullets){
    for(let i=0;i<b.trail.length;i++){const t=b.trail[i],{x,y}=toScreen(t.wx,t.wy);ctx.globalAlpha=(i/b.trail.length)*.38;ctx.fillStyle=b.col;ctx.beginPath();ctx.arc(x,y,(b.snow?5:2)*(i/b.trail.length)+1,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;
    const{x,y}=toScreen(b.wx,b.wy);if(x<-10||x>SW+10||y<-10||y>SH+10)continue;
    if(b.snow){
      // Snowball visual
      ctx.fillStyle='#fff';ctx.shadowColor=b.col;ctx.shadowBlur=6;
      ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=b.col;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();
    } else {
      ctx.shadowColor=b.col;ctx.shadowBlur=8;
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=b.col;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
    }
    ctx.shadowBlur=0;
  }
  ctx.globalAlpha=1;

  // Aim indicator
  const meP=players[0];
  if(meP&&meP.alive&&aim.active&&aim.ready){
    const{x:px,y:py}=toScreen(meP.wx,meP.wy);
    ctx.save();ctx.strokeStyle=meP.col;ctx.lineWidth=2;ctx.globalAlpha=.55;ctx.setLineDash([7,6]);
    ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(meP.angle)*110,py+Math.sin(meP.angle)*110);ctx.stroke();
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
  if(p.inWater){ctx.shadowColor='#3080c0';ctx.shadowBlur=16;}

  ctx.save();ctx.globalAlpha=(ctx.globalAlpha||1)*.15;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(px+2,py+2,R,R*.6,0,0,Math.PI*2);ctx.fill();ctx.restore();

  // In snowball: show team color ring
  if(selectedMode==='snowball'){
    ctx.strokeStyle=p.isP?'#3a80f0':'#e04040';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(px,py,R+3,0,Math.PI*2);ctx.stroke();
  }

  const bodyCol=p.frz>0?'#c0e8ff':p.inWater?'#2060a0':'#16162a';
  ctx.fillStyle=bodyCol;ctx.beginPath();ctx.arc(px,py,R,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=p.inWater?'#4090d0':p.col;ctx.beginPath();ctx.arc(px,py,R*.58,0,Math.PI*2);ctx.fill();

  if(p.inWater){ctx.save();ctx.strokeStyle='rgba(80,160,220,.4)';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(px,py+R*.3,R*1.3,R*.4,0,0,Math.PI*2);ctx.stroke();ctx.restore();}

  if(p.stunTimer>0&&p.isP){const sf=Date.now()*.005;for(let i=0;i<3;i++){const a=sf+i*(Math.PI*2/3);ctx.font='12px serif';ctx.textAlign='center';ctx.fillText('⭐',px+Math.cos(a)*R*1.2,py-R+Math.sin(a)*R*.3-4);}}

  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px+Math.cos(p.angle)*R,py+Math.sin(p.angle)*R,4,0,Math.PI*2);ctx.fill();
  const ex=px+Math.cos(p.angle)*R*.42,ey=py+Math.sin(p.angle)*R*.42;
  const px2=-Math.sin(p.angle)*4,py2=Math.cos(p.angle)*4;
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex+px2,ey+py2,2.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(ex-px2,ey-py2,2.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(ex+px2+Math.cos(p.angle),ey+py2+Math.sin(p.angle),1.3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(ex-px2+Math.cos(p.angle),ey-py2+Math.sin(p.angle),1.3,0,Math.PI*2);ctx.fill();

  const bw=R*2.4,bx=px-bw/2,by=py-R-10,hpP=p.hp/p.mhp;
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(bx,by,bw,5);
  ctx.fillStyle=hpP>.5?'#3ad870':hpP>.25?'#f0c040':'#f04040';ctx.fillRect(bx,by,bw*hpP,5);

  ctx.font='700 10px Segoe UI';ctx.textAlign='center';
  if(p.isP){ctx.fillStyle=p.col;ctx.fillText('YOU',px,py-R-14);}
  else{ctx.font='12px serif';ctx.fillText({soldier:'🪖',mage:'🧊',tank:'🛡️'}[p.cls]||'🐧',px,py-R-14);}
  if(p.frz>0){ctx.fillStyle='rgba(110,195,255,.2)';ctx.beginPath();ctx.arc(px,py,R+4,0,Math.PI*2);ctx.fill();}
  ctx.shadowBlur=0;ctx.restore();
}

// ══════════════════════════════════════════
//  MINIMAP
// ══════════════════════════════════════════
function drawMinimap(){
  const S=92;mmx.clearRect(0,0,S,S);const sc=S/GC;
  for(let r=0;r<GR;r++) for(let c=0;c<GC;c++){
    const cell=grid[r][c],hp=iceHP[r][c],paint=paintGrid[r][c];
    if(cell===T_WALL)mmx.fillStyle='#2a3e5a';
    else if(hp<=0)mmx.fillStyle='#06121e';
    else if(selectedMode==='snowball'&&paint===1)mmx.fillStyle='#3060c0';
    else if(selectedMode==='snowball'&&paint===2)mmx.fillStyle='#c03030';
    else mmx.fillStyle=hp<=2?'#7aaac4':hp<=3?'#98c0d8':'#d8f0ff';
    mmx.fillRect(c*sc,r*sc,sc,sc);
  }
  for(const p of players){if(!p.alive)continue;mmx.fillStyle=selectedMode==='snowball'?(p.isP?'#3a80f0':'#e04040'):p.col;mmx.beginPath();mmx.arc(p.wx/TILE*sc,p.wy/TILE*sc,p.isP?3:2,0,Math.PI*2);mmx.fill();}
  const vx=(camX/TILE)*sc,vy=(camY/TILE)*sc,vw=(SW/TILE)*sc,vh=(SH/TILE)*sc;
  mmx.strokeStyle='rgba(255,255,255,.35)';mmx.lineWidth=1;mmx.strokeRect(vx,vy,vw,vh);
}

// ══════════════════════════════════════════
//  HUD
// ══════════════════════════════════════════
function renderAmmo(p){
  const wrap=document.getElementById('ammo-dots');wrap.innerHTML='';
  const reloading=p.reloadSlots||[];
  for(let i=0;i<p.maxA;i++){
    const d=document.createElement('div');
    if(i<p.ammo){d.className='ammo-dot';}
    else{const si=i-p.ammo;if(si<reloading.length){const pct=Math.round((1-reloading[si]/p.relT)*100);d.className='ammo-dot reloading';d.style.background=`conic-gradient(${p.col} ${pct}%,#1a3050 ${pct}%)`;}else d.className='ammo-dot empty';}
    wrap.appendChild(d);
  }
}

function updateHUD(){
  const me=players[0];if(!me)return;
  const hpP=me.hp/me.mhp;
  const icons={surfer:'🏄',soldier:'🪖',mage:'🧊',tank:'🛡️'};
  document.getElementById('my-hp-name').textContent=(icons[me.cls]||'🐧')+' '+me.name.toUpperCase()+' — JIJ';
  document.getElementById('my-hp-name').style.color=me.col;
  document.getElementById('my-hp-bar').style.width=(hpP*100)+'%';
  document.getElementById('my-hp-bar').style.background=hpP>.5?'linear-gradient(90deg,#3ad870,#5ac8fa)':hpP>.25?'linear-gradient(90deg,#f0c040,#e08020)':'linear-gradient(90deg,#f04040,#c02020)';
  document.getElementById('my-hp-text').textContent=Math.ceil(me.hp)+' / '+me.mhp+' HP'+((me.reloadSlots||[]).length>0?' — herladen...':'');
  renderAmmo(me);

  // Show/hide snowball score vs alive count
  const sbScore=document.getElementById('sb-score');
  const aliveWrap=document.getElementById('alive-wrap');
  if(selectedMode==='snowball'){sbScore.style.display='flex';aliveWrap.style.display='none';}
  else{sbScore.style.display='none';aliveWrap.style.display='block';}

  const bc=document.getElementById('bot-cards');
  if(!bc.children.length){players.slice(1).forEach((p,i)=>{const d=document.createElement('div');d.className='bot-card';d.id='bc'+i;d.innerHTML=`<div class="bot-dot" style="background:${selectedMode==='snowball'?'#e04040':p.col}"></div><div class="bot-info"><div class="bot-name">${p.name}</div><div class="bot-bar-bg"><div class="bot-bar-fill" id="bbf${i}" style="width:100%;background:${selectedMode==='snowball'?'#e04040':p.col}"></div></div></div>`;bc.appendChild(d);});}
  players.slice(1).forEach((p,i)=>{const f=document.getElementById('bbf'+i),c=document.getElementById('bc'+i);if(f)f.style.width=(p.hp/p.mhp*100)+'%';if(c)c.classList.toggle('dead',!p.alive&&selectedMode!=='snowball');});
}

// ══════════════════════════════════════════
//  RESULT + EXIT
// ══════════════════════════════════════════
function showResult(winner){
  running=false;
  document.getElementById('exit-btn').style.display='none';
  const ro=document.getElementById('result-overlay');
  ro.style.display='flex';
  const emoji=document.getElementById('result-emoji');
  const title=document.getElementById('result-title');
  const kmText=document.getElementById('result-km-text');

  if(selectedMode==='showdown'){
    if(!winner){emoji.textContent='🤝';title.textContent='Gelijkspel!';title.style.color='#f0c040';}
    else if(winner.isP){emoji.textContent='🏆';title.textContent='JIJ WINT!';title.style.color='#5ac8fa';}
    else{emoji.textContent='💀';title.textContent=`${winner.name} won!`;title.style.color='#ff7a5a';}
  } else if(selectedMode==='snowball'){
    const{bluePct,redPct}=getScores();
    if(bluePct>redPct){emoji.textContent='🏆';title.textContent=`BLAUW WINT! ${bluePct}% vs ${redPct}%`;title.style.color='#5ac8fa';}
    else{emoji.textContent='❌';title.textContent=`ROOD WINT! ${redPct}% vs ${bluePct}%`;title.style.color='#ff7a5a';}
  }

  const km=getMountainKmPerChar(selectedMode,selectedClass);
  const zone=getZone(km);
  kmText.textContent=`${zone.icon} ${zone.name} — ${km.toFixed(1)} km op de berg`;
  updateMountainDisplay();updateCharKmDisplay();
}

// Exit during game
document.getElementById('exit-btn').addEventListener('click',()=>{
  running=false;
  if(fid)cancelAnimationFrame(fid);
  recordLoss(selectedClass);
  showMainMenu();
});

// Result buttons
document.getElementById('result-play-again').addEventListener('click',()=>{
  document.getElementById('result-overlay').style.display='none';
  startGame();
});
document.getElementById('result-exit').addEventListener('click',()=>{
  document.getElementById('result-overlay').style.display='none';
  showMainMenu();
});

// ══════════════════════════════════════════
//  START
// ══════════════════════════════════════════
function startGame(){
  document.getElementById('overlay').style.display='none';
  document.getElementById('result-overlay').style.display='none';
  document.getElementById('bot-cards').innerHTML='';
  document.getElementById('profile-panel').style.display='none';
  document.getElementById('inventory-bar').innerHTML='';
  document.getElementById('exit-btn').style.display='block';

  initGrid();spawnAll();initIce();
  if(selectedMode==='snowball'){
    initSnowball();
    document.getElementById('sb-score').style.display='flex';
    document.getElementById('alive-wrap').style.display='none';
  } else {
    document.getElementById('sb-score').style.display='none';
    document.getElementById('alive-wrap').style.display='block';
  }

  const me=players[0];camX=me.wx-SW/2;camY=me.wy-SH/2;
  renderAmmo(me);running=true;
  if(fid)cancelAnimationFrame(fid);
  lt=performance.now();fid=requestAnimationFrame(update);
}

document.getElementById('play-btn').addEventListener('click', startGame);
