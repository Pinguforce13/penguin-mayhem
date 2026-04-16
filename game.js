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
  document.getElementById('ammo-wrap').style.bottom='220px';
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
function showMainMenu(){document.getElementById('auth-screen').style.display='none';document.getElementById('overlay').style.display='flex';document.getElementById('profile-btn').style.display='flex';document.getElementById('profile-panel').style.display='none';updateProfileUI();}
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

function isWall(r,c){if(r<0||r>=GR||c<0||c>=GC)return true;return grid[r][c]===T_WALL;}
function isWater(r,c){if(r<0||r>=GR||c<0||c>=GC)return false;return grid[r][c]!==T_WALL&&iceHP[r][c]<=0;}
function blocked(wx,wy,rad=12){
  for(const{dx,dy}of[{dx:-rad,dy:-rad},{dx:rad,dy:-rad},{dx:-rad,dy:rad},{dx:rad,dy:rad}])
    if(isWall(Math.floor((wy+dy)/TILE),Math.floor((wx+dx)/TILE)))return true;
  return false;
}

// ══════════════════════════════════════════ ICE BREAKING
let iceTimer=0;
let iceRing=1;            // start at outermost ring (ring 1 = just inside border)
let icePhase=0;
let icePhaseTimer=0;
const ICE_GRACE      = 60*14;  // 14s grace period
const ICE_TREMOR_DUR = 60*3;   // 3s shaking warning
const ICE_BREAK_DUR  = 60*1;   // 1s breaking animation
const ICE_NEXT_RING  = 60*5;   // 5s before next ring
const ICE_RING_MAX   = Math.floor(GR/2)-2; // how far inward we go

function initIce(){
  iceTimer=0; iceRing=1; icePhase=0; icePhaseTimer=ICE_GRACE;
}

function updateIce(){
  iceTimer++; icePhaseTimer--;
  for(let r=0;r<GR;r++) for(let c=0;c<GC;c++) if(iceTremor[r][c]>0)iceTremor[r][c]--;

  if(icePhaseTimer<=0){
    if(icePhase===0){
      icePhase=1; icePhaseTimer=ICE_TREMOR_DUR;
      setRingTremor(iceRing);
    } else if(icePhase===1){
      icePhase=2; icePhaseTimer=ICE_BREAK_DUR;
      breakRing(iceRing);
    } else {
      iceRing++;
      if(iceRing<=ICE_RING_MAX){ icePhase=0; icePhaseTimer=ICE_NEXT_RING; }
      else icePhase=99;
    }
  }

  // Water damage + stun
  for(const p of players){
    if(!p.alive)continue;
    const tr=Math.floor(p.wy/TILE),tc=Math.floor(p.wx/TILE);
    if(tr<0||tr>=GR||tc<0||tc>=GC)continue;
    const inWater = iceHP[tr][tc]<=0 && grid[tr][tc]!==T_WALL;
    if(inWater){
      // First frame falling in = splash + stun
      if(!p.inWater){
        p.inWater=true;
        p.stunTimer=120; // 2s stun
        spawnSplash(p.wx,p.wy);
      }
      // Slow movement in water
      p.vx*=0.5; p.vy*=0.5;
      // Damage (soft — can walk out)
      if(p.stunTimer<=0) hurtPlayer(p,0.8);
    } else {
      p.inWater=false;
    }
    if(p.stunTimer>0) p.stunTimer--;
  }
}

function setRingTremor(ring){
  for(let r=ring;r<GR-ring;r++) for(let c=ring;c<GC-ring;c++)
    if(r===ring||r===GR-1-ring||c===ring||c===GC-1-ring)
      if(grid[r][c]!==T_WALL&&iceHP[r][c]>0)
        iceTremor[r][c]=ICE_TREMOR_DUR;
}

function breakRing(ring){
  for(let r=ring;r<GR-ring;r++) for(let c=ring;c<GC-ring;c++)
    if(r===ring||r===GR-1-ring||c===ring||c===GC-1-ring)
      if(grid[r][c]!==T_WALL&&iceHP[r][c]>0){
        iceHP[r][c]=0; iceTremor[r][c]=0;
        spawnIceFx(r,c);
      }
}

