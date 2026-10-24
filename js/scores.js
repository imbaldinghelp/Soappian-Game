// scores.js - the leaderboard. For now it lives in this browser only (localStorage).
// To go online later, keep these two functions and swap their insides for calls to the database:
//   loadScores()      -> the best runs, fastest first
//   addScore(entry)   -> saves one run, returns its place in the list (0 = first), or -1 if it did not make it

const SCORES_KEY = 'soappian-scores';
const SCORES_KEPT = 50;                   // runs kept on this computer (the win screen shows the top SCORES_SHOWN)
const SCORES_SHOWN = 8;
const NAME_MAX = 8;                       // letters in a name

// Faster first; on the same time, fewer falls first.
function scoreOrder(a, b) { return a.time - b.time || a.falls - b.falls; }

function loadScores() {
  try {
    const list = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    return Array.isArray(list) ? list.filter(function (e) { return e && typeof e.time === 'number'; }).sort(scoreOrder) : [];
  } catch (e) { return []; }              // storage blocked or broken: an empty board
}

function addScore(entry) {
  const list = loadScores();
  list.push(entry);
  list.sort(scoreOrder);
  const place = list.indexOf(entry);
  try { localStorage.setItem(SCORES_KEY, JSON.stringify(list.slice(0, SCORES_KEPT))); } catch (e) { /* not saved */ }
  return place < SCORES_KEPT ? place : -1;
}

// The last name typed, so the next win starts with it.
function lastName() { try { return localStorage.getItem('soappian-name') || ''; } catch (e) { return ''; } }
function rememberName(n) { try { localStorage.setItem('soappian-name', n); } catch (e) { /* fine */ } }
