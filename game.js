// ══════════════════════════════════════════
//  PENGUIN MAYHEM — game.js
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

// ── MOBILE DETECT
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
//  ISO CONFIG
//  TW/TH large = zoomed in close-up camera
// ══════════════════════════════════════════
const TW = 100, TH = 50, TD = 26;
const GR = 48,  GC = 48;          // grid rows / cols
const CAM_LERP = 0.10;

let camC = 24, camR = 24;

function iso(c, r) {
  return {
    x: SW / 2 + (c - camC - (r - camR)) * (TW / 2),
    y: SH / 2 - 40 + (c - camC + (r - camR)) * (TH / 2),
  };
}

function onScreen(c, r) {
  const { x, y } = iso(c, r);
  return x > -TW * 2 && x < SW + TW * 2 && y > -TH * 4 && y < SH + TH * 4;
}

// ══════════════════════════════════════════
//  GRID
// ══════════════════════════════════════════
let grid = [], gfx = [];

function initGrid() {
  grid = []; gfx = [];
  for (let r = 0; r < GR; r++) {
    grid[r] = []; gfx[r] = [];
    for (let c = 0; c < GC; c++) {
      const edge = r < 2 || r >= GR - 2 || c < 2 || c >= GC - 2;
      let ph = 4;
      if (!edge) {
        const n = Math.sin(r * .35) * Math.cos(c * .35)
                + Math.sin(r * .65 + 1) * Math.cos(c * .28 + 2);
        if (n < -1.05)          ph = 0;  // water hole
        else if (Math.random() < .035) ph = 0;
      }
      grid[r][c] = ph; gfx[r][c] = 0;
    }
  }
  // Guarantee solid spawn zones
  const spawns = [{r:4,c:4},{r:4,c:43},{r:43,c:4},{r:43,c:43},{r:24,c:24}];
  spawns.forEach(({ r, c }) => {
    for (let dr = -3; dr <= 3; dr++)
      for (let dc = -3; dc <= 3; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < GR && nc >= 0 && nc < GC)
          grid[nr][nc] = 4;
      }
  });
}

function solid(r, c) {
  return r >= 0 && r < GR && c >= 0 && c < GC && grid[r][c] > 0;
}

function damageTile(r, c, n = 1) {
  if (!solid(r, c)) return;
  grid[r][c] = Math.max(0, grid[r][c] - n);
  gfx[r][c]  = 8;
  spawnIceParts(r, c);
}

// ══════════════════════════════════════════
//  ICE COLORS  — white / light blue
// ══════════════════════════════════════════
const ICE_TOP   = ['#f2faff', '#d8eef8', '#b0d8ee', '#88bcd8'];
const ICE_LEFT  = ['#cce6f6', '#a8cce2', '#80b0cc', '#5888a8'];
const ICE_RIGHT = ['#bcddf0', '#98c4dc', '#70a4c0', '#4878a0'];

function iceCol(phase) {
  const i = Math.max(0, phase - 1);
  return { t: ICE_TOP[i], l: ICE_LEFT[i], r: ICE_RIGHT[i] };
}

// ══════════════════════════════════════════
//  PARTICLES
// ══════════════════════════════════════════
let parts = [];

function spawnIceParts(r, c) {
  const s = iso(c + .5, r + .5);
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 2.5;
    parts.push({
      x: s.x, y: s.y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .4 - 1.5,
      life: 18 + Math.random() * 14, ml: 32,
      sz: 2 + Math.random() * 4,
      col: ICE_TOP[Math.max(0, (grid[r][c] || 1) - 1)],
    });
  }
}

function spawnHitFx(x, y, col) {
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 2.5;
    parts.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .4 - 1,
      life: 10 + Math.random() * 8, ml: 18,
      sz: 2 + Math.random() * 3, col,
    });
  }
}

