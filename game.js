// ══════════════════════════════════════════
//  PENGUIN MAYHEM — game.js
//  Top-down view, big map, walls, visible bullets, character select
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
  document.getElementById('shoot-btn').style.display    = 'flex';
  document.getElementById('ammo-wrap').style.bottom     = '165px';
  document.getElementById('kb-hint').style.display      = 'none';
  if (screen.orientation && screen.orientation.lock)
    screen.orientation.lock('landscape').catch(() => {});
}

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
//  STORM STATE
//  Zone shrinks from outside in over time
// ══════════════════════════════════════════
let stormRadius  = 0;   // current safe radius (in tiles from center)
let stormTimer   = 0;   // frames since game start
const STORM_START   = 60 * 20;  // start after 20s
const STORM_SPEED   = 0.008;    // tiles per frame shrink speed
const STORM_DAMAGE  = 0.05;     // hp per frame outside zone
const STORM_MIN_R   = 6;        // smallest safe radius

function initStorm() {
  stormRadius = GC / 2;  // start at full map size
  stormTimer  = 0;
}

function updateStorm() {
  stormTimer++;
  if (stormTimer > STORM_START) {
    stormRadius = Math.max(STORM_MIN_R, stormRadius - STORM_SPEED);
  }

  // Damage players outside the zone
  const cx = GC / 2 * TILE;
  const cy = GR / 2 * TILE;
  for (const p of players) {
    if (!p.alive) continue;
    const dx = p.wx - cx, dy = p.wy - cy;
    const dist = Math.sqrt(dx*dx + dy*dy) / TILE; // in tiles
    if (dist > stormRadius) {
      p.hp = Math.max(0, p.hp - STORM_DAMAGE);
      if (p.hp <= 0) killPlayer(p);
    }
  }
}

// ── CHARACTER SELECT
let selectedClass = 'surfer';
document.querySelectorAll('.char-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedClass = card.dataset.cls;
  });
});

// ── CHARACTER SELECT
let selectedClass = 'surfer';
document.querySelectorAll('.char-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedClass = card.dataset.cls;
  });
});

// ── CHARACTER SELECTION
let selectedClass = 'surfer';

document.querySelectorAll('.char-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedClass = card.dataset.cls;
    // Update HUD name preview
    const icons = { surfer:'🏄', soldier:'🪖', mage:'🧊', tank:'🛡️' };
    const names = { surfer:'Surfer', soldier:'Soldier', mage:'Ice Mage', tank:'Tank' };
    document.getElementById('my-hp-name').textContent = icons[selectedClass] + ' ' + names[selectedClass] + ' — JIJ';
  });
});
//  Each tile = TILE px on screen
//  Camera tracks player smoothly
// ══════════════════════════════════════════
const TILE = 72;       // px per tile — big = zoomed in
const GR = 60, GC = 60; // large grid
const CAM_LERP = 0.10;

let camX = 0, camY = 0; // camera offset in world-px (top-left corner)

// World → screen
function toScreen(wx, wy) {
  return { x: wx - camX, y: wy - camY };
}

// Grid coord → world-px center of tile
function tileCenter(c, r) {
  return { wx: c * TILE + TILE / 2, wy: r * TILE + TILE / 2 };
}

function onScreen(wx, wy, margin = TILE * 2) {
  const { x, y } = toScreen(wx, wy);
  return x > -margin && x < SW + margin && y > -margin && y < SH + margin;
}

// ══════════════════════════════════════════
//  GRID  —  0=floor, 1=wall, 2=ice(solid)
//  Players walk on floor (0), walls (1) block
// ══════════════════════════════════════════
const T_FLOOR = 0;
const T_WALL  = 1;
const T_ICE   = 2; // decorative ice patches on floor

let grid = [];

