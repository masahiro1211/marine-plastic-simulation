/* Shared helpers across the three Slide 1 directions */

const W = 1000;
const H = 1414;

// Hero scene SVG — used (with style variants) by all 3 directions
function HeroScene({ palette = 'soft' }) {
  // palette presets
  const skies = {
    soft:     { sky1: '#cdeefb', sky2: '#9fdfee', sea1: '#4ec7d6', sea2: '#1d6e8a' },
    editorial:{ sky1: '#bce6f7', sky2: '#76c8df', sea1: '#1f7fa3', sea2: '#0b3a5c' },
    panel:    { sky1: '#dff3fb', sky2: '#a8dceb', sea1: '#3da6c0', sea2: '#175a78' },
  };
  const c = skies[palette];
  return (
    <svg viewBox="0 0 1000 460" preserveAspectRatio="xMidYMid slice" style={{ display: 'block', width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={`hsea-${palette}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.sky1} />
          <stop offset="0.22" stopColor={c.sky2} />
          <stop offset="0.55" stopColor={c.sea1} />
          <stop offset="1" stopColor={c.sea2} />
        </linearGradient>
        <linearGradient id={`hsky-${palette}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eaf6fc" />
          <stop offset="1" stopColor={c.sky1} />
        </linearGradient>
      </defs>
      {/* sky */}
      <rect width="1000" height="115" fill={`url(#hsky-${palette})`} />
      {/* sea */}
      <rect y="115" width="1000" height="345" fill={`url(#hsea-${palette})`} />
      {/* sun */}
      <circle cx="860" cy="58" r="26" fill="#ffd84d" />
      <circle cx="860" cy="58" r="38" fill="#ffd84d" opacity="0.22" />
      {/* clouds */}
      <g fill="#ffffff" opacity="0.9">
        <ellipse cx="170" cy="58" rx="58" ry="14" />
        <ellipse cx="225" cy="48" rx="34" ry="11" />
      </g>
      {/* lighthouse base */}
      <g>
        <rect x="34" y="100" width="28" height="58" fill="#fff" stroke="#0b3a5c" strokeWidth="1.2" />
        <polygon points="34,100 62,100 48,80" fill="#ff7a59" />
        <rect x="42" y="120" width="12" height="10" fill="#ffd84d" />
        <rect x="28" y="158" width="40" height="6" fill="#0b3a5c" />
        <rect x="22" y="164" width="52" height="10" fill="#175a78" />
      </g>
      {/* water surface ripples */}
      <g stroke="#ffffff" strokeWidth="1" opacity="0.5" fill="none">
        <path d="M0 124 Q 50 119 100 124 T 200 124 T 300 124 T 400 124 T 500 124 T 600 124 T 700 124 T 800 124 T 900 124 T 1000 124" />
        <path d="M0 136 Q 50 131 100 136 T 200 136 T 300 136 T 400 136 T 500 136 T 600 136 T 700 136 T 800 136 T 900 136 T 1000 136" opacity="0.4" />
      </g>

      {/* Scout robot (surface) */}
      <g transform="translate(260,160)">
        <ellipse rx="26" ry="9" fill="#f0a93c" stroke="#0b3a5c" strokeWidth="1.4" />
        <rect x="-9" y="-16" width="18" height="12" rx="1" fill="#fff" stroke="#0b3a5c" strokeWidth="1.4" />
        <rect x="-2" y="-22" width="3" height="7" fill="#ff7a59" />
        <circle cx="-13" cy="-7" r="2" fill="#0b3a5c" />
        <circle cx="13" cy="-7" r="2" fill="#0b3a5c" />
      </g>
      <g transform="translate(540,176) scale(0.85)">
        <ellipse rx="26" ry="9" fill="#f0a93c" stroke="#0b3a5c" strokeWidth="1.4" />
        <rect x="-9" y="-16" width="18" height="12" rx="1" fill="#fff" stroke="#0b3a5c" strokeWidth="1.4" />
        <rect x="-2" y="-22" width="3" height="7" fill="#ff7a59" />
      </g>
      {/* dashed scout trajectory */}
      <path d="M 260 158 Q 380 130 510 175 T 720 170" stroke="#ffd84d" strokeWidth="2.5" strokeDasharray="6 5" fill="none" />

      {/* Collector robots */}
      <g transform="translate(420,148)">
        <path d="M-40 0 L 40 0 L 32 22 L -32 22 Z" fill="#4aa3ff" stroke="#0b3a5c" strokeWidth="1.8" />
        <rect x="-22" y="-22" width="44" height="22" fill="#fff" stroke="#0b3a5c" strokeWidth="1.8" />
        <rect x="-4" y="-30" width="3" height="8" fill="#ff7a59" />
        <rect x="-18" y="-18" width="10" height="10" fill={c.sea1} />
        <rect x="-3" y="-18" width="10" height="10" fill={c.sea1} />
        <rect x="12" y="-18" width="6" height="10" fill={c.sea1} />
      </g>
      <g transform="translate(740,160) scale(0.92)">
        <path d="M-40 0 L 40 0 L 32 22 L -32 22 Z" fill="#4aa3ff" stroke="#0b3a5c" strokeWidth="1.8" />
        <rect x="-22" y="-22" width="44" height="22" fill="#fff" stroke="#0b3a5c" strokeWidth="1.8" />
        <rect x="-3" y="-30" width="3" height="8" fill="#ff7a59" />
        <rect x="-18" y="-18" width="10" height="10" fill={c.sea1} />
        <rect x="-3" y="-18" width="10" height="10" fill={c.sea1} />
      </g>

      {/* Trash items underwater */}
      <g fill="#e6ecf0" stroke="#516573" strokeWidth="1.2">
        <rect x="170" y="280" width="22" height="14" rx="2" />
        <rect x="600" y="310" width="20" height="22" rx="2" transform="rotate(20,610,321)" />
        <circle cx="340" cy="340" r="9" />
        <rect x="800" y="290" width="20" height="14" rx="2" transform="rotate(-15,810,297)" />
        <rect x="90" y="370" width="22" height="14" rx="2" />
        <rect x="490" y="380" width="16" height="20" rx="2" />
      </g>

      {/* Fish school */}
      <g>
        <g transform="translate(190,310)"><ellipse rx="11" ry="5" fill="#ffae45" /><polygon points="-9,0 -15,-4 -15,4" fill="#ffae45" /></g>
        <g transform="translate(222,318)"><ellipse rx="10" ry="4.5" fill="#ffae45" /><polygon points="-8,0 -13,-4 -13,4" fill="#ffae45" /></g>
        <g transform="translate(204,332)"><ellipse rx="10" ry="4.5" fill="#ffae45" /><polygon points="-8,0 -13,-4 -13,4" fill="#ffae45" /></g>
        <g transform="translate(630,355)"><ellipse rx="11" ry="5" fill="#ffae45" /><polygon points="-9,0 -15,-4 -15,4" fill="#ffae45" /></g>
        <g transform="translate(660,365)"><ellipse rx="10" ry="4.5" fill="#ffae45" /><polygon points="-8,0 -13,-4 -13,4" fill="#ffae45" /></g>
      </g>
      {/* Orca */}
      <g transform="translate(560,400)">
        <ellipse rx="48" ry="16" fill="#0b3a5c" />
        <path d="M -52 -2 q -16 -3 -22 5 q 8 -2 22 8 Z" fill="#0b3a5c" />
        <ellipse cx="-8" cy="3" rx="22" ry="8" fill="#ffffff" />
        <ellipse cx="-22" cy="-3" rx="4" ry="3" fill="#ffffff" />
        <polygon points="0,-14 12,-30 19,-12" fill="#0b3a5c" />
        <circle cx="-30" cy="-4" r="1.5" fill="#fff" />
      </g>
      {/* seabed */}
      <path d="M0 446 q 120 -18 250 0 q 200 24 400 -8 q 150 -14 250 6 L1000 460 L0 460 Z" fill={c.sea2} opacity="0.85" />
      {/* coral hints */}
      <g fill={c.sea2}>
        <path d="M820 445 q -4 -22 6 -28 q 8 14 4 28 Z" opacity="0.7" />
        <path d="M860 444 q 2 -16 12 -22 q 6 16 -2 22 Z" opacity="0.6" />
      </g>
    </svg>
  );
}

// Small reusable agent icon used in lists / keys
function AgentChip({ kind, size = 56 }) {
  const stroke = '#0b3a5c';
  return (
    <svg width={size} height={size} viewBox="0 0 56 56">
      {kind === 'scout' && (
        <g transform="translate(28,28)">
          <ellipse rx="20" ry="7" fill="#f0a93c" stroke={stroke} strokeWidth="1.6" />
          <rect x="-7" y="-15" width="14" height="11" rx="1" fill="#fff" stroke={stroke} strokeWidth="1.6" />
          <rect x="-1.5" y="-21" width="3" height="7" fill="#ff7a59" />
        </g>
      )}
      {kind === 'collector' && (
        <g transform="translate(28,30)">
          <path d="M-22 -2 L 22 -2 L 17 12 L -17 12 Z" fill="#4aa3ff" stroke={stroke} strokeWidth="1.6" />
          <rect x="-13" y="-15" width="26" height="13" fill="#fff" stroke={stroke} strokeWidth="1.6" />
          <rect x="-2" y="-21" width="2.5" height="6" fill="#ff7a59" />
        </g>
      )}
      {kind === 'fish' && (
        <g transform="translate(28,28)">
          <ellipse rx="18" ry="8" fill="#ffae45" stroke={stroke} strokeWidth="1.4" />
          <polygon points="-16,0 -24,-6 -24,6" fill="#ffae45" stroke={stroke} strokeWidth="1.4" />
          <circle cx="10" cy="-2" r="2" fill={stroke} />
          <path d="M -2 0 Q 8 -3 16 0" stroke={stroke} strokeWidth="1" fill="none" />
        </g>
      )}
      {kind === 'orca' && (
        <g transform="translate(28,30)">
          <ellipse rx="22" ry="9" fill={stroke} />
          <ellipse cx="-3" cy="2" rx="11" ry="4" fill="#fff" />
          <polygon points="2,-8 9,-19 14,-7" fill={stroke} />
          <path d="M -22 -2 q -8 -2 -11 3 q 4 -1 11 5 Z" fill={stroke} />
        </g>
      )}
      {kind === 'trash' && (
        <g transform="translate(28,28)">
          <rect x="-16" y="-10" width="14" height="10" rx="2" fill="#e6ecf0" stroke="#516573" strokeWidth="1.4" />
          <rect x="2" y="-2" width="14" height="14" rx="2" fill="#e6ecf0" stroke="#516573" strokeWidth="1.4" transform="rotate(15,9,5)" />
          <circle cx="-6" cy="8" r="5" fill="#e6ecf0" stroke="#516573" strokeWidth="1.4" />
        </g>
      )}
      {kind === 'base' && (
        <g transform="translate(28,30)">
          <rect x="-9" y="-13" width="18" height="22" fill="#fff" stroke={stroke} strokeWidth="1.6" />
          <polygon points="-9,-13 9,-13 0,-23" fill="#ff7a59" />
          <rect x="-3" y="-7" width="6" height="6" fill="#ffd84d" />
          <rect x="-13" y="9" width="26" height="4" fill={stroke} />
        </g>
      )}
    </svg>
  );
}

Object.assign(window, { HeroScene, AgentChip, REEF_W: W, REEF_H: H });