function spawnDeathFx(x, y, col) {
  for (let i = 0; i < 22; i++) {
    parts.push({
      x: x + (Math.random() - .5) * 28,
      y: y + (Math.random() - .5) * 18,
      vx: (Math.random() - .5) * 7,
      vy: -Math.random() * 6 - 2,
      life: 35 + Math.random() * 25, ml: 60,
      sz: 4 + Math.random() * 7, col,
    });
  }
}

// ══════════════════════════════════════════
//  CLASS DEFINITIONS  — balanced
// ══════════════════════════════════════════
const CLASSES = {
  surfer:  { col:'#5ac8fa', hp:85,  spd:2.1,  fr:22, maxA:6, relT:85,  dmg:12, bspd:5.8, name:'Surfer'   },
  soldier: { col:'#ff9a5a', hp:95,  spd:1.75, fr:18, maxA:8, relT:72,  dmg:16, bspd:6.5, name:'Soldier'  },
  mage:    { col:'#a080f8', hp:70,  spd:1.6,  fr:32, maxA:4, relT:115, dmg:22, bspd:5.0, name:'Ice Mage' },
  tank:    { col:'#f0c040', hp:175, spd:1.15, fr:50, maxA:3, relT:130, dmg:22, bspd:4.5, name:'Tank'     },
};

// ══════════════════════════════════════════
//  PLAYERS & BULLETS
// ══════════════════════════════════════════
let players = [], bullets = [];

function spawnAll() {
  players = []; bullets = [];

  const spawns = [
    { r:4.5,  c:4.5  },
    { r:4.5,  c:43.5 },
    { r:43.5, c:4.5  },
    { r:43.5, c:43.5 },
    { r:24.5, c:24.5 },
  ];

  const configs = [
    { cls:'surfer',  isP:true  },
    { cls:'soldier', isP:false },
    { cls:'mage',    isP:false },
    { cls:'tank',    isP:false },
    { cls:'soldier', isP:false },
  ];

  configs.forEach((cfg, i) => {
    const d = CLASSES[cfg.cls], s = spawns[i];
    players.push({
      gr: s.r, gc: s.c, vr: 0, vc: 0,
      cls: cfg.cls, isP: cfg.isP,
      hp: d.hp, mhp: d.hp,
      spd: d.spd, fr: d.fr,
      ammo: d.maxA, maxA: d.maxA,
      relT: d.relT, relCd: 0,
      dmg: d.dmg, bspd: d.bspd,
      col: d.col, name: cfg.isP ? 'JIJ' : d.name,
      alive: true, cd: 0, inv: 0,
      fac: { r: 0, c: 1 },
      frz: 0,
      ait: 0, aid: { r: 0, c: 0 },
      bob: Math.random() * Math.PI * 2,
    });
  });
}

// ══════════════════════════════════════════
//  INPUT — keyboard
// ══════════════════════════════════════════
const K = {};
window.addEventListener('keydown', e => {
  K[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { K[e.code] = false; });

// ── JOYSTICK
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
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > JOY_R) { dx = dx / d * JOY_R; dy = dy / d * JOY_R; }
    joy.dx = dx / JOY_R; joy.dy = dy / JOY_R;
    joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
}, { passive: false });

window.addEventListener('touchend', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === joy.id) {
      joy.active = false; joy.dx = 0; joy.dy = 0;
      joyKnob.style.transform = 'translate(-50%, -50%)';
    }
  }
});

