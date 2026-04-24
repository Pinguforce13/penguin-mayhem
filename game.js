// ══════════════════════════════════════════
//  PENGUIN MAYHEM — game.js
// ══════════════════════════════════════════

const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');
const mmc    = document.getElementById('minimap');
const mmx    = mmc.getContext('2d');
let SW = window.innerWidth, SH = window.innerHeight;
canvas.width=SW; canvas.height=SH;
window.addEventListener('resize',()=>{SW=window.innerWidth;SH=window.innerHeight;canvas.width=SW;canvas.height=SH;});

const isMob = ('ontouchstart' in window)||navigator.maxTouchPoints>0;

// ── SCREENS
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el=document.getElementById(id);
  if(el)el.classList.add('active');
}

// ══ ACCOUNTS ══
// Simple reliable storage
const DB = {
  get(k){ try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch{return null;} },
  set(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch{} },
  del(k){ try{localStorage.removeItem(k);}catch{} }
};

let currentUser = null;

function getUsers(){ return DB.get('pm_users')||{}; }
function saveUsers(u){ DB.set('pm_users',u); }

document.getElementById('btn-auth').addEventListener('click',()=>{
  const type = document.getElementById('auth-type').value;
  const user = document.getElementById('auth-user').value.trim().toLowerCase();
  const pass = document.getElementById('auth-pass').value;
  const err  = document.getElementById('auth-error');
  err.textContent='';

  if(!user||user.length<3){err.textContent='Username min. 3 tekens!';return;}
  if(!pass){err.textContent='Vul een wachtwoord in!';return;}

  const users=getUsers();
  if(type==='register'){
    if(users[user]){err.textContent='Username al in gebruik!';return;}
    users[user]={username:user,password:pass,wins:{},mountains:{},streak:0};
    saveUsers(users);
    currentUser=users[user];
  } else {
    if(!users[user]){err.textContent='Account niet gevonden!';return;}
    if(users[user].password!==pass){err.textContent='Verkeerd wachtwoord!';return;}
    currentUser=users[user];
  }
  // Ensure fields exist
  if(!currentUser.mountains)currentUser.mountains={};
  if(!currentUser.wins)currentUser.wins={};
  if(!currentUser.streak)currentUser.streak=0;

  DB.set('pm_current',user);
  goToMenu();
});

document.getElementById('btn-logout').addEventListener('click',()=>{
  currentUser=null;
  DB.del('pm_current');
  document.getElementById('auth-user').value='';
  document.getElementById('auth-pass').value='';
  document.getElementById('auth-error').textContent='';
  document.getElementById('profile-panel').style.display='none';
  showScreen('auth-screen');
});

function goToMenu(){
  showScreen('menu-screen');
  document.getElementById('hud').style.display='none';
  document.getElementById('btn-exit').style.display='none';
  document.getElementById('result-screen').style.display='none';
  document.getElementById('profile-panel').style.display='none';
  if(isMob){document.getElementById('joystick-wrap').style.display='none';document.getElementById('shoot-btn').style.display='none';}
  updateProfileUI();
  refreshMenu();
}

// Try auto-login
(function(){
  const name=DB.get('pm_current');
  if(!name)return;
  const users=getUsers();
  if(users[name]){
    currentUser=users[name];
    if(!currentUser.mountains)currentUser.mountains={};
    if(!currentUser.wins)currentUser.wins={};
    if(!currentUser.streak)currentUser.streak=0;
    goToMenu();
  }
})();

// ══ MOUNTAIN SYSTEM ══
const MODES=['showdown','snowball'];
const ZONES=[
  {name:'Base Camp',   min:0,   max:10,  col:'#3a8a5a',icon:'⛺'},
  {name:'Snow Trail',  min:10,  max:25,  col:'#4a8aaa',icon:'🏔️'},
  {name:'Ice Ridge',   min:25,  max:50,  col:'#5a9aba',icon:'🧊'},
  {name:'Blizzard Peak',min:50, max:75,  col:'#6ab0da',icon:'🌨️'},
  {name:'Summit',      min:75,  max:100, col:'#80c0f0',icon:'🏁'},
  {name:'Above Clouds',min:100, max:999, col:'#a8d8ff',icon:'✨'},
];

function getZone(km){
  for(let i=ZONES.length-1;i>=0;i--)if(km>=ZONES[i].min)return ZONES[i];
  return ZONES[0];
}
function getMountainKmPerChar(mode,cls){
  if(!currentUser)return 0;
  return currentUser.mountains?.[mode]?.[cls]||0;
}
function getMountainKm(mode){
  if(!currentUser)return 0;
  return ['surfer','soldier','mage','tank'].reduce((s,c)=>s+(currentUser.mountains?.[mode]?.[c]||0),0);
}
function addMountainKm(mode,cls,km){
  if(!currentUser)return;
  if(!currentUser.mountains[mode])currentUser.mountains[mode]={};
  currentUser.mountains[mode][cls]=Math.max(0,(currentUser.mountains[mode][cls]||0)+km);
  const users=getUsers();users[currentUser.username]=currentUser;saveUsers(users);
}

// ══ PROFILE UI ══
function updateProfileUI(){
  if(!currentUser)return;
  const icons={surfer:'🏄',soldier:'🪖',mage:'🧊',tank:'🛡️'};
  const names={surfer:'Surfer',soldier:'Soldier',mage:'Ice Mage',tank:'Tank'};
  document.getElementById('pp-wins').innerHTML=
    ['surfer','soldier','mage','tank'].map(c=>
      `<div class="pp-win-row"><span class="pp-win-ic">${icons[c]}</span><span class="pp-win-nm">${names[c]}</span><span class="pp-win-ct">${currentUser.wins[c]||0} wins</span></div>`
    ).join('');
  updateProfileMountains();
}
function updateProfileMountains(){
  const el=document.getElementById('pp-mtns');
  if(!el)return;
  el.innerHTML=MODES.map(mode=>{
    const km=getMountainKm(mode);
    const z=getZone(km);
    const pct=Math.min(100,(km/100)*100);
    return `<div class="pp-mtn"><div class="pp-mtn-hd"><span class="pp-mtn-mode">${mode==='showdown'?'⚔️ Showdown':'❄️ Snowball'}</span><span class="pp-mtn-zone" style="color:${z.col}">${z.icon} ${z.name}</span><span class="pp-mtn-km">${km.toFixed(1)}km</span></div><div class="pp-bar-bg"><div class="pp-bar-fill" style="width:${pct}%;background:${z.col}"></div></div></div>`;
  }).join('');
}

