# Lucky Parlor Slots

A free, static slot machine game: nothing to buy, no logins, no pop-ups. Progress is saved in the player's browser.
The whole site is about 60 KB with no frameworks and no images (symbols are emoji, sounds are generated in the browser),
so it loads quickly on a slow connection. After the first visit it opens from the browser's offline cache.

## Files

| File | What it is |
|---|---|
| `index.html` | The page |
| `css/style.css` | Layout and look (colours come from the active skin) |
| `js/config.js` | **Edit this one**: AdSense ids, starting coins, bet sizes, bonus timing |
| `js/skins.js` | Themes. Add a block to add a theme |
| `js/engine.js` | Odds and payouts (shared by every skin) |
| `js/game.js` | Game play, saving, bonuses, dialogs |
| `js/sound.js` | Synthesized sound effects |
| `js/ads.js` | Loads AdSense after the game is ready |
| `sw.js` | Offline cache. Bump `VERSION` whenever you change a file |
| `privacy.html` | Privacy page (AdSense requires one). Fill in the bracketed parts |
| `ads.txt` | AdSense publisher declaration. Fill in your id |
| `tools/simulate.js` | Checks the payout rate after you change the odds |

## Run it locally

```
cd slots
python3 -m http.server 8000
# open http://localhost:8000
```

## Host it for free

Any static host works. Two easy options:

- **Cloudflare Pages**: create a project, choose "Direct upload", and drag in the `slots` folder.
- **GitHub Pages**: push the folder to a repo, then turn on Pages (Settings → Pages → deploy from branch).

Add a custom domain if you want one. AdSense approval goes more smoothly with your own domain.

## Turn on ads

1. Apply at adsense.google.com with your domain. Expect a review period.
2. Once approved, put your `ca-pub-…` id in `js/config.js` → `adsenseClient`, and in `ads.txt`.
3. Create three **Display** ad units in AdSense: two 160×600 (left/right rails, shown only on wide screens) and one horizontal responsive unit (under the machine).
   Paste their numeric slot ids into `adSlots`.
4. Set `showAdPlaceholders: false`.
5. In AdSense → **Privacy & messaging**, turn on the European regulations (GDPR) message. Google requires a certified consent tool for visitors from the EEA, UK and Switzerland. Google's own tool covers this with no code changes.
6. In AdSense → **Blocking controls → Sensitive categories**, consider blocking "Gambling & betting" so real-money casino ads don't show up next to the game.
7. Keep **Auto ads turned off**. They can add pop-up (vignette) and overlay formats, which would interrupt play.

Ads are placed beside and below the machine, never over the reels, and load 1.5 s after the page, so they don't slow the first spin.
Their boxes have a fixed size, so nothing jumps when an ad loads.

## Add a theme

Copy a block in `js/skins.js`, give it a new `id` and `name`, and change the colours and symbols. It appears in the 🎨 Theme menu automatically.
Coins, level and odds are shared, so switching themes never changes anyone's balance.

Symbols can be emoji (no download) or image files: `icon: 'img/space/rocket.webp'`. Keep images small (~10–20 KB each, WebP).
If you add images, list them in `sw.js` → `FILES` so they work offline.

## Odds

`payoutScale` in `js/config.js` multiplies every payout: 1.0 returns about 96% of coins bet over the long run, and 1.05 (the current setting) about 101%. About 37% of spins win something, free spins trigger about once every 110 spins,
and a 10×-bet win comes about once every 60 spins. On top of that are the hourly gift, level-up rewards and refills, so nobody gets stuck.
If you change `engine.js`, rerun the check:

```
node tools/simulate.js 2000000
```

## Saving

State lives in `localStorage` under `luckyParlor.v1`, with a cookie as a fallback.
localStorage is used instead of a cookie because cookies are sent to the server on every request and are limited to 4 KB.
Progress is saved per browser: if they switch from the iPad to the laptop, they start fresh there.
"Start over" in the footer resets it.