// ── SHOOT BUTTON
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

  // ── Update players
  for (const p of players) {
    if (!p.alive) continue;
    p.inv   = Math.max(0, p.inv - 1);
    p.cd    = Math.max(0, p.cd  - 1);

    // Ammo reload
    if (p.ammo < p.maxA) {
      p.relCd--;
      if (p.relCd <= 0) { p.ammo = p.maxA; p.relCd = 0; }
    }

    if (p.frz > 0) { p.frz--; continue; }

    p.isP ? doPlayerInput(p) : doBotAI(p);

    // Clamp velocity
    const MAX = p.spd * 0.052;
    p.vr = Math.max(-MAX, Math.min(MAX, p.vr));
    p.vc = Math.max(-MAX, Math.min(MAX, p.vc));

    // Move — separate axes for smooth wall sliding
    const nr = p.gr + p.vr, nc = p.gc + p.vc;
    if (solid(Math.floor(nr), Math.floor(p.gc))) p.gr = nr; else p.vr *= -.1;
    if (solid(Math.floor(p.gr), Math.floor(nc))) p.gc = nc; else p.vc *= -.1;

    // Bounds
    p.gr = Math.max(.4, Math.min(GR - .4, p.gr));
    p.gc = Math.max(.4, Math.min(GC - .4, p.gc));

    // Friction
    p.vr *= .80; p.vc *= .80;

    // Fall in water
    if (!solid(Math.floor(p.gr), Math.floor(p.gc))) killPlayer(p);

    // Heavy players slowly crack phase-1 tiles
    const tr = Math.floor(p.gr), tc = Math.floor(p.gc);
    if (grid[tr] && grid[tr][tc] === 1 && Math.random() < .006)
      damageTile(tr, tc, 1);
  }

  // ── Camera: smooth follow on player
  const me = players[0];
  if (me && me.alive) {
    camC += (me.gc - camC) * CAM_LERP;
    camR += (me.gr - camR) * CAM_LERP;
  }

  // ── Bullets
  updateBullets();

  // ── Particles
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy;
    p.vy += .13; p.vx *= .94; p.life--;
  }
  parts = parts.filter(p => p.life > 0);

  // ── Tile shake timers
  for (let r = 0; r < GR; r++)
    for (let c = 0; c < GC; c++)
      if (gfx[r][c] > 0) gfx[r][c]--;

  // ── HUD & check win
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
  const s = p.spd * 0.038;

  // Keyboard
  if (K['ArrowUp']    || K['KeyW']) { p.vr -= s; p.vc -= s; p.fac = { r:-1, c:-1 }; }
  if (K['ArrowDown']  || K['KeyS']) { p.vr += s; p.vc += s; p.fac = { r: 1, c: 1 }; }
  if (K['ArrowLeft']  || K['KeyA']) { p.vr += s; p.vc -= s; p.fac = { r: 1, c:-1 }; }
  if (K['ArrowRight'] || K['KeyD']) { p.vr -= s; p.vc += s; p.fac = { r:-1, c: 1 }; }

  // Joystick
  if (joy.active && (Math.abs(joy.dx) > .12 || Math.abs(joy.dy) > .12)) {
    p.vr += joy.dy * s * 1.5;
    p.vc += joy.dx * s * 1.5;
    if (Math.abs(joy.dx) > .15 || Math.abs(joy.dy) > .15)
      p.fac = { r: joy.dy > 0 ? 1 : -1, c: joy.dx > 0 ? 1 : -1 };
  }

  // Shoot
  if ((K['Space'] || shootHeld) && p.cd === 0 && p.ammo > 0)
    shoot(p);
}

// ══════════════════════════════════════════
//  BOT AI
// ══════════════════════════════════════════
function doBotAI(p) {
  // Find nearest enemy
  let near = null, nd = Infinity;
  for (const o of players) {
    if (!o.alive || o === p) continue;
    const dr = o.gr - p.gr, dc = o.gc - p.gc;
    const d  = Math.sqrt(dr * dr + dc * dc);
    if (d < nd) { nd = d; near = o; }
  }
  if (!near) return;

  // Recompute wander direction periodically
  p.ait--;
  if (p.ait <= 0) {
    p.ait = 18 + Math.random() * 28;
    const dr = near.gr - p.gr, dc = near.gc - p.gc;
    const ln = Math.sqrt(dr * dr + dc * dc) || 1;
    p.aid = {
      r: dr / ln + (Math.random() - .5) * .5,
      c: dc / ln + (Math.random() - .5) * .5,
    };
  }

  const s = p.spd * .038;
  p.vr += p.aid.r * s; p.vc += p.aid.c * s;

  // Face nearest enemy
  const dr = near.gr - p.gr, dc = near.gc - p.gc;
  const ln = Math.sqrt(dr * dr + dc * dc) || 1;
  p.fac = { r: dr / ln, c: dc / ln };

  if (nd < 7 && p.cd === 0 && p.ammo > 0) shoot(p);
}