// ══ SELECTIONS — always read from window so menu buttons sync ══
window._selCls  = window._selCls  || 'surfer';
window._selMode = window._selMode || 'showdown';
Object.defineProperty(window,'selectedClass',{get:()=>window._selCls, set:v=>{window._selCls=v;}});
Object.defineProperty(window,'selectedMode', {get:()=>window._selMode,set:v=>{window._selMode=v;}});

function refreshMenu(){
  if(typeof drawMtn==='function')drawMtn();
  ['surfer','soldier','mage','tank'].forEach(c=>{
    const km=getMountainKmPerChar(selectedMode,c);
    const z=getZone(km);
    const el=document.getElementById('ckm-'+c);
    if(el)el.textContent=z.icon+' '+km.toFixed(1)+' km';
  });
  ['showdown','snowball'].forEach(m=>{
    const km=getMountainKm(m);
    const z=getZone(km);
    const el=document.getElementById('mkm-'+m);
    if(el)el.textContent=z.icon+' '+km.toFixed(1)+' km';
  });
  if(currentUser){
    document.getElementById('user-name').textContent=currentUser.username;
    document.getElementById('pp-name').textContent=currentUser.username;
    const km=getMountainKmPerChar(selectedMode,selectedClass);
    const z=getZone(km);
    document.getElementById('user-zone').textContent=z.icon+' '+z.name;
  }
}

// ══ GAME CONSTANTS ══
const TILE=72,GR=50,GC=50,CAM_LERP=0.12;
let camX=0,camY=0;
const T_FLOOR=0,T_WALL=1;
let grid=[],iceHP=[],iceTremor=[],paintGrid=[];
function toScreen(wx,wy){return{x:Math.round(wx-camX),y:Math.round(wy-camY)};}

function initGrid(){
  grid=[];iceHP=[];iceTremor=[];paintGrid=[];
  for(let r=0;r<GR;r++){grid[r]=[];iceHP[r]=[];iceTremor[r]=[];paintGrid[r]=[];
    for(let c=0;c<GC;c++){const w=r===0||r===GR-1||c===0||c===GC-1;grid[r][c]=w?T_WALL:T_FLOOR;iceHP[r][c]=4;iceTremor[r][c]=0;paintGrid[r][c]=0;}}
  const walls=[{r:23,c:23},{r:23,c:24},{r:23,c:25},{r:24,c:23},{r:25,c:23},{r:25,c:24},{r:25,c:25},{r:7,c:8},{r:7,c:9},{r:8,c:9},{r:9,c:9},{r:7,c:18},{r:7,c:19},{r:8,c:18},{r:9,c:18},{r:7,c:30},{r:7,c:31},{r:8,c:31},{r:9,c:31},{r:7,c:40},{r:7,c:41},{r:8,c:41},{r:9,c:41},{r:40,c:8},{r:40,c:9},{r:41,c:9},{r:42,c:9},{r:40,c:18},{r:40,c:19},{r:41,c:18},{r:42,c:18},{r:40,c:30},{r:40,c:31},{r:41,c:31},{r:42,c:31},{r:40,c:40},{r:40,c:41},{r:41,c:41},{r:42,c:41},{r:16,c:12},{r:17,c:12},{r:18,c:12},{r:16,c:36},{r:17,c:36},{r:18,c:36},{r:31,c:12},{r:32,c:12},{r:33,c:12},{r:31,c:36},{r:32,c:36},{r:33,c:36},{r:23,c:10},{r:24,c:10},{r:25,c:10},{r:23,c:38},{r:24,c:38},{r:25,c:38},{r:10,c:23},{r:10,c:24},{r:10,c:25},{r:38,c:23},{r:38,c:24},{r:38,c:25}];
  walls.forEach(({r,c})=>{if(r>0&&r<GR-1&&c>0&&c<GC-1)grid[r][c]=T_WALL;});
  [{r:4,c:4},{r:4,c:45},{r:45,c:4},{r:45,c:45},{r:24,c:24}].forEach(({r,c})=>{for(let dr=-3;dr<=3;dr++)for(let dc=-3;dc<=3;dc++){const nr=r+dr,nc=c+dc;if(nr>0&&nr<GR-1&&nc>0&&nc<GC-1){grid[nr][nc]=T_FLOOR;iceHP[nr][nc]=4;}}});
}
function isWall(r,c){if(r<0||r>=GR||c<0||c>=GC)return true;return grid[r][c]===T_WALL;}
function blocked(wx,wy,rad=12){for(const{dx,dy}of[{dx:-rad,dy:-rad},{dx:rad,dy:-rad},{dx:-rad,dy:rad},{dx:rad,dy:rad}])if(isWall(Math.floor((wy+dy)/TILE),Math.floor((wx+dx)/TILE)))return true;return false;}

// ICE
let iceTimer=0,iceRing=1,icePhase=0,icePhaseTimer=0;
const ICE_GRACE=60*14,ICE_TREMOR=60*3,ICE_BREAK=60*1,ICE_NEXT=60*5,ICE_MAX=Math.floor(GR/2)-2;
function initIce(){iceTimer=0;iceRing=1;icePhase=0;icePhaseTimer=ICE_GRACE;}
function updateIce(){
  if(selectedMode==='snowball')return;
  iceTimer++;icePhaseTimer--;
  for(let r=0;r<GR;r++)for(let c=0;c<GC;c++)if(iceTremor[r][c]>0)iceTremor[r][c]--;
  if(icePhaseTimer<=0){
    if(icePhase===0){icePhase=1;icePhaseTimer=ICE_TREMOR;ringTremor(iceRing);}
    else if(icePhase===1){icePhase=2;icePhaseTimer=ICE_BREAK;ringBreak(iceRing);}
    else{iceRing++;if(iceRing<=ICE_MAX){icePhase=0;icePhaseTimer=ICE_NEXT;}else icePhase=99;}
  }
  for(const p of players){
    if(!p.alive)continue;
    const tr=Math.floor(p.wy/TILE),tc=Math.floor(p.wx/TILE);
    if(tr<0||tr>=GR||tc<0||tc>=GC)continue;
    if(iceHP[tr][tc]<=0&&grid[tr][tc]!==T_WALL){
      if(!p.inWater){p.inWater=true;p.stunTimer=120;splash(p.wx,p.wy);}
      p.vx*=.5;p.vy*=.5;if(p.stunTimer<=0)hurtP(p,.8);
    }else{p.inWater=false;}
    if(p.stunTimer>0)p.stunTimer--;
  }
}
function ringTremor(ring){for(let r=ring;r<GR-ring;r++)for(let c=ring;c<GC-ring;c++)if(r===ring||r===GR-1-ring||c===ring||c===GC-1-ring)if(grid[r][c]!==T_WALL&&iceHP[r][c]>0)iceTremor[r][c]=ICE_TREMOR;}
function ringBreak(ring){for(let r=ring;r<GR-ring;r++)for(let c=ring;c<GC-ring;c++)if(r===ring||r===GR-1-ring||c===ring||c===GC-1-ring)if(grid[r][c]!==T_WALL&&iceHP[r][c]>0){iceHP[r][c]=0;iceTremor[r][c]=0;iceFx(r,c);}}
function iceFx(r,c){const wx=(c+.5)*TILE,wy=(r+.5)*TILE;for(let i=0;i<8;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*3;parts.push({wx:wx+(Math.random()-.5)*TILE*.5,wy:wy+(Math.random()-.5)*TILE*.5,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:18+Math.random()*18,ml:36,sz:3+Math.random()*5,col:'#cce8ff'});}}
function splash(wx,wy){for(let i=0;i<12;i++){const a=(i/12)*Math.PI*2,s=2+Math.random()*3;parts.push({wx,wy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:20+Math.random()*15,ml:35,sz:3+Math.random()*4,col:'#5ac8fa'});}}

