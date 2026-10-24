// check-level.js - optional helper. Run after editing js/level.js:   node tools/check-level.js
// (needs Node.js; takes a few minutes. For a quick rough check: ANGLE_STEP=10 POWER_STEP=0.1 node tools/check-level.js)
//
// A bot tries many shots from every place the soap can come to a full stop and reports whether the pump soap
// can be reached, the shortest shot sequence it found, and how forgiving each shot is.
// It uses the real game physics (js/config.js, js/level.js, js/soap.js). The player can also shoot
// while sliding, so this is a strict test: if it passes, the level is beatable even without that.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = path.join(__dirname, '..', 'js');
const SOURCE = ['config.js', 'level.js', 'soap.js']
  .map(function (f) { return fs.readFileSync(path.join(dir, f), 'utf8'); }).join('\n');

const ANGLE_STEP = Number(process.env.ANGLE_STEP || 6);   // degrees between tried angles
const POWER_STEP = Number(process.env.POWER_STEP || 0.06);
const MAX_FRAMES = 60 * 25;                                // give up on a shot after 25 s

// A simulator. The search uses 4 physics substeps (twice as fast); the final checks use the game's own.
function makeSim(substeps) {
  let src = SOURCE;
  if (substeps) src = src.replace(/const SUBSTEPS = \d+;/, 'const SUBSTEPS = ' + substeps + ';');
  const A = vm.runInNewContext(src + '\n({newGame, physicsFrame, launch, LEVEL, SOAP_W, SOAP_H})', { Math: Math });
  const game = A.newGame();
  game.state = 'play';

  function setState(st) {
    const s = game.soap;
    s.x = st.x - A.SOAP_W / 2; s.y = st.y - A.SOAP_H;
    s.vx = 0; s.vy = 0; s.ground = null; s.restT = 0; s.still = false; s.canAim = false; s.airT = 0; s.wasAir = true; s.sq = 0;
    s.peakY = s.y; s.flopT = 0; game.maxZone = st.mz; game.state = 'play';
  }
  function result(startMz) {
    const s = game.soap;
    return { x: s.x + s.w / 2, y: s.y + s.h, mz: Math.max(startMz, game.maxZone),
             won: game.state === 'winning', rested: s.still, block: game.solids.indexOf(s.ground) };
  }
  function settle() {
    for (let i = 0; i < MAX_FRAMES && !game.soap.still; i++) A.physicsFrame(game, 1 / 60);
  }
  function shoot(st, angle, p) {
    setState(st);
    game.meter.p = p;
    const a = angle * Math.PI / 180;
    A.launch(game, Math.cos(a), -Math.sin(a));
    let frames = 0;
    while (frames < MAX_FRAMES && game.state === 'play' && !game.soap.still) { A.physicsFrame(game, 1 / 60); frames++; }
    const r = result(st.mz);
    r.secs = frames / 60;
    return r;
  }
  return { A: A, game: game, setState: setState, settle: settle, shoot: shoot, result: result };
}

function key(r) { return Math.round(r.x / 70) + ',' + Math.round(r.y / 12) + ',' + r.mz; }
function show(r) { return '(' + Math.round(r.x) + ', ' + Math.round(r.y) + ') zone ' + (r.mz + 1); }

// ---------- search ----------
const sim = makeSim(4);
sim.setState({ x: sim.A.LEVEL.start.x, y: sim.A.LEVEL.start.y, mz: 0 });
sim.settle();
const start = sim.result(0);

const seen = new Map();
const reachedBlocks = new Set();
const queue = [start];
seen.set(key(start), { st: start, parent: null, shot: null });
let winner = null, sims = 0, expanded = 0, bestMz = 0, bestY = start.y;
const t0 = Date.now();

while (queue.length && !winner) {
  const st = queue.shift();
  if (st.mz < bestMz || st.y > bestY + 500) continue;      // far below the best progress: not worth searching from
  const node = seen.get(key(st));
  expanded++;
  if (expanded % 20 === 0) console.log('  ...' + expanded + ' places searched, ' + queue.length + ' waiting, highest so far: zone ' + (bestMz + 1) + ', y ' + Math.round(bestY));
  for (let ang = 5; ang <= 175 && !winner; ang += ANGLE_STEP) {
    for (let p = 0.3; p <= 1.0001 && !winner; p += POWER_STEP) {
      const r = sim.shoot(st, ang, p); sims++;
      if (r.won) { winner = { st: st, r: r, ang: ang, p: p, node: node }; break; }
      if (!r.rested) continue;
      if (r.block >= 0) reachedBlocks.add(r.block);
      if (r.mz > bestMz || (r.mz === bestMz && r.y < bestY)) { bestMz = r.mz; bestY = r.y; }
      const k = key(r);
      if (!seen.has(k)) {
        seen.set(k, { st: r, parent: node, shot: { ang: ang, p: p, secs: r.secs, from: st } });
        queue.push(r);
      }
    }
  }
}

