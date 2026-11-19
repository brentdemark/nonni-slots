// node tools/simulate.js [spins]  — estimates return-to-player and hit rate
const E = require(process.argv[3] || '../js/engine.js');
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
  RTP: (paid / (N * bet) * 100).toFixed(2) + '%',
  hitRate: (hits / N * 100).toFixed(1) + '%',
  freeSpinsEvery: Math.round(N / features) + ' spins',
  freeSpinShare: (fsPaid / paid * 100).toFixed(1) + '%',
  bigWin10xEvery: Math.round(N / big) + ' spins',
  maxWinX: maxWin / bet
});
