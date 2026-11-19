/* Tiny synthesized sound effects — no audio files to download. */
(function () {
  'use strict';
  var ctx = null, enabled = true;

  function ac() {
    if (!ctx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type, vol) {
    var a = ac(); if (!a || !enabled) return;
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    var t = a.currentTime + (start || 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  window.Sound = {
    setEnabled: function (on) { enabled = on; },
    unlock: function () { ac(); },
    spin: function () { tone(220, 0, 0.08, 'triangle', 0.08); },
    stop: function (i) { tone(140 + i * 25, 0, 0.12, 'square', 0.06); },
    tease: function () { tone(660, 0, 0.15, 'sine', 0.08); tone(880, 0.12, 0.15, 'sine', 0.08); },
    win: function (size) {
      var notes = size > 1 ? [523, 659, 784, 1047, 1319] : [523, 659, 784];
      notes.forEach(function (n, i) { tone(n, i * 0.09, 0.22, 'triangle', 0.12); });
    },
    coin: function () { tone(1568, 0, 0.06, 'square', 0.03); tone(2093, 0.04, 0.08, 'square', 0.03); },
    fanfare: function () {
      [392, 523, 659, 784, 659, 784, 1047].forEach(function (n, i) { tone(n, i * 0.12, 0.25, 'triangle', 0.14); });
    }
  };
})();
