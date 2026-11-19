// Estimates payback and hit rate using the payout scale in js/config.js.
// Usage: node tools/simulate.js [spins] [payoutScale override]
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const E = require('../js/engine.js');

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8'), ctx);
const scale = process.argv[3] ? +process.argv[3] : (ctx.window.SITE_CONFIG.payoutScale || 1);
E.setPayoutScale(scale);

const N = +(process.argv[2] || 2e6);
const bet = 1000;
let paid = 0, hits = 0, features = 0, fsPaid = 0, big = 0, maxWin = 0;
for (let i = 0; i < N; i++) {
  const r = E.evaluate(E.spinGrid(), bet, 1);
  let win = r.total;
  if (r.total > 0) hits++;
  let fs = r.scatter.freeSpins;
  if (fs) {
    features++;
    while (fs > 0) {
      fs--;
      const f = E.evaluate(E.spinGrid(), bet, E.FREE_SPIN_MULTIPLIER);
      win += f.total; fsPaid += f.total;
      fs += f.scatter.freeSpins;
    }
  }
  if (win >= bet * 10) big++;
  if (win > maxWin) maxWin = win;
  paid += win;
}
console.log({
  payoutScale: scale,
  payback: (paid / (N * bet) * 100).toFixed(2) + '%',
  hitRate: (hits / N * 100).toFixed(1) + '%',
  freeSpinsEvery: Math.round(N / features) + ' spins',
  freeSpinShare: (fsPaid / paid * 100).toFixed(1) + '%',
  bigWin10xEvery: Math.round(N / big) + ' spins',
  maxWinX: maxWin / bet
});
