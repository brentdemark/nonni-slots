/*
 * Ads load AFTER the game is ready, so they never slow down the first spin.
 * Every ad box has a fixed size, so nothing on the page jumps when an ad appears.
 * No pop-ups, no interstitials, nothing over the reels.
 */
(function () {
  'use strict';
  var CFG = window.SITE_CONFIG;
  var slots = document.querySelectorAll('[data-ad-slot-key]');

  function visible(el) { return el.offsetParent !== null; }

  if (!CFG.adsenseClient) {
    slots.forEach(function (el) { el.classList.add(CFG.showAdPlaceholders ? 'placeholder' : 'empty'); });
    return;
  }

  function loadAds() {
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(CFG.adsenseClient);
    document.head.appendChild(s);

    slots.forEach(function (el) {
      var key = el.getAttribute('data-ad-slot-key');
      var slotId = CFG.adSlots[key];
      if (!slotId || !visible(el)) { el.classList.add('empty'); return; } // skip rails hidden on small screens
      var ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.setAttribute('data-ad-client', CFG.adsenseClient);
      ins.setAttribute('data-ad-slot', slotId);
      if (key === 'bottom') {
        ins.setAttribute('data-ad-format', 'horizontal');
        ins.setAttribute('data-full-width-responsive', 'true');
        ins.style.width = '100%'; ins.style.height = '100px';
      } else {
        ins.style.width = '160px'; ins.style.height = '600px';
      }
      el.appendChild(ins);
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
  }

  if (document.readyState === 'complete') setTimeout(loadAds, 1500);
  else window.addEventListener('load', function () { setTimeout(loadAds, 1500); });
})();
