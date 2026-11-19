/*
 * Slot math engine — shared by every skin, so switching skins never changes
 * the odds or the balance. Pure functions; also loadable from Node for testing.
 *
 * Symbol ids:
 *   W  = Wild (reels 2-4 only, substitutes for everything except Bonus)
 *   S  = Bonus/scatter (3+ anywhere = free spins)
 *   H1..H4 = picture symbols (H1 pays most)
 *   A, K, Q, J, T(=10) = card symbols
 */
(function (root) {
  'use strict';

  var REELS = 5;
  var ROWS = 3;

  // Relative weights of each symbol on each reel.
  var REEL_WEIGHTS = [
    { S: 2, H1: 3, H2: 4, H3: 5, H4: 6, A: 8, K: 9, Q: 10, J: 11, T: 12 },
    { W: 3, S: 3, H1: 3, H2: 4, H3: 5, H4: 6, A: 8, K: 9, Q: 10, J: 11, T: 12 },
    { W: 3, S: 3, H1: 3, H2: 4, H3: 5, H4: 6, A: 8, K: 9, Q: 10, J: 11, T: 12 },
    { W: 3, S: 3, H1: 3, H2: 4, H3: 5, H4: 6, A: 8, K: 9, Q: 10, J: 11, T: 12 },
    { S: 2, H1: 3, H2: 4, H3: 5, H4: 6, A: 8, K: 9, Q: 10, J: 11, T: 12 }
  ];

  // Pay per "way", in units of (total bet / BET_DIVISOR). Index = reels matched.
  var BET_DIVISOR = 50;
  var PAYS = {
    H1: [0, 0, 0, 100, 350, 1500],
    H2: [0, 0, 0, 80, 220, 800],
    H3: [0, 0, 0, 55, 160, 500],
    H4: [0, 0, 0, 40, 110, 350],
    A:  [0, 0, 0, 18, 50, 180],
    K:  [0, 0, 0, 18, 50, 180],
    Q:  [0, 0, 0, 12, 35, 120],
    J:  [0, 0, 0, 12, 35, 120],
    T:  [0, 0, 0, 10, 30, 90]
  };
  var PAYING = ['H1', 'H2', 'H3', 'H4', 'A', 'K', 'Q', 'J', 'T'];

  // Bonus symbols anywhere: pay x total bet, plus free spins.
  var SCATTER_PAY = { 3: 2, 4: 10, 5: 50 };
  var FREE_SPINS = { 3: 8, 4: 12, 5: 20 };
  var FREE_SPIN_MULTIPLIER = 2;

  var tables = REEL_WEIGHTS.map(function (w) {
    var list = [], total = 0;
    Object.keys(w).forEach(function (k) { total += w[k]; list.push([k, total]); });
    return { list: list, total: total };
  });

  function rand() {
    if (root.crypto && root.crypto.getRandomValues) {
      var a = new Uint32Array(1);
      root.crypto.getRandomValues(a);
      return a[0] / 4294967296;
    }
    return Math.random();
  }

  function pick(reel) {
    var t = tables[reel], r = rand() * t.total;
    for (var i = 0; i < t.list.length; i++) if (r < t.list[i][1]) return t.list[i][0];
    return t.list[t.list.length - 1][0];
  }

  function randomSymbol(reel) { return pick(reel); }

  /** grid[reel][row] */
  function spinGrid() {
    var grid = [];
    for (var r = 0; r < REELS; r++) {
      var col = [];
      for (var y = 0; y < ROWS; y++) {
        var s = pick(r);
        // at most one bonus symbol per reel keeps the feature honest
        while (s === 'S' && col.indexOf('S') !== -1) s = pick(r);
        col.push(s);
      }
      grid.push(col);
    }
    return grid;
  }

  /**
   * Evaluate a grid. Returns { total, wins:[{sym,count,ways,amount,cells}], scatter:{count,amount,freeSpins,cells} }
   * cells are [reel,row] pairs to highlight.
   */
  function evaluate(grid, bet, multiplier) {
    multiplier = multiplier || 1;
    var unit = bet / BET_DIVISOR;
    var wins = [], total = 0;

    PAYING.forEach(function (sym) {
      var ways = 1, count = 0, cells = [];
      for (var r = 0; r < REELS; r++) {
        var hits = 0;
        for (var y = 0; y < ROWS; y++) {
          var s = grid[r][y];
          if (s === sym || s === 'W') { hits++; cells.push([r, y]); }
        }
        if (!hits) break;
        ways *= hits; count++;
      }
      var pay = PAYS[sym][count] || 0;
      if (count >= 3 && pay > 0) {
        // keep only cells on the reels that counted
        cells = cells.filter(function (c) { return c[0] < count; });
        var amount = Math.round(ways * pay * unit * multiplier);
        total += amount;
        wins.push({ sym: sym, count: count, ways: ways, amount: amount, cells: cells });
      }
    });

    var sc = [], scatter = { count: 0, amount: 0, freeSpins: 0, cells: sc };
    for (var r = 0; r < REELS; r++)
      for (var y = 0; y < ROWS; y++)
        if (grid[r][y] === 'S') sc.push([r, y]);
    scatter.count = sc.length;
    if (SCATTER_PAY[sc.length]) {
      scatter.amount = Math.round(bet * SCATTER_PAY[sc.length] * multiplier);
      scatter.freeSpins = FREE_SPINS[sc.length];
      total += scatter.amount;
    }

    return { total: total, wins: wins, scatter: scatter };
  }

  var api = {
    REELS: REELS, ROWS: ROWS, PAYS: PAYS, BET_DIVISOR: BET_DIVISOR,
    SCATTER_PAY: SCATTER_PAY, FREE_SPINS: FREE_SPINS,
    FREE_SPIN_MULTIPLIER: FREE_SPIN_MULTIPLIER,
    spinGrid: spinGrid, evaluate: evaluate, randomSymbol: randomSymbol
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SlotEngine = api;
})(typeof self !== 'undefined' ? self : globalThis);