// SNOWBALL
let sbTimer=0;
function initSB(){sbTimer=60*90;paintGrid.forEach(r=>r.fill(0));}
function paintTile(wx,wy,team){const r=Math.floor(wy/TILE),c=Math.floor(wx/TILE);if(r<0||r>=GR||c<0||c>=GC||grid[r][c]===T_WALL)return;paintGrid[r][c]=team;}
function getScores(){let b=0,r=0,t=0;for(let rr=0;rr<GR;rr++)for(let cc=0;cc<GC;cc++){if(grid[rr][cc]===T_WALL)continue;t++;if(paintGrid[rr][cc]===1)b++;else if(paintGrid[rr][cc]===2)r++;}return{b,r,t,bp:Math.round(b/t*100),rp:Math.round(r/t*100)};}
function updateSB(){
  if(selectedMode!=='snowball')return;
  sbTimer--;
  for(const p of players){if(!p.alive)continue;paintTile(p.wx,p.wy,p.isP?1:2);}
  const{bp,rp}=getScores();
  document.getElementById('hud-sb-b').textContent='🔵 '+bp+'%';
  document.getElementById('hud-sb-r').textContent='🔴 '+rp+'%';
  document.getElementById('hud-alive-n').textContent=Math.ceil(sbTimer/60);
  if(sbTimer<=0){running=false;const won=bp>rp;if(won)doWin();else doLoss();setTimeout(()=>showResult(won),600);}
}

// PARTICLES
let parts=[];
function hitFx(wx,wy,col,n=5){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=1.5+Math.random()*3;parts.push({wx,wy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:10+Math.random()*8,ml:18,sz:2+Math.random()*3,col});}}
function deathFx(wx,wy,col){for(let i=0;i<18;i++)parts.push({wx:wx+(Math.random()-.5)*20,wy:wy+(Math.random()-.5)*20,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:20+Math.random()*18,ml:38,sz:3+Math.random()*6,col});}

// ══ FISHING SYSTEM ══
let fishHoles=[],crates=[],drops=[],inventory={rod:null,fish:0};
let fishState={active:false,timer:0,hooked:false,holeRef:null};
let eatTimer=0;

function initFishing(){
  fishHoles=[];crates=[];drops=[];inventory={rod:null,fish:0};
  fishState={active:false,timer:0,hooked:false,holeRef:null};eatTimer=0;
  // Place 6 fishing holes on floor tiles
  const candidates=[];
  for(let r=6;r<GR-6;r++)for(let c=6;c<GC-6;c++){
    if(grid[r][c]!==T_WALL&&iceHP[r][c]>0){
      const near=[{r:4,c:4},{r:4,c:45},{r:45,c:4},{r:45,c:45},{r:24,c:24}];
      if(near.every(s=>Math.abs(s.r-r)+Math.abs(s.c-c)>5))candidates.push({r,c});
    }
  }
  for(let i=0;i<6&&candidates.length;i++){
    const idx=Math.floor(Math.random()*candidates.length);
    const{r,c}=candidates.splice(idx,1)[0];
    candidates.splice(0,candidates.length,...candidates.filter(x=>Math.abs(x.r-r)+Math.abs(x.c-c)>5));
    const hole={r,c,wx:(c+.5)*TILE,wy:(r+.5)*TILE};
    fishHoles.push(hole);
    // 2 crates next to hole
    const offsets=[{dx:-TILE,dy:0},{dx:TILE,dy:0},{dx:0,dy:-TILE},{dx:0,dy:TILE}];
    let placed=0;
    for(const{dx,dy}of offsets){
      if(placed>=2)break;
      const cr=Math.floor((hole.wy+dy)/TILE),cc=Math.floor((hole.wx+dx)/TILE);
      if(cr>0&&cr<GR-1&&cc>0&&cc<GC-1&&grid[cr][cc]!==T_WALL){
        crates.push({wx:hole.wx+dx,wy:hole.wy+dy,hp:50,mhp:50,alive:true,hole});placed++;
      }
    }
  }
  renderInv();
}

function updateFishing(){
  // Crate bullet hits
  for(const cr of crates){
    if(!cr.alive)continue;
    for(const b of bullets){
      if(!b.life)continue;
      const dx=cr.wx-b.wx,dy=cr.wy-b.wy;
      if(Math.sqrt(dx*dx+dy*dy)<TILE*.42){cr.hp-=b.dmg;hitFx(b.wx,b.wy,'#c8a060',4);b.life=0;
        if(cr.hp<=0){cr.alive=false;drops.push({type:'rod',wx:cr.wx,wy:cr.wy,life:900});hitFx(cr.wx,cr.wy,'#c8a060',12);}
      }
    }
  }
  // Drop pickup
  drops=drops.filter(d=>d.life>0);
  drops.forEach(d=>d.life--);
  const me=players[0];
  if(me&&me.alive){
    for(let i=drops.length-1;i>=0;i--){
      const d=drops[i];
      const dx=me.wx-d.wx,dy=me.wy-d.wy;
      if(Math.sqrt(dx*dx+dy*dy)<PR+18){
        if(d.type==='rod'&&!inventory.rod){inventory.rod={hp:20,mhp:20};drops.splice(i,1);showMsg('🎣 Vishengel opgepakt!');}
        else if(d.type==='fish'){inventory.fish++;drops.splice(i,1);showMsg('🐟 Vis! Klik om te eten (+10 HP)');}
        renderInv();
      }
    }
  }
  // Eating
  if(eatTimer>0){eatTimer--;if(eatTimer===0){inventory.fish--;const me=players[0];if(me&&me.alive)me.hp=Math.min(me.mhp,me.hp+10);showMsg('🐟 +10 HP!');renderInv();}}
  // Fishing timer
  if(fishState.active){
    fishState.timer--;
    if(!fishState.hooked&&fishState.timer<120&&Math.random()<.025){fishState.hooked=true;fishState.timer=90;showMsg('🐟 BEET! Klik op 🎣!');}
    if(fishState.timer<=0){fishState.active=false;showMsg(fishState.hooked?'😢 Vis ontsnapt!':'🎣 Niets gevangen...');renderInv();}
  }
}