// Wall positions (hand-crafted for good gameplay)
function initGrid() {
  grid = [];
  for (let r = 0; r < GR; r++) {
    grid[r] = [];
    for (let c = 0; c < GC; c++) {
      // Border walls
      if (r === 0 || r === GR-1 || c === 0 || c === GC-1) {
        grid[r][c] = T_WALL;
      } else {
        grid[r][c] = T_FLOOR;
      }
    }
  }

  // Place ice patches (decorative)
  for (let r = 1; r < GR-1; r++)
    for (let c = 1; c < GC-1; c++)
      if (Math.random() < .12) grid[r][c] = T_ICE;

  // Place walls in clusters — cover for players
  const wallClusters = [
    // Center cross
    {r:28,c:28},{r:28,c:29},{r:28,c:30},{r:29,c:28},{r:30,c:28},
    {r:31,c:28},{r:31,c:29},{r:31,c:30},
    // Top area
    {r:8,c:10},{r:8,c:11},{r:8,c:12},{r:9,c:12},{r:10,c:12},
    {r:8,c:20},{r:9,c:20},{r:10,c:20},{r:10,c:21},{r:10,c:22},
    {r:8,c:40},{r:8,c:41},{r:9,c:41},{r:10,c:41},
    {r:8,c:48},{r:9,c:48},{r:10,c:48},{r:10,c:47},
    // Bottom area
    {r:50,c:10},{r:50,c:11},{r:51,c:11},{r:52,c:11},
    {r:50,c:22},{r:51,c:22},{r:52,c:22},{r:52,c:21},
    {r:50,c:40},{r:50,c:41},{r:51,c:40},
    {r:50,c:48},{r:51,c:48},{r:52,c:48},{r:52,c:47},
    // Mid left
    {r:20,c:8},{r:21,c:8},{r:22,c:8},{r:22,c:9},{r:22,c:10},
    {r:30,c:8},{r:31,c:8},{r:32,c:8},
    {r:40,c:8},{r:40,c:9},{r:41,c:8},{r:42,c:8},
    // Mid right
    {r:20,c:50},{r:21,c:50},{r:22,c:50},{r:22,c:49},{r:22,c:48},
    {r:30,c:50},{r:31,c:50},{r:32,c:50},
    {r:40,c:50},{r:40,c:51},{r:41,c:50},{r:42,c:50},
    // Scattered interior
    {r:15,c:15},{r:15,c:16},{r:16,c:15},
    {r:15,c:44},{r:15,c:45},{r:16,c:45},
    {r:44,c:15},{r:44,c:16},{r:45,c:15},
    {r:44,c:44},{r:44,c:45},{r:45,c:44},
    {r:22,c:28},{r:22,c:29},{r:22,c:30},{r:23,c:30},
    {r:37,c:28},{r:37,c:29},{r:37,c:30},{r:36,c:28},
    {r:28,c:22},{r:29,c:22},{r:30,c:22},{r:28,c:23},
    {r:28,c:37},{r:29,c:37},{r:30,c:37},{r:30,c:38},
  ];

  wallClusters.forEach(({ r, c }) => {
    if (r > 0 && r < GR-1 && c > 0 && c < GC-1)
      grid[r][c] = T_WALL;
  });

  // Clear spawn zones
  const spawns = [{r:4,c:4},{r:4,c:55},{r:55,c:4},{r:55,c:55},{r:29,c:29}];
  spawns.forEach(({ r, c }) => {
    for (let dr = -3; dr <= 3; dr++)
      for (let dc = -3; dc <= 3; dc++) {
        const nr = r+dr, nc = c+dc;
        if (nr > 0 && nr < GR-1 && nc > 0 && nc < GC-1)
          grid[nr][nc] = T_FLOOR;
      }
  });
}

function isWall(r, c) {
  if (r < 0 || r >= GR || c < 0 || c >= GC) return true;
  return grid[r][c] === T_WALL;
}

// Check if world position is blocked
function blocked(wx, wy, radius = 10) {
  const checks = [
    {dx: -radius, dy: -radius},{dx: radius, dy: -radius},
    {dx: -radius, dy:  radius},{dx: radius, dy:  radius},
  ];
  for (const { dx, dy } of checks) {
    const c = Math.floor((wx + dx) / TILE);
    const r = Math.floor((wy + dy) / TILE);
    if (isWall(r, c)) return true;
  }
  return false;
}

// ══════════════════════════════════════════
//  PARTICLES
// ══════════════════════════════════════════
let parts = [];

function spawnHitFx(wx, wy, col, n = 6) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3;
    parts.push({
      wx, wy,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 14 + Math.random() * 10, ml: 24,
      sz: 2 + Math.random() * 3, col,
    });
  }
}