function spawnIceFx(r,c){
  const wx=(c+.5)*TILE, wy=(r+.5)*TILE;
  for(let i=0;i<10;i++){
    const a=Math.random()*Math.PI*2, s=2+Math.random()*4;
    parts.push({wx:wx+(Math.random()-.5)*TILE*.6, wy:wy+(Math.random()-.5)*TILE*.6,
      vx:Math.cos(a)*s, vy:Math.sin(a)*s,
      life:20+Math.random()*20, ml:40, sz:4+Math.random()*6, col:'#d0eeff', type:'ice'});
  }
}

function spawnSplash(wx,wy){
  // Ring of water droplets
  for(let i=0;i<16;i++){
    const a=(i/16)*Math.PI*2;
    const s=2+Math.random()*3;
    parts.push({wx, wy, vx:Math.cos(a)*s, vy:Math.sin(a)*s,
      life:22+Math.random()*18, ml:40, sz:3+Math.random()*5,
      col:i%2===0?'#5ac8fa':'#90d8f8', type:'splash'});
  }
  // Big splash ring particles that arc up then fall
  for(let i=0;i<8;i++){
    const a=(i/8)*Math.PI*2;
    parts.push({wx, wy, vx:Math.cos(a)*4, vy:Math.sin(a)*4-5,
      life:30, ml:30, sz:5, col:'#b0e8ff', type:'splash', gravity:0.3});
  }
}

// ══════════════════════════════════════════ PARTICLES
let parts=[];
function spawnHitFx(wx,wy,col,n=5){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=1.5+Math.random()*3;parts.push({wx,wy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:10+Math.random()*8,ml:18,sz:2+Math.random()*3,col});}}
function spawnDeathFx(wx,wy,col){for(let i=0;i<20;i++)parts.push({wx:wx+(Math.random()-.5)*20,wy:wy+(Math.random()-.5)*20,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:22+Math.random()*18,ml:40,sz:3+Math.random()*6,col});}

// ══════════════════════════════════════════ FISHING HOLES
// Each hole: { r, c, wx, wy } — light blue water puddles on the map
let fishingHoles = [];

function initFishingHoles(){
  fishingHoles = [];
  // Place ~8 random fishing holes on floor tiles away from spawns
  const candidates = [];
  for(let r=5;r<GR-5;r++) for(let c=5;c<GC-5;c++){
    if(grid[r][c]===T_FLOOR&&iceHP[r][c]>0){
      // Not too close to spawns
      const dists = [{r:4,c:4},{r:4,c:45},{r:45,c:4},{r:45,c:45},{r:24,c:24}]
        .map(s=>Math.abs(s.r-r)+Math.abs(s.c-c));
      if(Math.min(...dists)>6) candidates.push({r,c});
    }
  }
  // Pick 8 spread out holes
  for(let i=0;i<8;i++){
    if(!candidates.length)break;
    const idx=Math.floor(Math.random()*candidates.length);
    const{r,c}=candidates.splice(idx,1)[0];
    // Remove nearby candidates to spread them out
    candidates.splice(0,candidates.length,...candidates.filter(x=>Math.abs(x.r-r)+Math.abs(x.c-c)>6));
    fishingHoles.push({r,c,wx:(c+.5)*TILE,wy:(r+.5)*TILE});
    // Clear the tile so it looks like a puddle
    grid[r][c]=T_FLOOR; // keep as floor but mark as hole
  }
}

// ══════════════════════════════════════════ CRATES
// Each crate: { wx, wy, hp:50, alive, dropped:false }
let crates = [];

function initCrates(){
  crates = [];
  for(const hole of fishingHoles){
    // 2 crates next to each fishing hole
    const offsets = [{dx:-TILE,dy:0},{dx:TILE,dy:0},{dx:0,dy:-TILE},{dx:0,dy:TILE}];
    let placed=0;
    for(const{dx,dy} of offsets){
      if(placed>=2)break;
      const cr=Math.floor((hole.wy+dy)/TILE), cc=Math.floor((hole.wx+dx)/TILE);
      if(cr>0&&cr<GR-1&&cc>0&&cc<GC-1&&grid[cr][cc]!==T_WALL){
        crates.push({wx:hole.wx+dx,wy:hole.wy+dy,hp:50,mhp:50,alive:true,dropped:false,holeRef:hole});
        placed++;
      }
    }
  }
}