window.useRod=function(){
  if(!inventory.rod||fishState.active)return;
  const me=players[0];if(!me||!me.alive)return;
  let near=null,nd=Infinity;
  for(const h of fishHoles){const dx=h.wx-me.wx,dy=h.wy-me.wy,d=Math.sqrt(dx*dx+dy*dy);if(d<nd){nd=d;near=h;}}
  if(!near||nd>TILE*4){showMsg('🎣 Te ver van een visputje!');return;}
  fishState={active:true,timer:180,hooked:false,holeRef:near};
  showMsg('🎣 Uitgegooid! Wacht...');renderInv();
};
window.eatFish=function(){
  if(!inventory.fish||eatTimer>0)return;
  eatTimer=120;showMsg('🐟 Aan het eten...');
};

// Click = reel in when hooked
document.addEventListener('click',()=>{
  if(fishState.active&&fishState.hooked){
    drops.push({type:'fish',wx:fishState.holeRef.wx,wy:fishState.holeRef.wy,life:600});
    inventory.rod.hp-=10;
    if(inventory.rod.hp<=0){inventory.rod=null;showMsg('🎣 Vishengel kapot!');}
    else showMsg('🐟 Gevangen! Raap op.');
    fishState.active=false;renderInv();
  }
});

function showMsg(msg){
  const el=document.getElementById('pickup-msg');
  if(!el)return;
  el.textContent=msg;el.style.opacity='1';
  clearTimeout(el._t);el._t=setTimeout(()=>el.style.opacity='0',2500);
}
function renderInv(){
  const wrap=document.getElementById('inventory-bar');if(!wrap)return;
  let html='';
  if(inventory.rod){const pct=Math.round(inventory.rod.hp/inventory.rod.mhp*100);html+=`<div class="inv-slot${fishState.active?' active':''}" onclick="useRod()"><div class="inv-icon">🎣</div><div class="inv-label">${inventory.rod.hp}/${inventory.rod.mhp}</div></div>`;}
  if(inventory.fish>0){html+=`<div class="inv-slot" onclick="eatFish()"><div class="inv-icon">🐟</div><div class="inv-label">${inventory.fish}x${eatTimer>0?' ⏳':''}</div></div>`;}
  wrap.innerHTML=html;
}

// CLASSES
const CLS_DEF={
  surfer: {col:'#5ac8fa',hp:85, spd:2.2,fr:28,maxA:6,relT:120,dmg:14,bspd:7,name:'Surfer'},
  soldier:{col:'#ff9a5a',hp:95, spd:1.8,fr:20,maxA:8,relT:90, dmg:18,bspd:8,name:'Soldier'},
  mage:   {col:'#a080f8',hp:70, spd:1.6,fr:38,maxA:4,relT:150,dmg:24,bspd:6,name:'Mage'},
  tank:   {col:'#f0c040',hp:180,spd:1.2,fr:55,maxA:3,relT:180,dmg:28,bspd:5.5,name:'Tank'},
};

// PLAYERS
let players=[],bullets=[];
const PR=14;

function spawnAll(){
  players=[];bullets=[];
  const sp=[{wx:4.5*TILE,wy:4.5*TILE},{wx:45.5*TILE,wy:4.5*TILE},{wx:4.5*TILE,wy:45.5*TILE},{wx:45.5*TILE,wy:45.5*TILE},{wx:24.5*TILE,wy:24.5*TILE}];
  const allCls=['surfer','soldier','mage','tank'].filter(c=>c!==selectedClass);
  while(allCls.length<4)allCls.push(allCls[Math.floor(Math.random()*allCls.length)]);
  [{cls:selectedClass,isP:true},{cls:allCls[0],isP:false},{cls:allCls[1],isP:false},{cls:allCls[2],isP:false},{cls:allCls[3],isP:false}].forEach((cfg,i)=>{
    const d=CLS_DEF[cfg.cls],s=sp[i];
    players.push({wx:s.wx,wy:s.wy,vx:0,vy:0,cls:cfg.cls,isP:cfg.isP,hp:d.hp,mhp:d.hp,spd:d.spd,fr:d.fr,ammo:d.maxA,maxA:d.maxA,relT:d.relT,relCd:0,dmg:d.dmg,bspd:d.bspd,col:d.col,name:cfg.isP?'JIJ':d.name,alive:true,cd:0,inv:0,angle:Math.PI/4,frz:0,ait:0,bob:Math.random()*Math.PI*2,inWater:false,stunTimer:0,slots:[],respawn:0});
  });
}

// INPUT
const K={};
window.addEventListener('keydown',e=>{K[e.code]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();});
window.addEventListener('keyup',e=>K[e.code]=false);

// Joystick
const joyState={active:false,id:-1,dx:0,dy:0};
const joyWrap=document.getElementById('joystick-wrap'),joyKnob=document.getElementById('joy-knob');
const JR=52;
function jCenter(){const r=joyWrap.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};}
joyWrap.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];joyState.active=true;joyState.id=t.identifier;joyState.dx=0;joyState.dy=0;},{passive:false});
window.addEventListener('touchmove',e=>{e.preventDefault();if(!joyState.active)return;for(const t of e.changedTouches){if(t.identifier!==joyState.id)continue;const jc=jCenter();let dx=t.clientX-jc.x,dy=t.clientY-jc.y;const d=Math.sqrt(dx*dx+dy*dy);if(d>JR){dx=dx/d*JR;dy=dy/d*JR;}joyState.dx=dx/JR;joyState.dy=dy/JR;joyKnob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;}},{passive:false});
window.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(t.identifier===joyState.id){joyState.active=false;joyState.dx=0;joyState.dy=0;joyKnob.style.transform='translate(-50%,-50%)';}});