function spawnDeathFx(wx, wy, col) {
  for (let i = 0; i < 20; i++) {
    parts.push({
      wx: wx + (Math.random() - .5) * 20,
      wy: wy + (Math.random() - .5) * 20,
      vx: (Math.random() - .5) * 6,
      vy: (Math.random() - .5) * 6,
      life: 30 + Math.random() * 20, ml: 50,
      sz: 4 + Math.random() * 6, col,
    });
  }
}

// ══════════════════════════════════════════
//  CLASSES  — balanced
// ══════════════════════════════════════════
const CLASSES = {
  surfer:  { col:'#5ac8fa', hp:85,  spd:2.2,  fr:22, maxA:6, relT:85,  dmg:14, bspd:7.0, name:'Surfer'   },
  soldier: { col:'#ff9a5a', hp:95,  spd:1.8,  fr:16, maxA:8, relT:70,  dmg:18, bspd:8.0, name:'Soldier'  },
  mage:    { col:'#a080f8', hp:70,  spd:1.6,  fr:30, maxA:4, relT:110, dmg:24, bspd:6.0, name:'Ice Mage' },
  tank:    { col:'#f0c040', hp:180, spd:1.2,  fr:45, maxA:3, relT:125, dmg:24, bspd:5.5, name:'Tank'     },
};

// ══════════════════════════════════════════
//  PLAYERS & BULLETS
// ══════════════════════════════════════════
let players = [], bullets = [];

const PLAYER_R = 14; // collision radius in world-px

function spawnAll() {
  players = []; bullets = [];

  // World-px positions
  const spawns = [
    { wx: 4.5*TILE, wy: 4.5*TILE  },
    { wx: 55.5*TILE,wy: 4.5*TILE  },
    { wx: 4.5*TILE, wy: 55.5*TILE },
    { wx: 55.5*TILE,wy: 55.5*TILE },
    { wx: 29.5*TILE,wy: 29.5*TILE },
  ];

  const allCls = ['surfer', 'soldier', 'mage', 'tank'];
  const botClasses = allCls.filter(c => c !== selectedClass);
  // Fill bots: repeat if needed
  while (botClasses.length < 4) botClasses.push(botClasses[Math.floor(Math.random()*botClasses.length)]);

  const configs = [
    { cls: selectedClass, isP: true  },
    { cls: botClasses[0], isP: false },
    { cls: botClasses[1], isP: false },
    { cls: botClasses[2], isP: false },
    { cls: botClasses[3], isP: false },
  ];

  configs.forEach((cfg, i) => {
    const d = CLASSES[cfg.cls], s = spawns[i];
    players.push({
      wx: s.wx, wy: s.wy,
      vx: 0, vy: 0,
      cls: cfg.cls, isP: cfg.isP,
      hp: d.hp, mhp: d.hp,
      spd: d.spd, fr: d.fr,
      ammo: d.maxA, maxA: d.maxA,
      relT: d.relT, relCd: 0,
      dmg: d.dmg, bspd: d.bspd,
      col: d.col, name: cfg.isP ? 'JIJ' : d.name,
      alive: true, cd: 0, inv: 0,
      angle: 0, // facing angle in radians
      frz: 0,
      ait: 0,
      bob: Math.random() * Math.PI * 2,
    });
  });
}

// ══════════════════════════════════════════
//  INPUT
// ══════════════════════════════════════════
const K = {};
window.addEventListener('keydown', e => {
  K[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { K[e.code] = false; });

// Joystick
const joy = { active: false, id: -1, dx: 0, dy: 0 };
const joyArea = document.getElementById('joystick-area');
const joyKnob = document.getElementById('joystick-knob');
const JOY_R   = 55;

function joyCenter() {
  const r = joyArea.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
joyArea.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  joy.active = true; joy.id = t.identifier; joy.dx = 0; joy.dy = 0;
}, { passive: false });
window.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!joy.active) return;
  for (const t of e.changedTouches) {
    if (t.identifier !== joy.id) continue;
    const jc = joyCenter();
    let dx = t.clientX - jc.x, dy = t.clientY - jc.y;
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d > JOY_R) { dx = dx/d*JOY_R; dy = dy/d*JOY_R; }
    joy.dx = dx/JOY_R; joy.dy = dy/JOY_R;
    joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
}, { passive: false });
window.addEventListener('touchend', e => {
  for (const t of e.changedTouches)
    if (t.identifier === joy.id) {
      joy.active = false; joy.dx = 0; joy.dy = 0;
      joyKnob.style.transform = 'translate(-50%,-50%)';
    }
});