function updateCrates(){
  for(const crate of crates){
    if(!crate.alive)continue;
    // Check bullet hits
    for(const b of bullets){
      const dx=crate.wx-b.wx,dy=crate.wy-b.wy;
      if(Math.sqrt(dx*dx+dy*dy)<TILE*.4){
        crate.hp-=b.dmg;
        spawnHitFx(b.wx,b.wy,'#c8a060',5);
        b.life=0;
        if(crate.hp<=0&&!crate.dropped){
          crate.alive=false;
          crate.dropped=true;
          // Drop fishing rod on the ground
          drops.push({type:'rod',wx:crate.wx,wy:crate.wy,life:900}); // 15s on ground
          spawnHitFx(crate.wx,crate.wy,'#c8a060',12);
        }
      }
    }
  }
}

// ══════════════════════════════════════════ DROPS (items on ground)
let drops = [];

function updateDrops(){
  drops=drops.filter(d=>d.life>0);
  for(const d of drops) d.life--;

  // Player picks up drops
  const me=players[0];
  if(!me||!me.alive)return;
  for(let i=drops.length-1;i>=0;i--){
    const d=drops[i];
    const dx=me.wx-d.wx,dy=me.wy-d.wy;
    if(Math.sqrt(dx*dx+dy*dy)<PLAYER_R+16){
      if(d.type==='rod'&&!inventory.rod){
        inventory.rod={hp:20,maxHp:20};
        drops.splice(i,1);
        showPickupMsg('🎣 Vishengel opgepakt!');
        renderInventory();
      } else if(d.type==='fish'){
        inventory.fish=(inventory.fish||0)+1;
        drops.splice(i,1);
        showPickupMsg('🐟 Visje opgepakt! Klik om te eten (+10 HP)');
        renderInventory();
      }
    }
  }
}

// ══════════════════════════════════════════ INVENTORY
let inventory = { rod:null, fish:0 };
let fishingState = { active:false, castX:0, castY:0, timer:0, hooked:false };
let eatTimer = 0;

function initInventory(){
  inventory={rod:null,fish:0};
  fishingState={active:false,castX:0,castY:0,timer:0,hooked:false};
  eatTimer=0;
}

function showPickupMsg(msg){
  const el=document.getElementById('pickup-msg');
  if(!el)return;
  el.textContent=msg;
  el.style.opacity='1';
  clearTimeout(el._t);
  el._t=setTimeout(()=>el.style.opacity='0',2500);
}

function renderInventory(){
  const el=document.getElementById('inventory-bar');
  if(!el)return;
  let html='';
  if(inventory.rod){
    const pct=Math.round(inventory.rod.hp/inventory.rod.maxHp*100);
    html+=`<div class="inv-slot ${fishingState.active?'active':''}" id="inv-rod" onclick="useRod()">
      <div class="inv-icon">🎣</div>
      <div class="inv-label">${inventory.rod.hp}/${inventory.rod.maxHp}</div>
    </div>`;
  }
  if(inventory.fish>0){
    html+=`<div class="inv-slot" id="inv-fish" onclick="eatFish()">
      <div class="inv-icon">🐟</div>
      <div class="inv-label">${inventory.fish}x ${eatTimer>0?'eten...':''}</div>
    </div>`;
  }
  el.innerHTML=html;
}

function useRod(){
  if(!inventory.rod||fishingState.active)return;
  const me=players[0];
  if(!me||!me.alive)return;
  // Cast in facing direction — find nearest fishing hole
  let nearHole=null,nearDist=Infinity;
  for(const h of fishingHoles){
    const dx=h.wx-me.wx,dy=h.wy-me.wy;
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d<nearDist){nearDist=d;nearHole=h;}
  }
  if(!nearHole||nearDist>TILE*4){
    showPickupMsg('🎣 Te ver van een visputje!');return;
  }
  fishingState={active:true,castX:nearHole.wx,castY:nearHole.wy,timer:180,hooked:false,holeRef:nearHole};
  showPickupMsg('🎣 Hengel uitgegooid! Wacht...');
  renderInventory();
}