// Aim joystick (shoot button drag)
const aimState={active:false,id:-1,sx:0,sy:0,dx:0,dy:0,ready:false};
const sBtnEl=document.getElementById('shoot-btn');
sBtnEl.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];aimState.active=true;aimState.id=t.identifier;aimState.sx=t.clientX;aimState.sy=t.clientY;aimState.dx=0;aimState.dy=0;aimState.ready=false;sBtnEl.style.background='rgba(255,120,80,.5)';},{passive:false});
window.addEventListener('touchmove',e=>{if(!aimState.active)return;for(const t of e.changedTouches){if(t.identifier!==aimState.id)continue;const dx=t.clientX-aimState.sx,dy=t.clientY-aimState.sy;if(Math.sqrt(dx*dx+dy*dy)>10){aimState.dx=dx;aimState.dy=dy;aimState.ready=true;}const m=65;sBtnEl.style.transform=`translate(${Math.max(-m,Math.min(m,dx))}px,${Math.max(-m,Math.min(m,dy))}px)`;if(players[0])players[0].angle=Math.atan2(aimState.dy,aimState.dx);}},{passive:false});
window.addEventListener('touchend',e=>{for(const t of e.changedTouches){if(t.identifier!==aimState.id)continue;const me=players[0];if(me&&me.alive&&me.cd===0&&me.ammo>0){if(aimState.ready)me.angle=Math.atan2(aimState.dy,aimState.dx);shoot(me);}aimState.active=false;aimState.ready=false;sBtnEl.style.transform='';sBtnEl.style.background='rgba(255,80,50,.22)';}});

// LOOP
let running=false,fid=null,lt=0;

function update(ts){
  const dt=Math.min(ts-lt,50);lt=ts;
  if(!running){fid=requestAnimationFrame(update);return;}

  for(const p of players){
    if(!p.alive){
      if(selectedMode==='snowball'&&p.respawn>0){p.respawn--;if(p.respawn<=0){p.alive=true;p.hp=p.mhp;p.inWater=false;p.stunTimer=0;const sp=p.isP?{wx:4.5*TILE,wy:4.5*TILE}:{wx:45.5*TILE,wy:45.5*TILE};p.wx=sp.wx;p.wy=sp.wy;}}
      continue;
    }
    p.inv=Math.max(0,p.inv-1);p.cd=Math.max(0,p.cd-1);
    if(!p.slots)p.slots=[];
    p.slots=p.slots.map(t=>t-1);
    const rel=p.slots.filter(t=>t<=0).length;
    if(rel>0){p.ammo=Math.min(p.maxA,p.ammo+rel);p.slots=p.slots.filter(t=>t>0);if(p.isP)renderAmmo(p);}
    if(p.frz>0||p.stunTimer>0){p.frz=Math.max(0,p.frz-1);continue;}
    p.isP?doInput(p):doBot(p);
    const SPD=p.spd*2.2,nx=p.wx+p.vx*SPD,ny=p.wy+p.vy*SPD;
    if(!blocked(nx,p.wy,PR))p.wx=nx;else p.vx=0;
    if(!blocked(p.wx,ny,PR))p.wy=ny;else p.vy=0;
    p.wx=Math.max(PR+TILE,Math.min((GC-1)*TILE-PR,p.wx));
    p.wy=Math.max(PR+TILE,Math.min((GR-1)*TILE-PR,p.wy));
    p.vx*=.78;p.vy*=.78;
  }

  const me=players[0];
  if(me&&me.alive){camX+=(me.wx-SW/2-camX)*CAM_LERP;camY+=(me.wy-SH/2-camY)*CAM_LERP;camX=Math.max(0,Math.min(GC*TILE-SW,camX));camY=Math.max(0,Math.min(GR*TILE-SH,camY));}

  updateBullets();updateIce();updateSB();updateFishing();
  for(const p of parts){p.wx+=p.vx;p.wy+=p.vy;if(p.g)p.vy+=p.g;else{p.vx*=.91;p.vy*=.91;}p.life--;}
  parts=parts.filter(p=>p.life>0);
  updateHUD();
  if(Math.floor(ts/50)%3===0)drawMM();

  if(selectedMode==='showdown'){
    const alive=players.filter(p=>p.alive);
    document.getElementById('hud-alive-n').textContent=alive.length;
    if(alive.length<=1){running=false;const w=alive[0];if(w&&w.isP)doWin();else doLoss();setTimeout(()=>showResult(w&&w.isP),700);}
  }
  draw();fid=requestAnimationFrame(update);
}

function doInput(p){
  let dx=0,dy=0;
  if(K['ArrowLeft']||K['KeyA'])dx-=1;if(K['ArrowRight']||K['KeyD'])dx+=1;
  if(K['ArrowUp']||K['KeyW'])dy-=1;if(K['ArrowDown']||K['KeyS'])dy+=1;
  if(joyState.active){dx+=joyState.dx;dy+=joyState.dy;}
  const len=Math.sqrt(dx*dx+dy*dy);
  if(len>0){p.vx=dx/len;p.vy=dy/len;if(!aimState.active)p.angle=Math.atan2(dy,dx);}
  if(K['Space']&&p.cd===0&&p.ammo>0)shoot(p);
}

function doBot(p){
  let near=null,nd=Infinity;
  for(const o of players){if(!o.alive||o===p||(selectedMode==='snowball'&&o.isP===p.isP))continue;const dx=o.wx-p.wx,dy=o.wy-p.wy,d=Math.sqrt(dx*dx+dy*dy);if(d<nd){nd=d;near=o;}}
  p.ait--;
  if(p.ait<=0){p.ait=35+Math.random()*45;if(near){const dx=near.wx-p.wx,dy=near.wy-p.wy,ln=Math.sqrt(dx*dx+dy*dy)||1;p.vx=dx/ln+(Math.random()-.5)*1.2;p.vy=dy/ln+(Math.random()-.5)*1.2;const vl=Math.sqrt(p.vx*p.vx+p.vy*p.vy)||1;p.vx/=vl;p.vy/=vl;}}
  if(near){const dx=near.wx-p.wx,dy=near.wy-p.wy;p.angle=Math.atan2(dy,dx)+(Math.random()-.5)*.5;if(nd<TILE*4&&p.cd===0&&p.ammo>0&&Math.random()<.6)shoot(p);}
}

function shoot(p){
  if(p.ammo<=0)return;
  p.cd=p.fr;p.ammo--;
  if(!p.slots)p.slots=[];p.slots.push(p.relT);
  const snow=selectedMode==='snowball',n=p.cls==='soldier'?2:1;
  for(let i=0;i<n;i++){const sp=(n>1?(i-.5)*.1:0),ang=p.angle+sp;bullets.push({wx:p.wx+Math.cos(ang)*(PR+4),wy:p.wy+Math.sin(ang)*(PR+4),vx:Math.cos(ang)*p.bspd*2,vy:Math.sin(ang)*p.bspd*2,own:p,dmg:snow?0:p.dmg,col:snow?(p.isP?'#3a80f0':'#e04040'):p.col,life:75,frz:p.cls==='mage'&&!snow,snow,team:p.isP?1:2});}
  if(p.isP)renderAmmo(p);
}