let shootHeld = false;
const shootBtn = document.getElementById('shoot-btn');
shootBtn.addEventListener('touchstart', e => { e.preventDefault(); shootHeld = true;  }, { passive: false });
shootBtn.addEventListener('touchend',   e => { e.preventDefault(); shootHeld = false; });

// ══════════════════════════════════════════
//  GAME LOOP
// ══════════════════════════════════════════
let running = false, fid = null, lt = 0;

function update(ts) {
  const dt = Math.min(ts - lt, 50); lt = ts;
  if (!running) { fid = requestAnimationFrame(update); return; }

  for (const p of players) {
    if (!p.alive) continue;
    p.inv  = Math.max(0, p.inv - 1);
    p.cd   = Math.max(0, p.cd  - 1);

    // Reload
    if (p.ammo < p.maxA) {
      p.relCd--;
      if (p.relCd <= 0) { p.ammo = p.maxA; p.relCd = 0; }
    }

    if (p.frz > 0) { p.frz--; continue; }

    p.isP ? doPlayerInput(p) : doBotAI(p);

    // Move with collision
    const SPD = p.spd * 2.2;
    const nx = p.wx + p.vx * SPD;
    const ny = p.wy + p.vy * SPD;

    if (!blocked(nx, p.wy, PLAYER_R)) p.wx = nx; else p.vx = 0;
    if (!blocked(p.wx, ny, PLAYER_R)) p.wy = ny; else p.vy = 0;

    // Clamp to map
    p.wx = Math.max(PLAYER_R + TILE, Math.min((GC-1)*TILE - PLAYER_R, p.wx));
    p.wy = Math.max(PLAYER_R + TILE, Math.min((GR-1)*TILE - PLAYER_R, p.wy));

    p.vx *= .78; p.vy *= .78;
  }

  // Camera — follow player
  const me = players[0];
  if (me && me.alive) {
    const targetX = me.wx - SW / 2;
    const targetY = me.wy - SH / 2;
    camX += (targetX - camX) * CAM_LERP;
    camY += (targetY - camY) * CAM_LERP;
    // Clamp camera to map
    camX = Math.max(0, Math.min(GC * TILE - SW, camX));
    camY = Math.max(0, Math.min(GR * TILE - SH, camY));
  }

  updateBullets();
  updateStorm();

  for (const p of parts) {
    p.wx += p.vx; p.wy += p.vy;
    p.vx *= .92;  p.vy *= .92;
    p.life--;
  }
  parts = parts.filter(p => p.life > 0);

  updateHUD();
  drawMinimap();

  const alive = players.filter(p => p.alive);
  document.getElementById('alive-num').textContent = alive.length;
  if (alive.length <= 1) {
    running = false;
    setTimeout(() => showResult(alive[0]), 700);
  }

  draw();
  fid = requestAnimationFrame(update);
}

// ══════════════════════════════════════════
//  PLAYER INPUT
// ══════════════════════════════════════════
function doPlayerInput(p) {
  let dx = 0, dy = 0;

  if (K['ArrowLeft']  || K['KeyA']) dx -= 1;
  if (K['ArrowRight'] || K['KeyD']) dx += 1;
  if (K['ArrowUp']    || K['KeyW']) dy -= 1;
  if (K['ArrowDown']  || K['KeyS']) dy += 1;

  if (joy.active) { dx += joy.dx; dy += joy.dy; }

  const len = Math.sqrt(dx*dx + dy*dy);
  if (len > 0) {
    p.vx = dx / len;
    p.vy = dy / len;
    p.angle = Math.atan2(dy, dx);
  }

  if ((K['Space'] || shootHeld) && p.cd === 0 && p.ammo > 0) shoot(p);
}