console.log('Simulated ' + sims + ' shots in ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s, ' + seen.size + ' resting places found.');
if (!winner) {
  console.log('RESULT: the pump soap could NOT be reached. Highest place reached: zone ' + (bestMz + 1) + ', y ' + Math.round(bestY));
  process.exit(1);
}

const steps = [{ from: winner.st, to: winner.r, ang: winner.ang, p: winner.p, secs: winner.r.secs, win: true }];
for (let n = winner.node; n && n.parent; n = n.parent) {
  steps.unshift({ from: n.shot.from, to: n.st, ang: n.shot.ang, p: n.shot.p, secs: n.shot.secs });
}
console.log('RESULT: reachable. Shortest sequence found is ' + steps.length + ' shots.\n');

// ---------- final checks with the game's own settings ----------
// The search used a faster approximation, so here every step is re-done with the real game
// settings: from where the soap really is, look for a shot close to the bot's that reaches the
// same place. Then measure how forgiving that shot is.
const real = makeSim(0);
let cur = { x: real.A.LEVEL.start.x, y: real.A.LEVEL.start.y, mz: 0 };
real.setState(cur); real.settle(); cur = real.result(0);

function arrived(stp, r) {
  return stp.win ? r.won : (r.rested && Math.abs(r.x - stp.to.x) < 250 && Math.abs(r.y - stp.to.y) < 40);
}

let replayOk = true;
steps.forEach(function (stp, i) {
  let best = null;
  for (let da = -6; da <= 6 && !(best && best.d === 0); da += 1) {
    for (let dp = -0.1; dp <= 0.1001; dp += 0.02) {
      const p = Math.min(1, Math.max(0, stp.p + dp));
      const r = real.shoot(cur, stp.ang + da, p);
      const d = Math.abs(da) / 6 + Math.abs(dp) / 0.1;
      if (arrived(stp, r) && (!best || d < best.d)) best = { d: d, ang: stp.ang + da, p: p, r: r };
    }
  }
  if (!best) {
    replayOk = false;
    console.log('Shot ' + (i + 1) + ': from ' + show(cur) + ' no shot close to the bot\'s reaches ' + (stp.win ? 'the pump soap' : show(stp.to)) + ' with the real settings.');
    if (!stp.win) { real.setState(stp.to); real.settle(); cur = real.result(stp.to.mz); }   // check the rest from where the search was
    return;
  }
  let good = 0, total = 0;
  for (let da = -2; da <= 2; da += 1) {
    for (let dp = -0.03; dp <= 0.0301; dp += 0.015) {
      const q = real.shoot(cur, best.ang + da, Math.min(1, Math.max(0, best.p + dp)));
      total++;
      if (arrived(stp, q)) good++;
    }
  }
  console.log('Shot ' + (i + 1) + ': ' + show(cur) + ' -> ' + (stp.win ? 'PUMP SOAP' : show(best.r)) +
    '   angle ' + best.ang + ' deg, meter ' + best.p.toFixed(2) + ', ' + best.r.secs.toFixed(1) + ' s, forgiving ' + Math.round(100 * good / total) + '%');
  if (best.r.rested) cur = best.r;
});
console.log(replayOk ? '\nCheck with the real game settings: OK, the whole sequence reaches the pump soap.'
                     : '\nCheck with the real game settings: a step failed. Re-run, or nudge the platform positions.');

// ---------- platforms never used ----------
const lonely = [];
sim.game.solids.forEach(function (b, i) {
  if (b.surface === 'wall' || reachedBlocks.has(i)) return;
  lonely.push('(' + b.x + ', ' + b.y + ') ' + b.surface);
});
if (lonely.length) console.log('\nNever stood on during the search (fine for slopes and decoys, check anything else): ' + lonely.join('; '));
