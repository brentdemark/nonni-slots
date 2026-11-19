/* Site settings — the only file you normally need to edit. */
window.SITE_CONFIG = {
  // ---- Google AdSense ----
  // Leave adsenseClient empty until AdSense approves the site.
  // Then paste your publisher id, e.g. "ca-pub-1234567890123456",
  // and the numeric ad-unit ids you create in AdSense for each spot.
  adsenseClient: '',
  adSlots: {
    left: '',    // 160x600 skyscraper, wide screens only
    right: '',   // 160x600 skyscraper, wide screens only
    bottom: ''   // responsive banner under the machine
  },
  // Show grey "Ad space" boxes while no AdSense id is set (handy for previewing layout).
  showAdPlaceholders: true,

  // ---- Game economy (pretend coins) ----
  // Multiplies every payout. 1.0 pays back about 96% of coins bet; 1.05 about 101%.
  // Changes how much wins pay, not how often they happen. Check with: node tools/simulate.js
  payoutScale: 1.05,
  startingCoins: 250000,
  bets: [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000],
  defaultBetIndex: 2,
  bonusEveryMinutes: 60,   // free coins button
  bonusBase: 25000,        // + bonusPerLevel x level
  bonusPerLevel: 2500,
  refillCoins: 100000,     // offered when someone runs out
  defaultSkin: 'jade'
};