// ══════════════════════════════════════════
//  BOT AI
// ══════════════════════════════════════════
function doBotAI(p) {
  let near = null, nd = Infinity;
  for (const o of players) {
    if (!o.alive || o === p) continue;
    const dx = o.wx - p.wx, dy = o.wy - p.wy;
    const d  = Math.sqrt(dx*dx + dy*dy);
    if (d < nd) { nd = d; near = o; }
  }
  if (!near) return;

  p.ait--;
  if (p.ait <= 0) {
    p.ait = 20 + Math.random() * 30;
    const dx = near.wx - p.wx, dy = near.wy - p.wy;
    const ln = Math.sqrt(dx*dx + dy*dy) || 1;
    p.vx = dx/ln + (Math.random()-.5)*.4;
    p.vy = dy/ln + (Math.random()-.5)*.4;
    const vl = Math.sqrt(p.vx*p.vx + p.vy*p.vy) || 1;
    p.vx /= vl; p.vy /= vl;
  }

  const dx = near.wx - p.wx, dy = near.wy - p.wy;
  p.angle = Math.atan2(dy, dx);
  if (nd < TILE * 8 && p.cd === 0 && p.ammo > 0) shoot(p);
}

// ══════════════════════════════════════════
//  SHOOT
// ══════════════════════════════════════════
function shoot(p) {
  if (p.ammo <= 0) return;
  p.cd = p.fr; p.ammo--;
  if (p.ammo === 0) p.relCd = p.relT;

  const n = p.cls === 'soldier' ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const spread = n > 1 ? (i - .5) * .1 : 0;
    const ang    = p.angle + spread;
    const spd    = p.bspd * 2.0;
    bullets.push({
      wx:   p.wx + Math.cos(ang) * (PLAYER_R + 4),
      wy:   p.wy + Math.sin(ang) * (PLAYER_R + 4),
      vx:   Math.cos(ang) * spd,
      vy:   Math.sin(ang) * spd,
      own:  p, dmg: p.dmg, col: p.col,
      life: 80,
      frz:  p.cls === 'mage',
      // Store trail positions
      trail: [],
    });
  }

  if (p.isP) renderAmmo(p);
}

// ══════════════════════════════════════════
//  BULLETS
// ══════════════════════════════════════════
function updateBullets() {
  bullets = bullets.filter(b => b.life > 0);

  for (const b of bullets) {
    // Store trail
    b.trail.push({ wx: b.wx, wy: b.wy });
    if (b.trail.length > 5) b.trail.shift();

    b.wx += b.vx; b.wy += b.vy; b.life--;

    // Hit wall
    const tc = Math.floor(b.wx / TILE);
    const tr = Math.floor(b.wy / TILE);
    if (isWall(tr, tc)) {
      spawnHitFx(b.wx, b.wy, b.col, 5);
      b.life = 0; continue;
    }

    // Out of bounds
    if (b.wx < 0 || b.wx > GC*TILE || b.wy < 0 || b.wy > GR*TILE) {
      b.life = 0; continue;
    }

    // Hit player
    for (const p of players) {
      if (!p.alive || p === b.own || p.inv > 0) continue;
      const dx = p.wx - b.wx, dy = p.wy - b.wy;
      if (Math.sqrt(dx*dx + dy*dy) < PLAYER_R + 5) {
        hurtPlayer(p, b.dmg);
        if (b.frz) p.frz = 70;
        spawnHitFx(b.wx, b.wy, b.col, 8);
        b.life = 0; break;
      }
    }
  }
}

function hurtPlayer(p, dmg) {
  if (p.inv > 0) return;
  p.hp  = Math.max(0, p.hp - dmg);
  p.inv = 35;
  spawnHitFx(p.wx, p.wy, p.col, 10);
  if (p.hp <= 0) killPlayer(p);
}

function killPlayer(p) {
  p.alive = false; p.hp = 0;
  spawnDeathFx(p.wx, p.wy, p.col);
}

