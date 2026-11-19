(function () {
  'use strict';

  var E = window.SlotEngine;
  var CFG = window.SITE_CONFIG;
  E.setPayoutScale(CFG.payoutScale || 1);
  var SKINS = window.SKINS;
  var STORE_KEY = 'luckyParlor.v1';
  var $ = function (id) { return document.getElementById(id); };

  /* ------------------------------------------------------------------ *
   * Saved state (localStorage, falls back to a cookie, then to memory)
   * ------------------------------------------------------------------ */
  var defaults = {
    balance: CFG.startingCoins,
    betIndex: CFG.defaultBetIndex,
    skin: CFG.defaultSkin,
    sound: true,
    fast: false,
    xp: 0,
    level: 1,
    lastBonus: 0,
    freeSpins: 0,
    freeSpinBet: 0,
    freeSpinWin: 0,
    grid: null,
    stats: { spins: 0, biggestWin: 0 }
  };

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) {}
    if (!raw) {
      var m = document.cookie.match(new RegExp('(?:^|; )' + STORE_KEY + '=([^;]*)'));
      if (m) raw = decodeURIComponent(m[1]);
    }
    var s = {};
    try { s = raw ? JSON.parse(raw) : {}; } catch (e) { s = {}; }
    var out = {};
    Object.keys(defaults).forEach(function (k) { out[k] = s[k] !== undefined ? s[k] : defaults[k]; });
    if (!(out.balance >= 0)) out.balance = CFG.startingCoins;
    if (!CFG.bets[out.betIndex]) out.betIndex = CFG.defaultBetIndex;
    if (!SKINS.some(function (k) { return k.id === out.skin; })) out.skin = CFG.defaultSkin;
    return out;
  }

  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 150);
  }
  function saveNow() {
    var data = JSON.stringify(state);
    try { localStorage.setItem(STORE_KEY, data); return; } catch (e) {}
    try {
      document.cookie = STORE_KEY + '=' + encodeURIComponent(data) +
        '; max-age=' + 60 * 60 * 24 * 365 * 5 + '; path=/; SameSite=Lax';
    } catch (e) {}
  }

  var state = load();

  /* ------------------------------------------------------------------ *
   * Formatting helpers
   * ------------------------------------------------------------------ */
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function short(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(n % 1e9 ? 1 : 0) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(n % 1e3 ? 1 : 0) + 'K';
    return String(n);
  }

  /* ------------------------------------------------------------------ *
   * Skins
   * ------------------------------------------------------------------ */
  var skin = null;

  function applySkin(id) {
    skin = SKINS.filter(function (s) { return s.id === id; })[0] || SKINS[0];
    state.skin = skin.id;
    var t = skin.theme, r = document.documentElement.style;
    r.setProperty('--bg1', t.bg1); r.setProperty('--bg2', t.bg2);
    r.setProperty('--frame', t.frame); r.setProperty('--frame-dark', t.frameDark);
    r.setProperty('--reel-bg', t.reelBg); r.setProperty('--reel-bg2', t.reelBg2);
    r.setProperty('--panel', t.panel); r.setProperty('--panel2', t.panel2);
    r.setProperty('--accent', t.accent); r.setProperty('--text', t.text);
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', t.bg2);
    $('gameTitle').textContent = t.title || skin.name;
    defaultBanner();
    if (reelEls.length) renderGrid(currentGrid);
    save();
  }

  function iconHTML(icon) {
    if (/\.(png|webp|svg|jpe?g|gif|avif)$/i.test(icon)) return '<img src="' + icon + '" alt="">';
    return icon;
  }

  function symbolEl(id) {
    var def = skin.symbols[id];
    var el = document.createElement('div');
    if (def.icon) {
      el.className = 'sym pic';
      el.style.setProperty('--ring', def.ring || '');
      el.innerHTML = '<span class="icon">' + iconHTML(def.icon) + '</span>' +
        (def.label ? '<span class="tag">' + def.label + '</span>' : '');
    } else {
      el.className = 'sym card' + (id === 'T' ? ' ten' : '');
      el.style.color = def.color;
      el.innerHTML = '<span>' + (id === 'T' ? '10' : id) + '</span>';
    }
    el.setAttribute('aria-label', def.name);
    return el;
  }

  function cellEl(id) {
    var c = document.createElement('div');
    c.className = 'cell';
    c.dataset.s = id;
    c.appendChild(symbolEl(id));
    return c;
  }

  /* ------------------------------------------------------------------ *
   * Reels
   * ------------------------------------------------------------------ */
  var reelsEl = $('reels');
  var reelEls = [], stripEls = [];
  var currentGrid = state.grid || E.spinGrid();

  function buildReels() {
    reelsEl.innerHTML = '';
    reelEls = []; stripEls = [];
    for (var r = 0; r < E.REELS; r++) {
      var reel = document.createElement('div');
      reel.className = 'reel';
      var strip = document.createElement('div');
      strip.className = 'strip';
      reel.appendChild(strip);
      reelsEl.appendChild(reel);
      reelEls.push(reel); stripEls.push(strip);
    }
    sizeReels();
    renderGrid(currentGrid);
  }

  function renderGrid(grid) {
    for (var r = 0; r < E.REELS; r++) {
      var strip = stripEls[r];
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      strip.innerHTML = '';
      for (var y = 0; y < E.ROWS; y++) strip.appendChild(cellEl(grid[r][y]));
    }
  }

  var cellH = 110;
  function sizeReels() {
    var w = reelEls[0] ? reelEls[0].clientWidth : 150;
    var vh = window.innerHeight;
    // keep the machine on screen on short (landscape phone / laptop) displays
    var maxByHeight = Math.max(60, (vh - 330) / 3);
    cellH = Math.round(Math.min(w * (window.innerWidth < 760 ? 1.2 : 0.9), maxByHeight, 170));
    document.documentElement.style.setProperty('--ch', cellH + 'px');
  }
  window.addEventListener('resize', function () { if (!spinning) sizeReels(); });

  function animateReels(grid, onReelStop, onDone) {
    var fast = state.fast;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var base = fast ? 380 : 900, step = fast ? 110 : 260;
    var filler = fast ? 10 : 22;
    var bonusSoFar = 0;
    var extra = 0;

    // reel-by-reel durations; slow down later reels if 2 bonus symbols already showing
    var durations = [];
    for (var r = 0; r < E.REELS; r++) {
      durations.push(base + r * step + extra);
      if (grid[r].indexOf('S') !== -1) bonusSoFar++;
      if (bonusSoFar >= 2 && r < E.REELS - 1 && !fast) extra += 700;
    }

    var stopped = 0;
    for (r = 0; r < E.REELS; r++) (function (r) {
      var strip = stripEls[r];
      var old = currentGrid[r];
      var n = filler + r * (fast ? 2 : 4);
      var frag = document.createDocumentFragment();
      // strip from top to bottom: new symbols, filler, old symbols (visible at start)
      grid[r].forEach(function (s) { frag.appendChild(cellEl(s)); });
      for (var i = 0; i < n; i++) frag.appendChild(cellEl(E.randomSymbol(r)));
      old.forEach(function (s) { frag.appendChild(cellEl(s)); });
      strip.innerHTML = '';
      strip.appendChild(frag);
      var startY = -(n + E.ROWS) * cellH;
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(' + startY + 'px)';
      strip.classList.add('blur');
      void strip.offsetHeight; // reflow so the transition runs

      var d = reduce ? 150 : durations[r];
      strip.style.transition = 'transform ' + d + 'ms cubic-bezier(.2,.55,.3,1)';
      strip.style.transform = 'translateY(0)';

      setTimeout(function () {
        strip.classList.remove('blur');
        Sound.stop(r);
        if (strip.animate && !reduce) setTimeout(function () {
          strip.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(' + Math.round(cellH * .08) + 'px)' }, { transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' });
        }, 150);
        onReelStop(r);
      }, Math.max(0, d - 120));

      setTimeout(function () {
        // trim strip back to the three visible symbols
        strip.style.transition = 'none';
        while (strip.children.length > E.ROWS) strip.removeChild(strip.lastChild);
        stopped++;
        if (stopped === E.REELS) onDone();
      }, d + 30);
    })(r);
  }

  /* ------------------------------------------------------------------ *
   * UI updates
   * ------------------------------------------------------------------ */
  var shownBalance = state.balance;
  var balanceAnim = null;

  function setBalanceDisplay(animated) {
    cancelAnimationFrame(balanceAnim);
    var target = state.balance;
    if (!animated || Math.abs(target - shownBalance) < 2) {
      shownBalance = target;
      $('balance').textContent = fmt(target);
      return;
    }
    var from = shownBalance, t0 = performance.now(), dur = 900;
    (function tick(now) {
      var p = Math.min(1, (now - t0) / dur);
      shownBalance = from + (target - from) * (1 - Math.pow(1 - p, 3));
      $('balance').textContent = fmt(shownBalance);
      if (p < 1) balanceAnim = requestAnimationFrame(tick);
    })(t0);
  }

  function bet() { return state.freeSpins > 0 ? state.freeSpinBet : CFG.bets[state.betIndex]; }

  function updateBet() {
    $('bet').textContent = fmt(bet());
    var locked = spinning || state.freeSpins > 0;
    $('betDown').disabled = locked || state.betIndex === 0;
    $('betUp').disabled = locked || state.betIndex === CFG.bets.length - 1;
  }

  function xpNeeded(level) { return Math.round(200000 * Math.pow(level, 1.35)); }

  function updateLevel() {
    $('level').textContent = state.level;
    $('levelFill').style.width = Math.min(100, state.xp / xpNeeded(state.level) * 100) + '%';
  }

  function updateFreeSpinUI() {
    var on = state.freeSpins > 0;
    $('fsBadge').hidden = !on;
    $('fsLeft').textContent = state.freeSpins;
    $('winLabel').textContent = on ? 'FREE SPIN WINS' : 'WIN';
    if (on) $('win').textContent = fmt(state.freeSpinWin);
    if (!auto) {
      spinBtn.querySelector('.spin-label').textContent = on ? 'FREE' : 'SPIN';
      spinBtn.querySelector('small').textContent = on ? 'Spinning by itself' : 'Hold for auto';
    }
    updateBet();
  }

  function defaultBanner() {
    var b = $('banner');
    b.classList.remove('win');
    b.innerHTML = '3 or more <span>' + skin.symbols.S.icon + '</span> anywhere start FREE SPINS!';
  }

  function toast(msg, ms) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, ms || 2600);
  }

  function message(html, okText) {
    return new Promise(function (resolve) {
      $('msgBody').innerHTML = html;
      $('msgOk').textContent = okText || 'OK';
      var d = $('msgDlg');
      d.addEventListener('close', function h() { d.removeEventListener('close', h); resolve(); });
      if (d.showModal) d.showModal(); else { alert($('msgBody').textContent); resolve(); }
    });
  }

  /* ------------------------------------------------------------------ *
   * Spinning
   * ------------------------------------------------------------------ */
  var spinning = false;
  var auto = false;
  var spinBtn = $('spinBtn');
  var winTimer = null;

  function clearWins() {
    clearTimeout(winTimer);
    reelsEl.classList.remove('showing-wins');
    reelsEl.querySelectorAll('.cell.hit').forEach(function (c) { c.classList.remove('hit'); });
  }

  function cellAt(r, y) { return stripEls[r].children[y]; }

  function showWins(result) {
    var groups = result.wins.map(function (w) { return { cells: w.cells, text: w.count + ' × ' + skin.symbols[w.sym].name + ' pays ' + fmt(w.amount) }; });
    if (result.scatter.amount) groups.push({ cells: result.scatter.cells, text: result.scatter.count + ' bonus symbols pay ' + fmt(result.scatter.amount) });
    if (!groups.length) return;

    reelsEl.classList.add('showing-wins');
    // first show everything at once, then cycle through each win
    groups.forEach(function (g) { g.cells.forEach(function (c) { var el = cellAt(c[0], c[1]); if (el) el.classList.add('hit'); }); });
    $('banner').classList.add('win');
    $('banner').textContent = groups.length > 1 ? groups.length + ' wins!' : groups[0].text;

    if (groups.length > 1) {
      var i = 0;
      winTimer = setTimeout(function cycle() {
        reelsEl.querySelectorAll('.cell.hit').forEach(function (c) { c.classList.remove('hit'); });
        var g = groups[i % groups.length];
        g.cells.forEach(function (c) { var el = cellAt(c[0], c[1]); if (el) el.classList.add('hit'); });
        $('banner').textContent = g.text;
        i++;
        winTimer = setTimeout(cycle, 1400);
      }, 1500);
    }
  }

  function canAfford() { return state.balance >= CFG.bets[state.betIndex]; }

  function spin() {
    if (spinning) return;
    Sound.unlock();
    var inFree = state.freeSpins > 0;

    if (!inFree && !canAfford()) {
      stopAuto();
      if (state.balance >= CFG.bets[0]) {
        while (state.betIndex > 0 && !canAfford()) state.betIndex--;
        updateBet(); save();
        toast('Bet lowered to ' + fmt(bet()) + ' so you can keep playing');
        return;
      }
      offerRefill();
      return;
    }

    spinning = true;
    clearWins();
    defaultBanner();
    var b = bet();
    if (inFree) {
      state.freeSpins--;
      $('banner').textContent = 'Free spin! Wins are doubled';
    } else {
      state.balance -= b;
      $('win').textContent = '0';
      setBalanceDisplay(false);
      addXP(b);
    }
    state.stats.spins++;
    updateFreeSpinUI();
    $('spinBtn').disabled = !auto && !inFree;

    var grid = E.spinGrid();
    var result = E.evaluate(grid, b, inFree ? E.FREE_SPIN_MULTIPLIER : 1);
    // save the outcome before the animation, so a reload can't undo a spin
    state.balance += result.total;
    if (inFree) state.freeSpinWin += result.total;
    if (result.scatter.freeSpins) {
      if (!inFree) { state.freeSpinBet = b; state.freeSpinWin = 0; }
      state.freeSpins += result.scatter.freeSpins;
    }
    state.grid = grid;
    if (result.total > state.stats.biggestWin) state.stats.biggestWin = result.total;
    saveNow();

    Sound.spin();
    var bonusSeen = 0;
    animateReels(grid, function (r) {
      if (grid[r].indexOf('S') !== -1) { bonusSeen++; if (bonusSeen >= 2) Sound.tease(); }
    }, function () {
      currentGrid = grid;
      spinning = false;
      $('spinBtn').disabled = false;
      afterSpin(result, b, inFree);
    });
  }

  function afterSpin(result, b, inFree) {
    var win = result.total;
    var delay = 0;

    if (win > 0) {
      showWins(result);
      $('win').textContent = fmt(inFree ? state.freeSpinWin : win);
      $('win').parentNode.classList.remove('flash'); void $('win').offsetWidth;
      $('win').parentNode.classList.add('flash');
      var x = win / b;
      if (x >= 15) {
        delay = 3800;
        celebrate(x >= 50 ? 'MEGA WIN!' : x >= 30 ? 'HUGE WIN!' : 'BIG WIN!', win);
      } else {
        Sound.win(x >= 5 ? 2 : 1);
        delay = state.fast ? 700 : 1300;
      }
    } else {
      delay = state.fast ? 250 : 450;
    }
    setBalanceDisplay(true);

    if (result.scatter.freeSpins) {
      stopAuto(true);
      var txt = inFree ? '+' + result.scatter.freeSpins + ' more free spins!' : result.scatter.freeSpins + ' FREE SPINS!';
      setTimeout(function () {
        Sound.fanfare();
        message('<h2>🎉 ' + txt + '</h2><p>Every win during free spins is <b>doubled</b>. They play by themselves — sit back and watch!</p>', 'Start free spins')
          .then(function () { updateFreeSpinUI(); nextFreeSpin(); });
      }, delay);
      return;
    }

    if (inFree && state.freeSpins === 0) {
      setTimeout(function () {
        var total = state.freeSpinWin;
        state.freeSpinWin = 0; state.freeSpinBet = 0; save();
        updateFreeSpinUI();
        $('win').textContent = fmt(total);
        Sound.fanfare();
        message('<h2>Free spins finished</h2><p style="font-size:24px">You won <b class="num">' + fmt(total) + '</b> coins!</p>', 'Collect').then(continueAuto);
      }, delay + 300);
      return;
    }

    setTimeout(state.freeSpins > 0 ? nextFreeSpin : continueAuto, delay);
  }

  function nextFreeSpin() { if (state.freeSpins > 0 && !spinning && celebrating === false) spin(); else if (state.freeSpins > 0) setTimeout(nextFreeSpin, 400); }
  function continueAuto() { if (auto && !spinning) spin(); }

  /* ------------------------------------------------------------------ *
   * Big win celebration
   * ------------------------------------------------------------------ */
  var celebrating = false;
  function celebrate(title, amount) {
    celebrating = true;
    Sound.fanfare();
    $('celebrateTitle').textContent = title;
    var el = $('celebrateAmount'), ov = $('celebrate');
    ov.hidden = false;
    var t0 = performance.now(), dur = 2600, lastCoin = 0, raf;
    (function tick(now) {
      var p = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(amount * (1 - Math.pow(1 - p, 2)));
      if (now - lastCoin > 90 && p < 1) { Sound.coin(); lastCoin = now; dropCoin(); }
      if (p < 1) raf = requestAnimationFrame(tick);
    })(t0);
    function close() {
      cancelAnimationFrame(raf);
      el.textContent = fmt(amount);
      ov.hidden = true; celebrating = false;
      ov.removeEventListener('click', close);
      clearTimeout(autoClose);
    }
    ov.addEventListener('click', close);
    var autoClose = setTimeout(close, 3600);
  }

  function dropCoin() {
    var c = document.createElement('div');
    c.className = 'coin-rain';
    c.style.left = Math.random() * 100 + 'vw';
    document.body.appendChild(c);
    var fall = window.innerHeight + 80, dur = 1200 + Math.random() * 900;
    if (c.animate) {
      c.animate([{ transform: 'translateY(0) rotateY(0)' }, { transform: 'translateY(' + fall + 'px) rotateY(720deg)' }], { duration: dur, easing: 'ease-in' })
        .onfinish = function () { c.remove(); };
    } else setTimeout(function () { c.remove(); }, 50);
  }

  /* ------------------------------------------------------------------ *
   * Auto-spin
   * ------------------------------------------------------------------ */
  function setAuto(on) {
    auto = on;
    $('autoBtn').setAttribute('aria-pressed', on);
    $('spinBtn').classList.toggle('auto-on', on);
    $('spinBtn').querySelector('.spin-label').textContent = on ? 'STOP' : 'SPIN';
    $('spinBtn').querySelector('small').textContent = on ? 'Auto-spinning' : 'Hold for auto';
    $('spinBtn').disabled = false;
  }
  function stopAuto(keepQuiet) { if (auto) { setAuto(false); if (!keepQuiet) toast('Auto-spin stopped'); } }

  /* ------------------------------------------------------------------ *
   * XP / levels
   * ------------------------------------------------------------------ */
  function addXP(amount) {
    state.xp += amount;
    var gained = 0;
    while (state.xp >= xpNeeded(state.level)) {
      state.xp -= xpNeeded(state.level);
      state.level++;
      gained += 10000 * state.level;
    }
    if (gained) {
      state.balance += gained;
      setTimeout(function () { toast('⭐ Level ' + state.level + '! +' + fmt(gained) + ' coins', 3500); setBalanceDisplay(true); }, 600);
    }
    updateLevel();
  }

  /* ------------------------------------------------------------------ *
   * Free coin bonus + refills
   * ------------------------------------------------------------------ */
  function bonusAmount() { return CFG.bonusBase + CFG.bonusPerLevel * state.level; }
  function bonusReadyIn() { return Math.max(0, state.lastBonus + CFG.bonusEveryMinutes * 60000 - Date.now()); }

  function updateBonusBtn() {
    var ms = bonusReadyIn(), btn = $('bonusBtn');
    if (ms <= 0) {
      btn.className = 'btn bonus ready';
      $('bonusText').textContent = 'Collect ' + short(bonusAmount());
    } else {
      btn.className = 'btn bonus waiting';
      var m = Math.floor(ms / 60000), s = Math.floor(ms % 60000 / 1000);
      $('bonusText').textContent = 'Next gift ' + m + ':' + (s < 10 ? '0' : '') + s;
    }
  }

  function collectBonus() {
    Sound.unlock();
    if (bonusReadyIn() > 0) { toast('Your next free coins are on the way — check back soon!'); return; }
    var amt = bonusAmount();
    state.balance += amt;
    state.lastBonus = Date.now();
    save();
    Sound.fanfare();
    for (var i = 0; i < 18; i++) setTimeout(dropCoin, i * 60);
    setBalanceDisplay(true);
    toast('🎁 +' + fmt(amt) + ' free coins!');
    updateBonusBtn();
  }

  function offerRefill() {
    message('<h2>Out of coins?</h2><p>No problem — here are <b class="num">' + fmt(CFG.refillCoins) + '</b> free coins. This game is always free.</p>', 'Take the coins')
      .then(function () {
        state.balance += CFG.refillCoins;
        state.betIndex = Math.min(state.betIndex, CFG.defaultBetIndex);
        save(); setBalanceDisplay(true); updateBet();
      });
  }

  /* ------------------------------------------------------------------ *
   * Dialogs: theme + help
   * ------------------------------------------------------------------ */
  function openThemes() {
    var list = $('themeList');
    list.innerHTML = '';
    SKINS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn theme-card' + (s.id === skin.id ? ' active' : '');
      b.style.background = 'linear-gradient(135deg,' + s.theme.bg1 + ',' + s.theme.panel + ')';
      var pics = ['W', 'H1', 'H2', 'S'].map(function (k) { return s.symbols[k].icon; }).join('');
      b.innerHTML = '<span class="preview">' + pics + '</span><span><b>' + s.name + '</b><small>' + (s.tagline || '') + '</small></span>';
      b.addEventListener('click', function () {
        applySkin(s.id);
        $('themeDlg').close();
        toast('Theme changed to ' + s.name + ' — your coins came with you!');
      });
      list.appendChild(b);
    });
    $('themeDlg').showModal();
  }

  function openHelp() {
    $('helpWild').textContent = skin.symbols.W.icon;
    $('helpScatter').textContent = skin.symbols.S.icon;
    var b = bet(), unit = b / E.BET_DIVISOR * E.getPayoutScale();
    var rows = '<tr><th>Symbol</th><th>3</th><th>4</th><th>5</th></tr>';
    ['H1', 'H2', 'H3', 'H4', 'A', 'K', 'Q', 'J', 'T'].forEach(function (k) {
      var d = skin.symbols[k];
      var face = d.icon ? '<span class="pt-sym">' + iconHTML(d.icon) + '</span>'
        : '<b style="color:' + d.color + ';font-size:24px;font-family:Georgia,serif">' + (k === 'T' ? '10' : k) + '</b>';
      rows += '<tr><td>' + face + ' ' + d.name + '</td>' + [3, 4, 5].map(function (n) {
        return '<td class="num">' + short(E.PAYS[k][n] * unit) + '</td>';
      }).join('') + '</tr>';
    });
    rows += '<tr><td><span class="pt-sym">' + iconHTML(skin.symbols.S.icon) + '</span> Bonus (anywhere)</td>' + [3, 4, 5].map(function (n) {
      return '<td class="num">' + short(E.SCATTER_PAY[n] * b * E.getPayoutScale()) + '<br><small>+' + E.FREE_SPINS[n] + ' spins</small></td>';
    }).join('') + '</tr>';
    $('payTable').innerHTML = rows;
    $('helpDlg').showModal();
  }

  /* ------------------------------------------------------------------ *
   * Wiring
   * ------------------------------------------------------------------ */
  function changeBet(d) {
    if (spinning || state.freeSpins > 0) return;
    var i = state.betIndex + d;
    if (i < 0 || i >= CFG.bets.length) return;
    if (d > 0 && CFG.bets[i] > state.balance) { toast('Not enough coins for a bigger bet'); return; }
    state.betIndex = i;
    updateBet(); save();
    Sound.spin();
  }

  $('betDown').addEventListener('click', function () { changeBet(-1); });
  $('betUp').addEventListener('click', function () { changeBet(1); });

  // Spin: tap to spin, hold ~0.6s to start auto-spin, tap while auto to stop.
  var holdTimer = null, held = false;
  spinBtn.addEventListener('pointerdown', function () {
    held = false;
    if (auto) return;
    holdTimer = setTimeout(function () { held = true; setAuto(true); if (navigator.vibrate) navigator.vibrate(30); spin(); }, 650);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
    spinBtn.addEventListener(ev, function () { clearTimeout(holdTimer); });
  });
  spinBtn.addEventListener('click', function () {
    if (held) { held = false; return; }
    if (auto) { stopAuto(); return; }
    if (state.freeSpins > 0) return; // free spins run by themselves
    spin();
  });
  spinBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  $('autoBtn').addEventListener('click', function () {
    if (auto) { stopAuto(); return; }
    setAuto(true);
    if (!spinning && state.freeSpins === 0) spin();
  });

  $('fastBtn').addEventListener('click', function () {
    state.fast = !state.fast;
    $('fastBtn').setAttribute('aria-pressed', state.fast);
    save();
  });

  $('soundBtn').addEventListener('click', function () {
    state.sound = !state.sound;
    Sound.setEnabled(state.sound);
    $('soundBtn').textContent = state.sound ? '🔊' : '🔇';
    if (state.sound) { Sound.unlock(); Sound.coin(); }
    save();
  });

  $('bonusBtn').addEventListener('click', collectBonus);
  $('themeBtn').addEventListener('click', openThemes);
  $('helpBtn').addEventListener('click', openHelp);
  $('resetBtn').addEventListener('click', function () {
    var d = $('msgDlg');
    if (!d.showModal) return;
    $('msgBody').innerHTML = '<h2>Start over?</h2><p>This resets you to <b class="num">' + fmt(CFG.startingCoins) +
      '</b> coins at level 1.</p><button type="button" id="resetYes" class="btn wide" style="background:linear-gradient(#ff8787,#e03131)">Yes, start over</button>';
    $('msgOk').textContent = 'Keep my coins';
    d.showModal();
    $('resetYes').addEventListener('click', doReset);
  });
  function doReset() {
    var keepSkin = state.skin, keepSound = state.sound;
    state = JSON.parse(JSON.stringify(defaults));
    state.skin = keepSkin; state.sound = keepSound;
    saveNow(); location.reload();
  }

  document.addEventListener('keydown', function (e) {
    if (document.querySelector('dialog[open]')) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      if (e.target.tagName === 'BUTTON' && e.target !== spinBtn) return;
      e.preventDefault();
      if (!$('celebrate').hidden) { $('celebrate').click(); return; }
      if (auto) stopAuto(); else if (state.freeSpins === 0) spin();
    }
  });

  // Close dialogs by tapping the dark backdrop
  document.querySelectorAll('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d && d.id !== 'msgDlg') d.close(); });
  });

  document.addEventListener('visibilitychange', function () { if (document.hidden) { stopAuto(true); saveNow(); } });

  /* ------------------------------------------------------------------ *
   * Start
   * ------------------------------------------------------------------ */
  applySkin(state.skin);
  buildReels();
  Sound.setEnabled(state.sound);
  $('soundBtn').textContent = state.sound ? '🔊' : '🔇';
  $('fastBtn').setAttribute('aria-pressed', state.fast);
  setBalanceDisplay(false);
  updateBet(); updateLevel(); updateFreeSpinUI(); updateBonusBtn();
  setInterval(updateBonusBtn, 1000);

  if (state.freeSpins > 0) {
    message('<h2>Welcome back!</h2><p>You still have <b>' + state.freeSpins + '</b> free spins waiting.</p>', 'Play them').then(nextFreeSpin);
  } else if (!state.stats.spins) {
    message('<h2>Welcome! 🎰</h2><p>Here are <b class="num">' + fmt(state.balance) + '</b> free coins to play with.</p>' +
      '<p>No sign-up, nothing to buy, ever. Grab more free coins from the 🎁 button every hour.</p>', "Let's play!");
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