function eatFish(){
  if(inventory.fish<=0||eatTimer>0)return;
  eatTimer=120; // 2s eating
}

function updateFishing(){
  if(eatTimer>0){
    eatTimer--;
    if(eatTimer===0){
      inventory.fish--;
      const me=players[0];
      if(me&&me.alive){me.hp=Math.min(me.mhp,me.hp+10);}
      showPickupMsg('🐟 +10 HP!');
      renderInventory();
    }
  }

  if(!fishingState.active)return;
  fishingState.timer--;

  // Random bite after 2-4s
  if(!fishingState.hooked&&fishingState.timer<(180-60-Math.random()*60)){
    if(Math.random()<0.03){
      fishingState.hooked=true;
      fishingState.timer=90; // 1.5s to reel in
      showPickupMsg('🐟 BEET! Klik snel op 🎣!');
    }
  }

  // Timeout — no fish
  if(fishingState.timer<=0){
    if(fishingState.hooked){
      // Too slow — fish got away
      showPickupMsg('😢 Vis ontsnapt!');
    } else {
      showPickupMsg('🎣 Niets gevangen...');
    }
    fishingState.active=false;
    renderInventory();
  }
}

// Click on rod while hooked = catch fish
document.addEventListener('click',e=>{
  if(fishingState.active&&fishingState.hooked){
    // Catch!
    drops.push({type:'fish',wx:fishingState.castX,wy:fishingState.castY,life:600});
    inventory.rod.hp-=10;
    if(inventory.rod.hp<=0){
      inventory.rod=null;
      showPickupMsg('🎣 Vishengel kapot!');
    } else {
      showPickupMsg('🐟 Vis gevangen! Loop ernaartoe.');
    }
    fishingState.active=false;
    renderInventory();
  }
});

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
    players.push({wx:s.wx,wy:s.wy,vx:0,vy:0,cls:cfg.cls,isP:cfg.isP,hp:d.hp,mhp:d.hp,spd:d.spd,fr:d.fr,ammo:d.maxA,maxA:d.maxA,relT:d.relT,relCd:0,dmg:d.dmg,bspd:d.bspd,col:d.col,name:cfg.isP?'JIJ':d.name,alive:true,cd:0,inv:0,angle:Math.PI/4,frz:0,ait:0,bob:Math.random()*Math.PI*2,inWater:false,stunTimer:0,reloadSlots:[]});
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
    // Per-bullet reload
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

  updateBullets();updateIce();updateCrates();updateDrops();updateFishing();
  for(const p of parts){p.wx+=p.vx;p.wy+=p.vy;if(p.gravity)p.vy+=p.gravity;p.vx*=.90;if(!p.gravity)p.vy*=.90;p.life--;}
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
  if(p.ait<=0){
    // Bots re-think slowly and with lots of randomness
    p.ait=35+Math.random()*45;
    if(near){
      const dx=near.wx-p.wx,dy=near.wy-p.wy,ln=Math.sqrt(dx*dx+dy*dy)||1;
      // Big wander offset — bots aren't accurate
      p.vx=dx/ln+(Math.random()-.5)*1.2;
      p.vy=dy/ln+(Math.random()-.5)*1.2;
      const vl=Math.sqrt(p.vx*p.vx+p.vy*p.vy)||1;p.vx/=vl;p.vy/=vl;
    }
  }
  if(near){
    const dx=near.wx-p.wx,dy=near.wy-p.wy;
    // Bots only shoot if close AND with a miss angle
    const missAngle=(Math.random()-.5)*.5; // up to 0.5 rad off
    p.angle=Math.atan2(dy,dx)+missAngle;
    // Only shoot when close (4 tiles) and random chance to miss a shot
    if(nd<TILE*4&&p.cd===0&&p.ammo>0&&Math.random()<0.6)shoot(p);
  }
}