// ══════════════════════════════════════════
//  DRAW — top-down view
// ══════════════════════════════════════════
function draw() {
  ctx.clearRect(0, 0, SW, SH);

  // Background (snow/ice field)
  ctx.fillStyle = '#c8e8f4';
  ctx.fillRect(0, 0, SW, SH);

  // Draw grid
  for (let r = 0; r < GR; r++) {
    for (let c = 0; c < GC; c++) {
      const wx = c * TILE, wy = r * TILE;
      const { x, y } = toScreen(wx, wy);
      if (x > SW + TILE || x < -TILE || y > SH + TILE || y < -TILE) continue;

      const cell = grid[r][c];

      if (cell === T_WALL) {
        // Wall — dark blue/grey block with 3D top
        ctx.fillStyle = '#2a3e5a';
        ctx.fillRect(x, y, TILE, TILE);
        // Top face lighter
        ctx.fillStyle = '#3a5070';
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE * .55);
        // Shadow edge
        ctx.fillStyle = '#1a2a3e';
        ctx.fillRect(x, y + TILE - 6, TILE, 6);
        // Outline
        ctx.strokeStyle = '#1a2a3e';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, TILE, TILE);
      } else {
        // Floor — white/light blue ice
        ctx.fillStyle = cell === T_ICE ? '#ddf0fa' : '#eef8ff';
        ctx.fillRect(x, y, TILE, TILE);
        // Subtle grid lines
        ctx.strokeStyle = 'rgba(160,210,240,.35)';
        ctx.lineWidth = .5;
        ctx.strokeRect(x, y, TILE, TILE);
        // Ice shine
        if (cell === T_ICE) {
          ctx.fillStyle = 'rgba(255,255,255,.4)';
          ctx.fillRect(x + 4, y + 4, TILE * .4, 3);
        }
      }
    }
  }

  // Particles (below players)
  for (const p of parts) {
    const { x, y } = toScreen(p.wx, p.wy);
    ctx.save();
    ctx.globalAlpha = (p.life / p.ml) * .8;
    ctx.fillStyle   = p.col;
    ctx.beginPath(); ctx.arc(x, y, Math.max(.5, p.sz * (p.life / p.ml)), 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Storm zone overlay
  drawStorm();

  // Bullets — draw trail + bullet
  for (const b of bullets) {
    // Trail
    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i];
      const { x, y } = toScreen(t.wx, t.wy);
      const alpha = (i / b.trail.length) * .5;
      const size  = 3 * (i / b.trail.length);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = b.col;
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    // Bullet itself
    const { x, y } = toScreen(b.wx, b.wy);
    ctx.save();
    ctx.fillStyle   = '#fff';
    ctx.shadowColor = b.col;
    ctx.shadowBlur  = 12;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = b.col;
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Players
  for (const p of players) {
    if (!p.alive) continue;
    drawPlayer(p);
  }
}

// ── DRAW PLAYER (top-down)
function drawPlayer(p) {
  const { x: px, y: py } = toScreen(p.wx, p.wy);
  const R = PLAYER_R;

  ctx.save();
  if (p.inv > 0 && Math.floor(p.inv / 3) % 2 === 0) ctx.globalAlpha = .3;

  // Shadow
  ctx.save();
  ctx.globalAlpha = (ctx.globalAlpha || 1) * .2;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(px + 3, py + 3, R, R * .7, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // Frozen glow
  if (p.frz > 0) { ctx.shadowColor = '#80d0ff'; ctx.shadowBlur = 16; }

  // Body circle
  ctx.fillStyle = p.frz > 0 ? '#c0e8ff' : '#16162a';
  ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI*2); ctx.fill();

  // Belly
  ctx.fillStyle = p.col;
  ctx.beginPath(); ctx.arc(px, py, R * .6, 0, Math.PI*2); ctx.fill();

  // Direction indicator (facing arrow)
  const ax = px + Math.cos(p.angle) * R;
  const ay = py + Math.sin(p.angle) * R;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(ax, ay, 4, 0, Math.PI*2); ctx.fill();

  // Eyes (2 dots offset from center toward facing)
  const ex = px + Math.cos(p.angle) * R * .45;
  const ey = py + Math.sin(p.angle) * R * .45;
  const perpX = -Math.sin(p.angle) * 4;
  const perpY =  Math.cos(p.angle) * 4;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(ex + perpX, ey + perpY, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(ex - perpX, ey - perpY, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#050d1a';
  ctx.beginPath(); ctx.arc(ex + perpX + Math.cos(p.angle), ey + perpY + Math.sin(p.angle), 1.3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(ex - perpX + Math.cos(p.angle), ey - perpY + Math.sin(p.angle), 1.3, 0, Math.PI*2); ctx.fill();

  // HP bar above player
  const bw = R * 2.5;
  const bx = px - bw / 2;
  const by = py - R - 12;
  const hpP = p.hp / p.mhp;
  ctx.fillStyle = 'rgba(10,24,40,.75)';
  ctx.fillRect(bx, by, bw, 5);
  ctx.fillStyle = hpP > .5 ? '#3ad870' : hpP > .25 ? '#f0c040' : '#f04040';
  ctx.fillRect(bx, by, bw * hpP, 5);

  // YOU label
  if (p.isP) {
    ctx.fillStyle = p.col;
    ctx.font = '700 10px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText('YOU', px, py - R - 16);
  }

  // Bot icon
  if (!p.isP) {
    ctx.font = '13px serif'; ctx.textAlign = 'center';
    ctx.fillText({ soldier:'🪖', mage:'🧊', tank:'🛡️' }[p.cls] || '🐧', px, py - R - 16);
  }

  // Frozen
  if (p.frz > 0) {
    ctx.fillStyle = 'rgba(110,195,255,.25)';
    ctx.beginPath(); ctx.arc(px, py, R + 4, 0, Math.PI*2); ctx.fill();
  }

  ctx.restore();
}

// ══════════════════════════════════════════
//  DRAW STORM
// ══════════════════════════════════════════
function drawStorm() {
  if (stormTimer < STORM_START - 60 * 5) return; // don't show until 5s before start

  const cx = GC / 2 * TILE;
  const cy = GR / 2 * TILE;
  const { x: scx, y: scy } = toScreen(cx, cy);
  const safeR = stormRadius * TILE;

  // Dark overlay outside safe zone using composite trick
  ctx.save();
  ctx.fillStyle = 'rgba(0, 30, 80, 0.45)';
  ctx.beginPath();
  // Full screen rect, then cut out safe circle
  ctx.rect(0, 0, SW, SH);
  ctx.arc(scx, scy, safeR, 0, Math.PI * 2, true); // clockwise = cutout
  ctx.fill();

  // Pulsing warning ring
  const pulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
  ctx.strokeStyle = `rgba(80, 180, 255, ${0.4 + pulse * 0.4})`;
  ctx.lineWidth   = 3 + pulse * 3;
  ctx.beginPath();
  ctx.arc(scx, scy, safeR, 0, Math.PI * 2);
  ctx.stroke();

  // Warning text if storm not started yet
  if (stormTimer < STORM_START) {
    const sec = Math.ceil((STORM_START - stormTimer) / 60);
    ctx.fillStyle = 'rgba(80,180,255,0.9)';
    ctx.font = '700 14px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(`⚠️ Storm begint over ${sec}s`, SW / 2, 60);
  }

  ctx.restore();
}

// ══════════════════════════════════════════
//  MINIMAP
// ══════════════════════════════════════════
function drawMinimap() {
  const S = 92;
  mmx.clearRect(0, 0, S, S);
  const sc = S / GC;

  for (let r = 0; r < GR; r++) {
    for (let c = 0; c < GC; c++) {
      const cell = grid[r][c];
      mmx.fillStyle = cell === T_WALL ? '#2a3e5a' : cell === T_ICE ? '#aad8f0' : '#d0eefa';
      mmx.fillRect(c * sc, r * sc, sc, sc);
    }
  }

  for (const p of players) {
    if (!p.alive) continue;
    mmx.fillStyle = p.col;
    mmx.beginPath();
    mmx.arc(p.wx / TILE * sc, p.wy / TILE * sc, p.isP ? 3 : 2, 0, Math.PI*2);
    mmx.fill();
  }

  // Storm zone on minimap
  const mscx = GC / 2 * sc;
  const mscy = GR / 2 * sc;
  const msafeR = stormRadius * sc;
  mmx.strokeStyle = 'rgba(80,180,255,0.7)';
  mmx.lineWidth = 1.5;
  mmx.beginPath();
  mmx.arc(mscx, mscy, msafeR, 0, Math.PI * 2);
  mmx.stroke();

  // View rect
  const vx = (camX / TILE) * sc;
  const vy = (camY / TILE) * sc;
  const vw = (SW   / TILE) * sc;
  const vh = (SH   / TILE) * sc;
  mmx.strokeStyle = 'rgba(255,255,255,.4)'; mmx.lineWidth = 1;
  mmx.strokeRect(vx, vy, vw, vh);
}

// ══════════════════════════════════════════
//  HUD
// ══════════════════════════════════════════
function renderAmmo(p) {
  const wrap = document.getElementById('ammo-dots');
  wrap.innerHTML = '';
  for (let i = 0; i < p.maxA; i++) {
    const d = document.createElement('div');
    d.className = 'ammo-dot' + (i >= p.ammo ? ' empty' : '');
    wrap.appendChild(d);
  }
}

function updateHUD() {
  const me = players[0]; if (!me) return;
  const hpP = me.hp / me.mhp;

  // Update name dynamically based on chosen class
  const icons = { surfer:'🏄', soldier:'🪖', mage:'🧊', tank:'🛡️' };
  document.getElementById('my-hp-name').textContent =
    (icons[me.cls] || '🐧') + ' ' + me.name.toUpperCase() + ' — JIJ';
  document.getElementById('my-hp-name').style.color = me.col;

  document.getElementById('my-hp-bar').style.width      = (hpP * 100) + '%';
  document.getElementById('my-hp-bar').style.background =
    hpP > .5  ? 'linear-gradient(90deg,#3ad870,#5ac8fa)' :
    hpP > .25 ? 'linear-gradient(90deg,#f0c040,#e08020)' :
                'linear-gradient(90deg,#f04040,#c02020)';
  document.getElementById('my-hp-text').textContent =
    Math.ceil(me.hp) + ' / ' + me.mhp + ' HP' + (me.ammo === 0 ? ' — HERLADEN...' : '');

  renderAmmo(me);

  const bc = document.getElementById('bot-cards');
  if (!bc.children.length) {
    players.slice(1).forEach((p, i) => {
      const d = document.createElement('div');
      d.className = 'bot-card'; d.id = 'bc' + i;
      d.innerHTML = `
        <div class="bot-dot" style="background:${p.col}"></div>
        <div class="bot-info">
          <div class="bot-name">${p.name}</div>
          <div class="bot-bar-bg">
            <div class="bot-bar-fill" id="bbf${i}" style="width:100%;background:${p.col}"></div>
          </div>
        </div>`;
      bc.appendChild(d);
    });
  }
  players.slice(1).forEach((p, i) => {
    const f = document.getElementById('bbf' + i);
    const c = document.getElementById('bc'  + i);
    if (f) f.style.width = (p.hp / p.mhp * 100) + '%';
    if (c) c.classList.toggle('dead', !p.alive);
  });
}

// ══════════════════════════════════════════
//  RESULT
// ══════════════════════════════════════════
function showResult(winner) {
  document.getElementById('overlay').style.display = 'flex';
  const rt = document.getElementById('result-text');
  if (!winner)
    rt.innerHTML = '<span class="lose">💀 Iedereen dood — gelijkspel!</span>';
  else if (winner.isP)
    rt.innerHTML = '<span class="win">🏆 JIJ WINT! Respect!</span>';
  else
    rt.innerHTML = `<span class="lose">💀 ${winner.name} won. Opnieuw?</span>`;
  document.getElementById('play-btn').textContent = '▶ OPNIEUW';
}

// ══════════════════════════════════════════
//  START
// ══════════════════════════════════════════
document.getElementById('play-btn').addEventListener('click', () => {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('result-text').innerHTML = '';
  document.getElementById('bot-cards').innerHTML   = '';

  initGrid();
  spawnAll();
  initStorm();

  // Snap camera
  const me = players[0];
  camX = me.wx - SW / 2;
  camY = me.wy - SH / 2;

  renderAmmo(me);

  running = true;
  if (fid) cancelAnimationFrame(fid);
  lt  = performance.now();
  fid = requestAnimationFrame(update);
});
