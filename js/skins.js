/*
 * Skins are purely visual. Every skin maps the same engine symbol ids
 * (W, S, H1..H4, A, K, Q, J, T) to a picture and colours, so switching
 * skins never touches the player's coins or the odds.
 *
 * To add a skin: copy one block below, give it a new id, change the
 * name/colours/symbols, and it shows up in the "Change Theme" menu.
 *
 * Symbol fields:
 *   icon  - an emoji (zero download size) OR a path to an image, e.g. "img/ocean/crab.webp"
 *   label - small caption under the icon (used for WILD / BONUS)
 *   name  - spoken name for screen readers and the paytable
 * Card symbols (A K Q J T) are drawn as large coloured letters; set their colour with `color`.
 */
window.SKINS = [
  {
    id: 'jade',
    name: 'Jade Dragon',
    tagline: 'Lanterns, lucky turtles and the jade dragon',
    theme: {
      bg1: '#0b4d2c', bg2: '#062b18',      // page background gradient
      frame: '#d4a537', frameDark: '#8a6417', // reel frame gold
      reelBg: '#11733f', reelBg2: '#0b5a31',  // reel strip colours
      panel: '#5b1f7a', panel2: '#3a114f',    // bottom control bar
      accent: '#ffd85a', text: '#ffffff',
      title: 'Jade Dragon'
    },
    symbols: {
      W:  { icon: '🐉', label: 'WILD',  name: 'Dragon (Wild)', ring: '#ffcc33' },
      S:  { icon: '🧧', label: 'BONUS', name: 'Red Envelope (Bonus)', ring: '#ff4d4d' },
      H1: { icon: '🐯', name: 'Tiger',   ring: '#f29c38' },
      H2: { icon: '🏮', name: 'Lantern', ring: '#e8463c' },
      H3: { icon: '🐢', name: 'Turtle',  ring: '#3fb6a8' },
      H4: { icon: '🎋', name: 'Bamboo',  ring: '#7cc95a' },
      A:  { color: '#ff5a4e', name: 'Ace' },
      K:  { color: '#ffcf3f', name: 'King' },
      Q:  { color: '#5ee08a', name: 'Queen' },
      J:  { color: '#5aa9ff', name: 'Jack' },
      T:  { color: '#f08bff', name: 'Ten' }
    }
  },
  {
    id: 'ocean',
    name: 'Ocean Treasure',
    tagline: 'Dolphins, pearls and sunken gold',
    theme: {
      bg1: '#0a4a7a', bg2: '#04223d',
      frame: '#e9c46a', frameDark: '#9a7726',
      reelBg: '#0f6aa3', reelBg2: '#0a4f7c',
      panel: '#123a63', panel2: '#0a2340',
      accent: '#7ff0ff', text: '#ffffff',
      title: 'Ocean Treasure'
    },
    symbols: {
      W:  { icon: '🔱', label: 'WILD',  name: 'Trident (Wild)', ring: '#ffd166' },
      S:  { icon: '💎', label: 'BONUS', name: 'Diamond (Bonus)', ring: '#9be7ff' },
      H1: { icon: '🐬', name: 'Dolphin', ring: '#4cc9f0' },
      H2: { icon: '🦀', name: 'Crab',    ring: '#f25c54' },
      H3: { icon: '🐠', name: 'Fish',    ring: '#f7b538' },
      H4: { icon: '🐚', name: 'Shell',   ring: '#f4a5c0' },
      A:  { color: '#ff6b6b', name: 'Ace' },
      K:  { color: '#ffd166', name: 'King' },
      Q:  { color: '#06d6a0', name: 'Queen' },
      J:  { color: '#4cc9f0', name: 'Jack' },
      T:  { color: '#c77dff', name: 'Ten' }
    }
  }
];
