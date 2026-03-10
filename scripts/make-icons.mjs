import { Resvg } from '@resvg/resvg-js';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = resolve(__dirname, '../src/icons');

// Catppuccin Mocha
const C = {
  base:    '#1e1e2e',
  mantle:  '#181825',
  surface0:'#313244',
  blue:    '#89b4fa',
  mauve:   '#cba6f7',
  lavender:'#b4befe',
  sky:     '#89dceb',
  text:    '#cdd6f4',
};

function buildSVG(size, active) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.45;

  // Moon geometry
  const moonR   = s * 0.285;
  const moonCx  = cx + s * 0.055;
  const moonCy  = cy - s * 0.030;
  // Cutout circle that creates crescent
  const cutR    = moonR * 0.82;
  const cutCx   = moonCx + moonR * 0.45;
  const cutCy   = moonCy - moonR * 0.10;

  // Shield badge (bottom-right)
  const bx = cx + s * 0.19;
  const by = cy + s * 0.18;
  const sw = s * 0.24;
  const sh = s * 0.28;

  // Shield bezier path
  const shieldPath = [
    `M ${bx} ${by - sh * 0.5}`,
    `C ${bx + sw * 0.5} ${by - sh * 0.5}, ${bx + sw * 0.5} ${by + sh * 0.1}, ${bx} ${by + sh * 0.5}`,
    `C ${bx - sw * 0.5} ${by + sh * 0.1}, ${bx - sw * 0.5} ${by - sh * 0.5}, ${bx} ${by - sh * 0.5}`,
    'Z',
  ].join(' ');

  // Lock body inside shield
  const lw  = sw * 0.70;
  const lh  = sw * 0.50;
  const lx  = bx - lw / 2;
  const ly  = by - lh * 0.05;
  const lrx = lw * 0.18;  // corner radius
  const arcR = lw * 0.32;

  const moonFill    = active ? C.mauve    : '#888888';
  const starFill    = active ? C.blue     : 'none';
  const shieldFill  = active ? C.blue     : '#666666';
  const lockFill    = active ? C.base     : '#2a2a2a';
  const bgTop       = active ? '#2a2a3e'  : '#2a2a2a';
  const bgBtm       = active ? C.base     : '#1a1a1a';
  const borderColor = active ? 'rgba(180,190,254,0.25)' : 'rgba(120,120,120,0.20)';
  const cutFill     = active ? C.base     : '#1a1a1a';
  const shieldGlow  = active ? `filter="url(#glow)"` : '';

  // Stars — only drawn when active; skip on tiny icons (<=19px)
  const showStars = active && size >= 19;
  const showLock  = size >= 19;

  const starR = s * 0.025;
  const stars = showStars ? `
    <circle cx="${cx - s*0.22}" cy="${cy - s*0.28}" r="${starR}"         fill="${starFill}" opacity="0.85"/>
    <circle cx="${cx - s*0.34}" cy="${cy - s*0.12}" r="${s*0.018}"       fill="${starFill}" opacity="0.75"/>
    <circle cx="${cx - s*0.28}" cy="${cy + s*0.18}" r="${s*0.020}"       fill="${starFill}" opacity="0.70"/>
    <circle cx="${cx + s*0.30}" cy="${cy + s*0.25}" r="${s*0.022}"       fill="${starFill}" opacity="0.80"/>
  ` : '';

  const lock = showLock ? `
    <rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="${lrx}" ry="${lrx}" fill="${lockFill}"/>
    <path d="M ${bx - arcR} ${ly} A ${arcR} ${arcR} 0 0 1 ${bx + arcR} ${ly}"
          fill="none" stroke="${lockFill}" stroke-width="${lw * 0.22}" stroke-linecap="round"/>
  ` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="50%">
      <stop offset="0%" stop-color="${bgTop}"/>
      <stop offset="100%" stop-color="${bgBtm}"/>
    </radialGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${s * 0.04}" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="moonClip">
      <circle cx="${moonCx}" cy="${moonCy}" r="${moonR}"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 0.5}" fill="none"
          stroke="${borderColor}" stroke-width="${Math.max(1, s * 0.02)}"/>

  <!-- Crescent moon via clip mask -->
  <g clip-path="url(#moonClip)">
    <circle cx="${moonCx}" cy="${moonCy}" r="${moonR}" fill="${moonFill}"/>
    <circle cx="${cutCx}"  cy="${cutCy}"  r="${cutR}"  fill="${cutFill}"/>
  </g>

  <!-- Stars -->
  ${stars}

  <!-- Shield -->
  <path d="${shieldPath}" fill="${shieldFill}" ${shieldGlow}/>

  <!-- Lock -->
  ${lock}
</svg>`;
}

function renderPNG(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  });
  return resvg.render().asPng();
}

// Map: output filename → { size, active }
const ICONS = [
  { file: 'dr_128.png',          size: 128, active: true  },
  { file: 'dr_48.png',           size: 48,  active: true  },
  { file: 'dr_active_38.png',    size: 38,  active: true  },
  { file: 'dr_active_19.png',    size: 19,  active: true  },
  { file: 'dr_active_light_38.png', size: 38, active: true },
  { file: 'dr_active_light_19.png', size: 19, active: true },
  { file: 'dr_16.png',           size: 16,  active: true  },
  // Inactive / disabled toolbar variants
  { file: 'dr_inactive_38.png',  size: 38,  active: false },
  { file: 'dr_inactive_19.png',  size: 19,  active: false },
];

for (const { file, size, active } of ICONS) {
  const svg = buildSVG(size, active);
  const png = renderPNG(svg, size);
  writeFileSync(resolve(ICONS_DIR, file), png);
  console.log(`  wrote ${file}  (${size}×${size})`);
}

console.log('\nAll icons generated.');