function updateBullets(){
  bullets=bullets.filter(b=>b.life>0);
  for(const b of bullets){
    b.trail=b.trail||[];b.trail.push({wx:b.wx,wy:b.wy});if(b.trail.length>4)b.trail.shift();
    b.wx+=b.vx;b.wy+=b.vy;b.life--;
    if(isWall(Math.floor(b.wy/TILE),Math.floor(b.wx/TILE))){if(b.snow)paintTile(b.wx,b.wy,b.team);hitFx(b.wx,b.wy,b.col,4);b.life=0;continue;}
    if(b.wx<0||b.wx>GC*TILE||b.wy<0||b.wy>GR*TILE){b.life=0;continue;}
    if(b.snow)paintTile(b.wx,b.wy,b.team);
    for(const p of players){
      if(!p.alive||p===b.own||p.inv>0)continue;
      if(b.snow&&p.isP===b.own.isP)continue;
      const dx=p.wx-b.wx,dy=p.wy-b.wy;
      if(Math.sqrt(dx*dx+dy*dy)<PR+5){
        if(b.snow){for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)paintTile(b.wx+dc*TILE,b.wy+dr*TILE,b.team);hurtP(p,25);}
        else{hurtP(p,b.dmg);if(b.frz)p.frz=70;}
        hitFx(b.wx,b.wy,b.col,6);b.life=0;break;
      }
    }
  }
}

function hurtP(p,dmg){if(p.inv>0)return;p.hp=Math.max(0,p.hp-dmg);p.inv=30;hitFx(p.wx,p.wy,p.col,8);if(p.hp<=0)killP(p);}
function killP(p){p.alive=false;p.hp=0;deathFx(p.wx,p.wy,p.col);if(selectedMode==='snowball')p.respawn=180;}

function doWin(){if(!currentUser)return;currentUser.wins[selectedClass]=(currentUser.wins[selectedClass]||0)+1;const st=(currentUser.streak||0)+1;currentUser.streak=st;addMountainKm(selectedMode,selectedClass,1+(st>=3?.5:0));}
function doLoss(){if(!currentUser)return;currentUser.streak=0;addMountainKm(selectedMode,selectedClass,-0.5);}