// ══════════════════════════════════════════
//  SHOOT
// ══════════════════════════════════════════
function shoot(p) {
  if (p.ammo <= 0) return;
  p.cd = p.fr; p.ammo--;
  if (p.ammo === 0) p.relCd = p.relT;

  const fr = p.fac.r || 0, fc = p.fac.c || 1;
  const ln = Math.sqrt(fr * fr + fc * fc) || 1;
  const n  = p.cls === 'soldier' ? 2 : 1;   // soldier fires 2 bullets

  for (let i = 0; i < n; i++) {
    const spread = n > 1 ? (i - .5) * .12 : 0;
    bullets.push({
      gr:  p.gr + (fr / ln) * .7,
      gc:  p.gc + (fc / ln) * .7,
      vr:  (fr / ln + spread) * p.bspd * .052,
      vc:  (fc / ln - spread) * p.bspd * .052,
      own: p, dmg: p.dmg, col: p.col,
      life: 70,
      frz:  p.cls === 'mage',
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
    b.gr += b.vr; b.gc += b.vc; b.life--;

    const tr = Math.floor(b.gr), tc = Math.floor(b.gc);

    // Hit tile
    if (tr >= 0 && tr < GR && tc >= 0 && tc < GC && grid[tr][tc] > 0) {
      damageTile(tr, tc, 1);
      const s = iso(b.gc, b.gr);
      spawnHitFx(s.x, s.y - 10, b.col);
      b.life = 0; continue;
    }

    // Out of bounds
    if (b.gr < 0 || b.gr >= GR || b.gc < 0 || b.gc >= GC) {
      b.life = 0; continue;
    }

    // Hit player
    for (const p of players) {
      if (!p.alive || p === b.own || p.inv > 0) continue;
      const dr = p.gr - b.gr, dc = p.gc - b.gc;
      if (Math.sqrt(dr * dr + dc * dc) < .54) {
        hurtPlayer(p, b.dmg);
        if (b.frz) p.frz = 70;
        const s = iso(b.gc, b.gr);
        spawnHitFx(s.x, s.y - 10, b.col);
        b.life = 0; break;
      }
    }
  }
}

function hurtPlayer(p, dmg) {
  if (p.inv > 0) return;
  p.hp  = Math.max(0, p.hp - dmg);
  p.inv = 30;
  const s = iso(p.gc, p.gr);
  for (let i = 0; i < 8; i++)
    parts.push({
      x: s.x + (Math.random() - .5) * 18,
      y: s.y + (Math.random() - .5) * 10,
      vx: (Math.random() - .5) * 4, vy: -Math.random() * 3 - 1,
      life: 16 + Math.random() * 12, ml: 28,
      sz: 3 + Math.random() * 4, col: p.col,
    });
  if (p.hp <= 0) killPlayer(p);
}

function killPlayer(p) {
  p.alive = false; p.hp = 0;
  const s = iso(p.gc, p.gr);
  spawnDeathFx(s.x, s.y - TD, p.col);
}

// ══════════════════════════════════════════
//  DRAW
// ══════════════════════════════════════════
function draw() {
  ctx.clearRect(0, 0, SW, SH);

  // Sky
  const bg = ctx.createRadialGradient(SW / 2, SH * .4, 0, SW / 2, SH * .4, SW * .85);
  bg.addColorStop(0, '#0c2040'); bg.addColorStop(1, '#050d1a');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, SW, SH);

  // Stars
  ctx.save(); ctx.globalAlpha = .28; ctx.fillStyle = '#fff';
  for (let i = 0; i < 55; i++) {
    ctx.beginPath();
    ctx.arc((i * 173) % SW, (i * 97) % (SH * .5), i % 5 === 0 ? 1.5 : 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Build painter's order (back to front)
  const order = [];
  for (let r = 0; r < GR; r++)
    for (let c = 0; c < GC; c++)
      if (onScreen(c, r)) order.push({ r, c });
  order.sort((a, b) => (a.r + a.c) - (b.r + b.c));

  for (const { r, c } of order) {
    drawTile(r, c);

    // Bullets at this depth
    for (const b of bullets) {
      if (!onScreen(b.gc, b.gr)) continue;
      if (Math.floor(b.gr) !== r || Math.floor(b.gc) !== c) continue;
      const s = iso(b.gc, b.gr);
      ctx.save();
      ctx.globalAlpha   = Math.min(1, b.life / 35);
      ctx.fillStyle     = b.col;
      ctx.shadowColor   = b.col;
      ctx.shadowBlur    = 10;
      ctx.beginPath(); ctx.arc(s.x, s.y - 12, 5, 0, Math.PI * 2); ctx.fill();
      // Trail
      ctx.globalAlpha *= .35;
      ctx.beginPath(); ctx.arc(s.x - b.vr * 9, s.y - 12 - b.vc * 9, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Players at this depth
    for (const p of players)
      if (p.alive && Math.floor(p.gr) === r && Math.floor(p.gc) === c)
        drawPlayer(p);
  }

  // Particles on top
  for (const p of parts) {
    ctx.save();
    ctx.globalAlpha = (p.life / p.ml) * .85;
    ctx.fillStyle   = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.5, p.sz * (p.life / p.ml)), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ── DRAW TILE
function drawTile(r, c) {
  const ph  = grid[r][c];
  const shk = gfx[r][c] > 0 ? (Math.random() - .5) * 2 : 0;
  const { x: bx, y: by0 } = iso(c, r);
  const bx2 = bx + shk, by = by0 + shk * .5;
  const hw  = TW / 2, hh = TH / 2;

  if (ph <= 0) {
    // Water tile
    const t = Date.now() * .0008;
    ctx.save();
    ctx.globalAlpha = .22 + Math.sin(t + r * .4 + c * .6) * .05;
    ctx.fillStyle   = '#082040';
    ctx.beginPath();
    ctx.moveTo(bx2, by - hh); ctx.lineTo(bx2 + hw, by);
    ctx.lineTo(bx2, by + hh); ctx.lineTo(bx2 - hw, by);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = .07 + Math.sin(t * 1.8 + r * .5) * .04;
    ctx.strokeStyle = '#2a70b0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx2 - hw * .55, by); ctx.lineTo(bx2 + hw * .55, by); ctx.stroke();
    ctx.restore();
    return;
  }

  const col = iceCol(ph);

  // Top face
  ctx.beginPath();
  ctx.moveTo(bx2, by - hh); ctx.lineTo(bx2 + hw, by);
  ctx.lineTo(bx2, by + hh); ctx.lineTo(bx2 - hw, by);
  ctx.closePath(); ctx.fillStyle = col.t; ctx.fill();
  // Shine
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  ctx.fillRect(bx2 - hw, by - hh, hw, hh * .65);
  ctx.restore();

  // Left side
  ctx.beginPath();
  ctx.moveTo(bx2 - hw, by);     ctx.lineTo(bx2, by + hh);
  ctx.lineTo(bx2, by + hh + TD); ctx.lineTo(bx2 - hw, by + TD);
  ctx.closePath(); ctx.fillStyle = col.l; ctx.fill();

  // Right side
  ctx.beginPath();
  ctx.moveTo(bx2 + hw, by);     ctx.lineTo(bx2, by + hh);
  ctx.lineTo(bx2, by + hh + TD); ctx.lineTo(bx2 + hw, by + TD);
  ctx.closePath(); ctx.fillStyle = col.r; ctx.fill();

  // Outlines
  ctx.strokeStyle = 'rgba(0,20,50,.2)'; ctx.lineWidth = .5;
  ctx.beginPath();
  ctx.moveTo(bx2, by - hh); ctx.lineTo(bx2 + hw, by);
  ctx.lineTo(bx2, by + hh); ctx.lineTo(bx2 - hw, by); ctx.closePath(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx2 - hw, by); ctx.lineTo(bx2 - hw, by + TD);
  ctx.lineTo(bx2, by + hh + TD); ctx.lineTo(bx2, by + hh); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx2 + hw, by); ctx.lineTo(bx2 + hw, by + TD);
  ctx.lineTo(bx2, by + hh + TD); ctx.stroke();

  // Cracks on damaged tiles
  if (ph <= 3) {
    ctx.save(); ctx.strokeStyle = 'rgba(8,50,90,.38)'; ctx.lineWidth = .7;
    ctx.beginPath();
    ctx.moveTo(bx2 - 8, by - 2); ctx.lineTo(bx2 + 5, by + 5);
    ctx.moveTo(bx2 + 5, by + 5); ctx.lineTo(bx2 + 1, by + 11);
    if (ph <= 2) {
      ctx.moveTo(bx2 + 12, by - 6); ctx.lineTo(bx2 - 4, by + 5);
      ctx.moveTo(bx2 - 11, by + 2); ctx.lineTo(bx2 + 1, by - 4);
    }
    if (ph <= 1) {
      ctx.moveTo(bx2 - hw + 3, by); ctx.lineTo(bx2 + hw - 3, by);
      ctx.moveTo(bx2, by - hh + 2); ctx.lineTo(bx2, by + hh - 2);
    }
    ctx.stroke(); ctx.restore();
  }
}

// ── DRAW PLAYER
function drawPlayer(p) {
  const { x: sx, y: sy0 } = iso(p.gc, p.gr);
  const bob = Math.sin(Date.now() * .003 + p.bob) * 2;

  // Player sits ON top of tile: sy0 is top face center, subtract TD for tile height + character offset
  const px = sx;
  const py = sy0 - TD - 30 + bob;

  ctx.save();
  if (p.inv > 0 && Math.floor(p.inv / 3) % 2 === 0) ctx.globalAlpha = .25;
  if (p.frz > 0) { ctx.shadowColor = '#80d0ff'; ctx.shadowBlur = 14; }

  // Shadow on tile surface
  ctx.save();
  ctx.globalAlpha = (ctx.globalAlpha || 1) * .22;
  ctx.fillStyle   = '#000';
  ctx.beginPath(); ctx.ellipse(px, py + 36, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Body
  ctx.fillStyle = p.frz > 0 ? '#b8e4ff' : '#16162a';
  ctx.beginPath(); ctx.ellipse(px, py + 8, 12, 14, 0, 0, Math.PI * 2); ctx.fill();

  // Belly
  ctx.fillStyle = p.col;
  ctx.beginPath(); ctx.ellipse(px, py + 10, 7, 9, 0, 0, Math.PI * 2); ctx.fill();

  // Head
  ctx.fillStyle = p.frz > 0 ? '#cce8ff' : '#16162a';
  ctx.beginPath(); ctx.arc(px, py - 5, 10, 0, Math.PI * 2); ctx.fill();

  // Eyes
  const ef = p.fac.c > 0 ? 4 : p.fac.c < 0 ? -4 : 0;
  const ed = ef > 0 ? 1 : ef < 0 ? -1 : 0;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(px + ef, py - 6, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#050d1a';
  ctx.beginPath(); ctx.arc(px + ef + ed, py - 6, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(px + ef + ed * 1.5, py - 7, .7, 0, Math.PI * 2); ctx.fill();

  // Beak
  const bd = ef || 3;
  ctx.fillStyle = '#f0a030';
  ctx.beginPath();
  ctx.moveTo(px + bd * 1.1, py - 4);
  ctx.lineTo(px + bd * 2.2, py - 2);
  ctx.lineTo(px + bd * 1.1, py);
  ctx.fill();

  // Feet
  ctx.fillStyle = '#f0a030';
  ctx.beginPath(); ctx.ellipse(px - 5, py + 21, 5, 2.5, -.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(px + 5, py + 21, 5, 2.5,  .2, 0, Math.PI * 2); ctx.fill();

  // HP bar above bot
  if (!p.isP) {
    const hpP = p.hp / p.mhp;
    const bw  = 30;
    ctx.fillStyle = 'rgba(8,20,38,.75)';
    ctx.fillRect(px - bw / 2, py - 22, bw, 4);
    ctx.fillStyle = hpP > .5 ? '#3ad870' : hpP > .25 ? '#f0c040' : '#f04040';
    ctx.fillRect(px - bw / 2, py - 22, bw * hpP, 4);
  }

  // YOU indicator
  if (p.isP) {
    ctx.fillStyle = p.col;
    ctx.font = '800 10px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText('▼', px, py - 22);
  }

  // Bot class icon
  if (!p.isP) {
    ctx.font = '13px serif'; ctx.textAlign = 'center';
    ctx.fillText({ soldier:'🪖', mage:'🧊', tank:'🛡️' }[p.cls] || '🐧', px, py - 25);
  }

  // Frozen overlay
  if (p.frz > 0) {
    ctx.fillStyle = 'rgba(110,195,255,.2)';
    ctx.beginPath(); ctx.ellipse(px, py + 8, 14, 17, 0, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
}

// ══════════════════════════════════════════
//  MINIMAP
// ══════════════════════════════════════════
function drawMinimap() {
  mmx.clearRect(0, 0, 92, 92);
  mmx.fillStyle = '#04101e'; mmx.fillRect(0, 0, 92, 92);
  const sc = 92 / GC;
  for (let r = 0; r < GR; r++) {
    for (let c = 0; c < GC; c++) {
      const ph = grid[r][c];
      mmx.fillStyle = ph <= 0 ? '#081e38'
                    : ph >= 4 ? '#b0ccd8'
                    : ph === 3 ? '#90b0c0'
                    : ph === 2 ? '#7090a0'
                    : '#506070';
      mmx.fillRect(c * sc, r * sc, sc, sc);
    }
  }
  for (const p of players) {
    if (!p.alive) continue;
    mmx.fillStyle = p.col;
    mmx.beginPath();
    mmx.arc(p.gc * sc, p.gr * sc, p.isP ? 3.5 : 2, 0, Math.PI * 2);
    mmx.fill();
  }
  // View rect
  const vw = (SW / TW) * sc * .5, vh = (SH / TH) * sc * .35;
  mmx.strokeStyle = 'rgba(255,255,255,.3)'; mmx.lineWidth = 1;
  mmx.strokeRect(camC * sc - vw / 2, camR * sc - vh / 2, vw, vh);
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

  // HP bar
  const hpP = me.hp / me.mhp;
  document.getElementById('my-hp-bar').style.width      = (hpP * 100) + '%';
  document.getElementById('my-hp-bar').style.background =
    hpP > .5  ? 'linear-gradient(90deg,#3ad870,#5ac8fa)' :
    hpP > .25 ? 'linear-gradient(90deg,#f0c040,#e08020)' :
                'linear-gradient(90deg,#f04040,#c02020)';
  document.getElementById('my-hp-text').textContent =
    Math.ceil(me.hp) + ' / ' + me.mhp + ' HP' + (me.ammo === 0 ? ' — HERLADEN...' : '');

  // Ammo
  renderAmmo(me);

  // Bot cards (build once, then update)
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
//  RESULT SCREEN
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
//  START BUTTON
// ══════════════════════════════════════════
document.getElementById('play-btn').addEventListener('click', () => {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('result-text').innerHTML = '';
  document.getElementById('bot-cards').innerHTML   = '';

  initGrid();
  spawnAll();

  // Snap camera to player spawn
  camC = players[0].gc;
  camR = players[0].gr;

  // Show ammo immediately
  renderAmmo(players[0]);

  running = true;
  if (fid) cancelAnimationFrame(fid);
  lt  = performance.now();
  fid = requestAnimationFrame(update);
});