function shoot(p){
  if(p.ammo<=0)return;
  p.cd=p.fr;p.ammo--;
  // Start reload timer for this bullet slot
  if(!p.reloadSlots)p.reloadSlots=[];
  p.reloadSlots.push(p.relT); // each bullet has its own countdown
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
      // Dark animated water
      const wave=Math.sin(wt*1.2+r*.8+c*.6);
      ctx.fillStyle='#06121e';ctx.fillRect(x,y,TILE,TILE);
      ctx.fillStyle=`rgba(15,55,110,${0.22+wave*.07})`;
      ctx.fillRect(x+2,y+Math.floor(TILE*.22),TILE-4,4);
      ctx.fillStyle=`rgba(15,55,110,${0.14+Math.sin(wt*1.6+r*.5+c*.9)*.05})`;
      ctx.fillRect(x+5,y+Math.floor(TILE*.58),TILE-10,3);
      ctx.strokeStyle='rgba(15,50,90,.4)';ctx.lineWidth=.5;ctx.strokeRect(x,y,TILE,TILE);
    } else {
      // Very white ice
      const iceC=['#b0d4ee','#cce4f6','#e2f2fc','#f2faff'];
      ctx.fillStyle=iceC[hp-1]||'#f2faff';ctx.fillRect(x,y,TILE,TILE);
      // Snow top
      ctx.fillStyle='rgba(255,255,255,.38)';ctx.fillRect(x+1,y+1,TILE-2,Math.floor(TILE*.2));
      // Diagonal shine
      ctx.fillStyle='rgba(255,255,255,.2)';
      ctx.beginPath();ctx.moveTo(x+3,y+3);ctx.lineTo(x+TILE*.38,y+3);ctx.lineTo(x+3,y+TILE*.38);ctx.closePath();ctx.fill();

      // Cracks
      if(hp<=3){
        ctx.strokeStyle=`rgba(70,120,170,${hp<=1?.8:hp<=2?.55:.3})`;
        ctx.lineWidth=hp<=1?2:hp<=2?1.2:.8;
        ctx.beginPath();
        ctx.moveTo(x+8,y+12);ctx.lineTo(x+24,y+22);ctx.moveTo(x+24,y+22);ctx.lineTo(x+18,y+36);
        if(hp<=2){ctx.moveTo(x+32,y+8);ctx.lineTo(x+18,y+26);ctx.moveTo(x+5,y+30);ctx.lineTo(x+16,y+18);}
        if(hp<=1){
          ctx.moveTo(x+2,y+2);ctx.lineTo(x+TILE-2,y+TILE-2);
          ctx.moveTo(x+TILE-2,y+2);ctx.lineTo(x+2,y+TILE-2);
          ctx.moveTo(x+TILE/2,y+2);ctx.lineTo(x+TILE/2,y+TILE-2);
        }
        ctx.stroke();
      }
      // Warning glow (about to break)
      if(tremor>ICE_TREMOR_DUR*.55){
        const g=(tremor-ICE_TREMOR_DUR*.55)/(ICE_TREMOR_DUR*.45);
        ctx.fillStyle=`rgba(255,100,30,${g*.35})`;ctx.fillRect(x,y,TILE,TILE);
      }
      ctx.strokeStyle='rgba(180,220,255,.22)';ctx.lineWidth=.5;ctx.strokeRect(x,y,TILE,TILE);
    }
  }

  // Warning text
  if(icePhase===1){
    const sec=Math.ceil(icePhaseTimer/60);
    const pulse=0.8+Math.sin(Date.now()*.01)*.2;
    ctx.save();ctx.fillStyle=`rgba(255,120,40,${pulse})`;
    ctx.font='bold 15px Segoe UI';ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=8;
    ctx.fillText(`⚠️ Ijs breekt in ${sec}s!`,SW/2,55);ctx.restore();
  }

  // Particles
  ctx.save();
  for(const p of parts){
    const{x,y}=toScreen(p.wx,p.wy);
    if(x<-20||x>SW+20||y<-20||y>SH+20)continue;
    ctx.globalAlpha=(p.life/p.ml)*.85;
    ctx.fillStyle=p.col;
    ctx.beginPath();ctx.arc(x,y,Math.max(.5,p.sz*(p.life/p.ml)),0,Math.PI*2);ctx.fill();
  }
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

  // Draw fishing holes (light blue puddles)
  for(const h of fishingHoles){
    const{x,y}=toScreen(h.wx-TILE/2,h.wy-TILE/2);
    if(x<-TILE||x>SW+TILE||y<-TILE||y>SH+TILE)continue;
    const wt2=Date.now()*.0012;
    // Light blue water puddle
    ctx.fillStyle='#4ab8e8';ctx.beginPath();ctx.ellipse(x+TILE/2,y+TILE/2,TILE*.42,TILE*.32,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=`rgba(120,210,255,${.3+Math.sin(wt2+h.r*.7)*.15})`;
    ctx.beginPath();ctx.ellipse(x+TILE/2,y+TILE/2-4,TILE*.25,TILE*.12,0,0,Math.PI*2);ctx.fill();
    // Shine
    ctx.fillStyle='rgba(255,255,255,.35)';
    ctx.beginPath();ctx.ellipse(x+TILE*.38,y+TILE*.38,TILE*.1,TILE*.06,-.5,0,Math.PI*2);ctx.fill();
    // Label
    ctx.font='14px serif';ctx.textAlign='center';
    ctx.fillText('🐟',x+TILE/2,y+TILE/2+5);
  }

  // Draw crates
  for(const cr of crates){
    if(!cr.alive)continue;
    const{x,y}=toScreen(cr.wx-TILE*.35,cr.wy-TILE*.35);
    const sz=Math.floor(TILE*.7);
    // Wood box
    ctx.fillStyle='#8b6040';ctx.fillRect(x,y,sz,sz);
    ctx.fillStyle='#a07848';ctx.fillRect(x+2,y+2,sz-4,sz*.45);
    // Planks
    ctx.strokeStyle='#5a3820';ctx.lineWidth=1.5;
    ctx.strokeRect(x,y,sz,sz);
    ctx.beginPath();ctx.moveTo(x,y+sz*.5);ctx.lineTo(x+sz,y+sz*.5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+sz*.33,y);ctx.lineTo(x+sz*.33,y+sz);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+sz*.67,y);ctx.lineTo(x+sz*.67,y+sz);ctx.stroke();
    // HP bar
    const hpPct=cr.hp/cr.mhp;
    ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(x,y-8,sz,5);
    ctx.fillStyle=hpPct>.5?'#3ad870':'#f0c040';ctx.fillRect(x,y-8,sz*hpPct,5);
  }

  // Draw drops (items on ground)
  for(const d of drops){
    const{x,y}=toScreen(d.wx,d.wy);
    if(x<-20||x>SW+20||y<-20||y>SH+20)continue;
    const pulse=0.85+Math.sin(Date.now()*.006)*.15;
    ctx.save();ctx.globalAlpha=Math.min(1,d.life/60)*pulse;
    // Glow
    ctx.shadowColor=d.type==='rod'?'#f0c040':'#5ac8fa';ctx.shadowBlur=12;
    // Box
    ctx.fillStyle=d.type==='rod'?'rgba(240,192,60,.8)':'rgba(60,160,220,.8)';
    ctx.fillRect(x-12,y-12,24,24);
    ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.strokeRect(x-12,y-12,24,24);
    // Icon
    ctx.shadowBlur=0;ctx.font='16px serif';ctx.textAlign='center';
    ctx.fillText(d.type==='rod'?'🎣':'🐟',x,y+6);
    ctx.restore();
  }

  // Fishing line
  const meP=players[0];
  if(meP&&meP.alive&&fishingState.active){
    const{x:mx,y:my}=toScreen(meP.wx,meP.wy);
    const{x:fx,y:fy}=toScreen(fishingState.castX,fishingState.castY);
    ctx.save();
    ctx.strokeStyle=fishingState.hooked?'#f0c040':'#c8a060';
    ctx.lineWidth=fishingState.hooked?2.5:1.5;
    ctx.setLineDash(fishingState.hooked?[]:[4,4]);
    ctx.beginPath();ctx.moveTo(mx,my);
    // Arc the line like a real fishing rod
    const mx2=(mx+fx)/2,my2=Math.min(my,fy)-30;
    ctx.quadraticCurveTo(mx2,my2,fx,fy);
    ctx.stroke();
    ctx.setLineDash([]);
    // Bobber
    ctx.fillStyle=fishingState.hooked?'#f04040':'#f0f040';
    ctx.shadowColor=fishingState.hooked?'#ff0000':'#ffff00';
    ctx.shadowBlur=fishingState.hooked?10:4;
    ctx.beginPath();ctx.arc(fx,fy,5,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
}

function drawPlayer(p){
  const{x:px,y:py}=toScreen(p.wx,p.wy);
  if(px<-40||px>SW+40||py<-40||py>SH+40)return;
  const R=PLAYER_R;
  ctx.save();
  if(p.inv>0&&Math.floor(p.inv/3)%2===0)ctx.globalAlpha=.28;
  if(p.frz>0){ctx.shadowColor='#80d0ff';ctx.shadowBlur=12;}
  if(p.inWater){ctx.shadowColor='#3080c0';ctx.shadowBlur=16;}

  // Shadow
  ctx.save();ctx.globalAlpha=(ctx.globalAlpha||1)*.15;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(px+2,py+2,R,R*.6,0,0,Math.PI*2);ctx.fill();ctx.restore();

  // Body — blue tint in water
  const bodyCol=p.frz>0?'#c0e8ff':p.inWater?'#2060a0':'#16162a';
  ctx.fillStyle=bodyCol;ctx.beginPath();ctx.arc(px,py,R,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=p.inWater?'#4090d0':p.col;ctx.beginPath();ctx.arc(px,py,R*.58,0,Math.PI*2);ctx.fill();

  // Water ripple around player
  if(p.inWater){
    const rp=Date.now()*.004;
    ctx.save();ctx.strokeStyle='rgba(80,160,220,.4)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(px,py+R*.3,R*1.3,R*.4,0,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }

  // Stun stars
  if(p.stunTimer>0&&p.isP){
    const sf=Date.now()*.005;
    for(let i=0;i<3;i++){
      const a=sf+i*(Math.PI*2/3);
      const sx=px+Math.cos(a)*R*1.2, sy=py-R+Math.sin(a)*R*.3-4;
      ctx.font='12px serif';ctx.textAlign='center';
      ctx.fillText('⭐',sx,sy);
    }
  }

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
    mmx.fillStyle=cell===T_WALL?'#2a3e5a':hp<=0?'#06121e':hp<=2?'#7aaac4':hp<=3?'#98c0d8':'#d8f0ff';
    mmx.fillRect(c*sc,r*sc,sc,sc);
  }
  for(const p of players){if(!p.alive)continue;mmx.fillStyle=p.col;mmx.beginPath();mmx.arc(p.wx/TILE*sc,p.wy/TILE*sc,p.isP?3:2,0,Math.PI*2);mmx.fill();}
  const vx=(camX/TILE)*sc,vy=(camY/TILE)*sc,vw=(SW/TILE)*sc,vh=(SH/TILE)*sc;
  mmx.strokeStyle='rgba(255,255,255,.35)';mmx.lineWidth=1;mmx.strokeRect(vx,vy,vw,vh);
}

// ══════════════════════════════════════════ HUD
function renderAmmo(p){
  const wrap=document.getElementById('ammo-dots');
  wrap.innerHTML='';
  const totalSlots=p.maxA;
  const reloading=p.reloadSlots||[];
  for(let i=0;i<totalSlots;i++){
    const d=document.createElement('div');
    if(i<p.ammo){
      // Full bullet
      d.className='ammo-dot';
    } else {
      // Empty or reloading
      const slotIdx=i-p.ammo; // index into reloading slots
      if(slotIdx<reloading.length){
        // Reloading — show progress
        const pct=Math.round((1-reloading[slotIdx]/p.relT)*100);
        d.className='ammo-dot reloading';
        d.style.background=`conic-gradient(${p.col} ${pct}%, #1a3050 ${pct}%)`;
      } else {
        d.className='ammo-dot empty';
      }
    }
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
  const reloading=(me.reloadSlots||[]).length>0;
  document.getElementById('my-hp-text').textContent=Math.ceil(me.hp)+' / '+me.mhp+' HP'+(reloading?' — herladen...':'');
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
  initGrid();spawnAll();initIce();initFishingHoles();initCrates();initInventory();drops=[];
  const me=players[0];camX=me.wx-SW/2;camY=me.wy-SH/2;
  renderAmmo(me);running=true;
  if(fid)cancelAnimationFrame(fid);
  lt=performance.now();fid=requestAnimationFrame(update);
});