// DRAW
function draw(){
  ctx.fillStyle='#060e1e';ctx.fillRect(0,0,SW,SH);
  const sC=Math.max(0,Math.floor(camX/TILE)-1),eC=Math.min(GC,Math.ceil((camX+SW)/TILE)+1);
  const sR=Math.max(0,Math.floor(camY/TILE)-1),eR=Math.min(GR,Math.ceil((camY+SH)/TILE)+1);
  const wt=Date.now()*.001;

  for(let r=sR;r<eR;r++)for(let c=sC;c<eC;c++){
    const hp=iceHP[r][c],cell=grid[r][c],tr=iceTremor[r][c];
    const shk=tr>0?(Math.random()-.5)*(tr>ICE_TREMOR*.5?4:2):0;
    const{x,y}=toScreen(c*TILE+shk,r*TILE+shk*.5);
    if(cell===T_WALL){ctx.fillStyle='#2a3e5a';ctx.fillRect(x,y,TILE,TILE);ctx.fillStyle='#3a5272';ctx.fillRect(x+2,y+2,TILE-4,Math.floor(TILE*.48));ctx.fillStyle='#18283c';ctx.fillRect(x,y+TILE-5,TILE,5);ctx.strokeStyle='#1a2a3e';ctx.lineWidth=1;ctx.strokeRect(x,y,TILE,TILE);}
    else if(hp<=0){const w=Math.sin(wt*1.2+r*.8+c*.6);ctx.fillStyle='#06121e';ctx.fillRect(x,y,TILE,TILE);ctx.fillStyle=`rgba(15,55,110,${.2+w*.06})`;ctx.fillRect(x+2,y+Math.floor(TILE*.22),TILE-4,4);ctx.strokeStyle='rgba(15,50,90,.35)';ctx.lineWidth=.5;ctx.strokeRect(x,y,TILE,TILE);}
    else{
      const iceC=['#b0d4ee','#cce4f6','#e2f2fc','#f2faff'];ctx.fillStyle=iceC[hp-1]||'#f2faff';ctx.fillRect(x,y,TILE,TILE);
      ctx.fillStyle='rgba(255,255,255,.36)';ctx.fillRect(x+1,y+1,TILE-2,Math.floor(TILE*.2));
      if(hp<=3){ctx.strokeStyle=`rgba(70,120,170,${hp<=1?.8:hp<=2?.55:.3})`;ctx.lineWidth=hp<=1?2:hp<=2?1.2:.8;ctx.beginPath();ctx.moveTo(x+8,y+12);ctx.lineTo(x+24,y+22);ctx.moveTo(x+24,y+22);ctx.lineTo(x+18,y+36);if(hp<=2){ctx.moveTo(x+32,y+8);ctx.lineTo(x+18,y+26);}if(hp<=1){ctx.moveTo(x+2,y+2);ctx.lineTo(x+TILE-2,y+TILE-2);}ctx.stroke();}
      if(tr>ICE_TREMOR*.55){const g=(tr-ICE_TREMOR*.55)/(ICE_TREMOR*.45);ctx.fillStyle=`rgba(255,100,30,${g*.35})`;ctx.fillRect(x,y,TILE,TILE);}
      ctx.strokeStyle='rgba(180,220,255,.2)';ctx.lineWidth=.5;ctx.strokeRect(x,y,TILE,TILE);
      if(selectedMode==='snowball'&&paintGrid[r][c]!==0){ctx.fillStyle=paintGrid[r][c]===1?'rgba(40,100,220,.38)':'rgba(220,40,40,.38)';ctx.fillRect(x,y,TILE,TILE);}
    }
  }

  // Snowball/ice warning
  if(icePhase===1&&selectedMode==='showdown'){const s=Math.ceil(icePhaseTimer/60),pulse=.8+Math.sin(Date.now()*.01)*.2;ctx.save();ctx.fillStyle=`rgba(255,120,40,${pulse})`;ctx.font='bold 14px Segoe UI';ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=6;ctx.fillText(`⚠️ Ijs breekt in ${s}s!`,SW/2,52);ctx.restore();}
  if(selectedMode==='snowball'&&running){const s=Math.ceil(sbTimer/60);ctx.save();ctx.fillStyle='rgba(200,240,255,.9)';ctx.font='bold 13px Segoe UI';ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=5;ctx.fillText(`⏱️ ${s}s`,SW/2,52);ctx.restore();}

  // Particles
  ctx.save();
  for(const p of parts){const{x,y}=toScreen(p.wx,p.wy);if(x<-20||x>SW+20||y<-20||y>SH+20)continue;ctx.globalAlpha=(p.life/p.ml)*.85;ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(x,y,Math.max(.5,p.sz*(p.life/p.ml)),0,Math.PI*2);ctx.fill();}
  ctx.restore();

  // Bullets
  for(const b of bullets){
    const tr=b.trail||[];
    for(let i=0;i<tr.length;i++){const t=tr[i],{x,y}=toScreen(t.wx,t.wy);ctx.globalAlpha=(i/tr.length)*.35;ctx.fillStyle=b.col;ctx.beginPath();ctx.arc(x,y,(b.snow?5:2)*(i/tr.length)+1,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;
    const{x,y}=toScreen(b.wx,b.wy);if(x<-10||x>SW+10||y<-10||y>SH+10)continue;
    ctx.shadowColor=b.col;ctx.shadowBlur=8;
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,b.snow?7:5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=b.col;ctx.beginPath();ctx.arc(x,y,b.snow?5:3,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
  }
  ctx.globalAlpha=1;

  // Aim line
  const me=players[0];
  if(me&&me.alive&&aimState.active&&aimState.ready){const{x:px,y:py}=toScreen(me.wx,me.wy);ctx.save();ctx.strokeStyle=me.col;ctx.lineWidth=2;ctx.globalAlpha=.5;ctx.setLineDash([7,6]);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(me.angle)*100,py+Math.sin(me.angle)*100);ctx.stroke();ctx.setLineDash([]);ctx.restore();}

  for(const p of players)if(p.alive)drawP(p);

  // Fishing holes
  for(const h of fishHoles){
    const{x,y}=toScreen(h.wx-TILE/2,h.wy-TILE/2);
    if(x<-TILE||x>SW+TILE||y<-TILE||y>SH+TILE)continue;
    const wt2=Date.now()*.0012;
    ctx.fillStyle='#4ab8e8';ctx.beginPath();ctx.ellipse(x+TILE/2,y+TILE/2,TILE*.42,TILE*.3,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=`rgba(120,210,255,${.3+Math.sin(wt2+h.r*.7)*.15})`;ctx.beginPath();ctx.ellipse(x+TILE/2,y+TILE/2-4,TILE*.22,TILE*.1,0,0,Math.PI*2);ctx.fill();
    ctx.font='14px serif';ctx.textAlign='center';ctx.fillText('🐟',x+TILE/2,y+TILE/2+5);
  }
  // Crates
  for(const cr of crates){
    if(!cr.alive)continue;
    const{x,y}=toScreen(cr.wx-TILE*.33,cr.wy-TILE*.33);
    const sz=Math.floor(TILE*.66);
    ctx.fillStyle='#8b6040';ctx.fillRect(x,y,sz,sz);
    ctx.fillStyle='#a07848';ctx.fillRect(x+2,y+2,sz-4,sz*.45);
    ctx.strokeStyle='#5a3820';ctx.lineWidth=1.5;ctx.strokeRect(x,y,sz,sz);
    ctx.beginPath();ctx.moveTo(x,y+sz*.5);ctx.lineTo(x+sz,y+sz*.5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+sz*.33,y);ctx.lineTo(x+sz*.33,y+sz);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+sz*.67,y);ctx.lineTo(x+sz*.67,y+sz);ctx.stroke();
    const hpPct=cr.hp/cr.mhp;
    ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(x,y-7,sz,4);
    ctx.fillStyle=hpPct>.5?'#3ad870':'#f0c040';ctx.fillRect(x,y-7,sz*hpPct,4);
  }
  // Drops
  for(const d of drops){
    const{x,y}=toScreen(d.wx,d.wy);
    if(x<-20||x>SW+20||y<-20||y>SH+20)continue;
    const pulse=.85+Math.sin(Date.now()*.006)*.15;
    ctx.save();ctx.globalAlpha=Math.min(1,d.life/60)*pulse;
    ctx.shadowColor=d.type==='rod'?'#f0c040':'#5ac8fa';ctx.shadowBlur=10;
    ctx.fillStyle=d.type==='rod'?'rgba(240,192,60,.8)':'rgba(60,160,220,.8)';
    ctx.fillRect(x-11,y-11,22,22);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.strokeRect(x-11,y-11,22,22);
    ctx.shadowBlur=0;ctx.font='15px serif';ctx.textAlign='center';
    ctx.fillText(d.type==='rod'?'🎣':'🐟',x,y+6);
    ctx.restore();
  }
  // Fishing line
  const meP=players[0];
  if(meP&&meP.alive&&fishState.active&&fishState.holeRef){
    const{x:mx,y:my}=toScreen(meP.wx,meP.wy);
    const{x:fx,y:fy}=toScreen(fishState.holeRef.wx,fishState.holeRef.wy);
    ctx.save();
    ctx.strokeStyle=fishState.hooked?'#f0c040':'#c8a060';ctx.lineWidth=fishState.hooked?2.5:1.5;
    ctx.setLineDash(fishState.hooked?[]:[4,4]);
    ctx.beginPath();ctx.moveTo(mx,my);
    const mx2=(mx+fx)/2,my2=Math.min(my,fy)-28;
    ctx.quadraticCurveTo(mx2,my2,fx,fy);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=fishState.hooked?'#f04040':'#f0f040';
    ctx.shadowColor=fishState.hooked?'#ff0000':'#ffff00';ctx.shadowBlur=fishState.hooked?10:4;
    ctx.beginPath();ctx.arc(fx,fy,5,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
}

function drawP(p){
  const{x:px,y:py}=toScreen(p.wx,p.wy);
  if(px<-40||px>SW+40||py<-40||py>SH+40)return;
  const R=PR;
  ctx.save();
  if(p.inv>0&&Math.floor(p.inv/3)%2===0)ctx.globalAlpha=.28;
  if(p.frz>0){ctx.shadowColor='#80d0ff';ctx.shadowBlur=10;}
  if(selectedMode==='snowball'){ctx.strokeStyle=p.isP?'#3a80f0':'#e04040';ctx.lineWidth=3;ctx.beginPath();ctx.arc(px,py,R+3,0,Math.PI*2);ctx.stroke();}
  ctx.save();ctx.globalAlpha=(ctx.globalAlpha||1)*.15;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(px+2,py+2,R,R*.6,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.fillStyle=p.frz>0?'#c0e8ff':p.inWater?'#2060a0':'#16162a';ctx.beginPath();ctx.arc(px,py,R,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=p.inWater?'#4090d0':p.col;ctx.beginPath();ctx.arc(px,py,R*.58,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px+Math.cos(p.angle)*R,py+Math.sin(p.angle)*R,4,0,Math.PI*2);ctx.fill();
  const ex=px+Math.cos(p.angle)*R*.42,ey=py+Math.sin(p.angle)*R*.42,px2=-Math.sin(p.angle)*4,py2=Math.cos(p.angle)*4;
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

// MINIMAP
function drawMM(){
  const S=88;mmx.clearRect(0,0,S,S);const sc=S/GC;
  for(let r=0;r<GR;r++)for(let c=0;c<GC;c++){
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

// HUD
function renderAmmo(p){
  const wrap=document.getElementById('hud-ammo-dots');wrap.innerHTML='';
  const slots=p.slots||[];
  for(let i=0;i<p.maxA;i++){const d=document.createElement('div');if(i<p.ammo){d.className='ammo-dot';}else{const si=i-p.ammo;if(si<slots.length){const pct=Math.round((1-slots[si]/p.relT)*100);d.className='ammo-dot reload';d.style.background=`conic-gradient(${p.col} ${pct}%,#1a3050 ${pct}%)`;}else d.className='ammo-dot empty';}wrap.appendChild(d);}
}

function updateHUD(){
  const me=players[0];if(!me)return;
  const hpP=me.hp/me.mhp;
  const icons={surfer:'🏄',soldier:'🪖',mage:'🧊',tank:'🛡️'};
  document.getElementById('hud-hp-name').textContent=(icons[me.cls]||'🐧')+' '+me.name;
  document.getElementById('hud-hp-fill').style.width=(hpP*100)+'%';
  document.getElementById('hud-hp-fill').style.background=hpP>.5?'linear-gradient(90deg,#3ad870,#5ac8fa)':hpP>.25?'linear-gradient(90deg,#f0c040,#e08020)':'linear-gradient(90deg,#f04040,#c02020)';
  document.getElementById('hud-hp-txt').textContent=Math.ceil(me.hp)+' / '+me.mhp+' HP'+((me.slots||[]).length>0?' — herladen...':'');
  renderAmmo(me);
  document.getElementById('hud-sb').style.display=selectedMode==='snowball'?'flex':'none';
  document.getElementById('hud-alive').style.display=selectedMode==='snowball'?'none':'block';
  const bc=document.getElementById('hud-bots');
  if(!bc.children.length){players.slice(1).forEach((p,i)=>{const d=document.createElement('div');d.className='bot-card';d.id='bc'+i;d.innerHTML=`<div class="bot-dot" style="background:${selectedMode==='snowball'?'#e04040':p.col}"></div><div><div class="bot-nm">${p.name}</div><div class="bot-bar-bg"><div class="bot-bar-fill" id="bf${i}" style="width:100%;background:${selectedMode==='snowball'?'#e04040':p.col}"></div></div></div>`;bc.appendChild(d);});}
  players.slice(1).forEach((p,i)=>{const f=document.getElementById('bf'+i),c=document.getElementById('bc'+i);if(f)f.style.width=(p.hp/p.mhp*100)+'%';if(c)c.classList.toggle('dead',!p.alive&&selectedMode!=='snowball');});
}

// RESULT
function showResult(won){
  document.getElementById('result-screen').style.display='flex';
  document.getElementById('btn-exit').style.display='none';
  const km=getMountainKmPerChar(selectedMode,selectedClass);
  const z=getZone(km);
  if(selectedMode==='showdown'){
    document.getElementById('res-emoji').textContent=won?'🏆':'💀';
    document.getElementById('res-title').textContent=won?'JIJ WINT!':'Verloren...';
    document.getElementById('res-title').style.color=won?'#5ac8fa':'#ff7a5a';
  } else {
    const{bp,rp}=getScores();
    const w=bp>rp;
    document.getElementById('res-emoji').textContent=w?'🏆':'❌';
    document.getElementById('res-title').textContent=w?`BLAUW WINT! ${bp}% vs ${rp}%`:`ROOD WINT! ${rp}% vs ${bp}%`;
    document.getElementById('res-title').style.color=w?'#5ac8fa':'#ff7a5a';
  }
  document.getElementById('res-km').textContent=`${z.icon} ${z.name} — ${km.toFixed(1)} km`;
}

// PLAY BUTTON
document.getElementById('btn-play').addEventListener('click',()=>{
  if(!currentUser)return;
  showScreen(''); // hide all screens
  document.getElementById('hud').style.display='block';
  document.getElementById('hud-bots').innerHTML='';
  document.getElementById('btn-exit').style.display='block';
  document.getElementById('result-screen').style.display='none';
  if(isMob){document.getElementById('joystick-wrap').style.display='block';document.getElementById('shoot-btn').style.display='flex';}
  initGrid();spawnAll();initIce();initFishing();
  if(selectedMode==='snowball')initSB();
  const me=players[0];camX=me.wx-SW/2;camY=me.wy-SH/2;
  renderAmmo(me);running=true;
  if(fid)cancelAnimationFrame(fid);
  lt=performance.now();fid=requestAnimationFrame(update);
});

// EXIT
document.getElementById('btn-exit').addEventListener('click',()=>{
  running=false;if(fid)cancelAnimationFrame(fid);
  if(currentUser){currentUser.streak=0;addMountainKm(selectedMode,selectedClass,-0.5);}
  document.getElementById('hud').style.display='none';
  document.getElementById('btn-exit').style.display='none';
  if(isMob){document.getElementById('joystick-wrap').style.display='none';document.getElementById('shoot-btn').style.display='none';}
  goToMenu();
});

// RESULT BUTTONS
document.getElementById('btn-again').addEventListener('click',()=>{
  document.getElementById('result-screen').style.display='none';
  document.getElementById('btn-play').click();
});
document.getElementById('btn-menu').addEventListener('click',()=>{
  document.getElementById('result-screen').style.display='none';
  document.getElementById('hud').style.display='none';
  if(isMob){document.getElementById('joystick-wrap').style.display='none';document.getElementById('shoot-btn').style.display='none';}
  goToMenu();
});

// Expose for menu script
window.getMountainKmPerChar=getMountainKmPerChar;
window.getMountainKm=getMountainKm;
window.getZone=getZone;
window.currentUser=currentUser;
window.selectedClass=selectedClass;
window.selectedMode=selectedMode;
window.updateProfileUI=updateProfileUI;
window.updateProfileMountains=updateProfileMountains;
window.refreshMenu=refreshMenu;
