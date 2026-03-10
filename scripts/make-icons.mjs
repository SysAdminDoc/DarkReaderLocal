import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'fs';
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
};

function buildSVG(size, active) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;

  // Rounded-square background — fills the full canvas, ~20% corner radius
  const rr = s * 0.20;

  // Moon — large, fills most of the icon
  const moonR  = s * 0.385;
  const moonCx = cx + s * 0.04;
  const moonCy = cy - s * 0.04;
  // Cutout makes the crescent
  const cutR   = moonR * 0.80;
  const cutCx  = moonCx + moonR * 0.48;
  const cutCy  = moonCy - moonR * 0.08;

  // Shield badge — bottom-right corner
  const bx = cx + s * 0.255;
  const by = cy + s * 0.255;
  const sw = s * 0.28;
  const sh = s * 0.32;

  const shieldPath = [
    `M ${bx} ${by - sh * 0.5}`,
    `C ${bx + sw * 0.5} ${by - sh * 0.5}, ${bx + sw * 0.5} ${by + sh * 0.1}, ${bx} ${by + sh * 0.5}`,
    `C ${bx - sw * 0.5} ${by + sh * 0.1}, ${bx - sw * 0.5} ${by - sh * 0.5}, ${bx} ${by - sh * 0.5}`,
    'Z',
  ].join(' ');

  // Lock inside shield
  const lw   = sw * 0.68;
  const lh   = sw * 0.48;
  const lx   = bx - lw / 2;
  const ly   = by - lh * 0.05;
  const lrx  = lw * 0.18;
  const arcR = lw * 0.30;

  // Colors
  const bgTop      = active ? '#252538' : '#252525';
  const bgBtm      = active ? C.base    : '#181818';
  const moonFill   = active ? C.mauve   : '#888888';
  const cutFill    = active ? C.base    : '#181818';
  const starFill   = active ? C.blue    : 'none';
  const shieldFill = active ? C.blue    : '#606060';
  const lockFill   = active ? C.base    : '#2a2a2a';
  const borderCol  = active ? 'rgba(180,190,254,0.18)' : 'rgba(100,100,100,0.15)';
  const shieldGlow = active ? 'filter="url(#glow)"' : '';

  const showStars = active && size >= 19;
  const showLock  = size >= 19;

  const starR = s * 0.028;
  const stars = showStars ? `
    <circle cx="${cx - s*0.26}" cy="${cy - s*0.30}" r="${starR}"    fill="${starFill}" opacity="0.85"/>
    <circle cx="${cx - s*0.38}" cy="${cy - s*0.10}" r="${s*0.020}"  fill="${starFill}" opacity="0.70"/>
    <circle cx="${cx - s*0.32}" cy="${cy + s*0.20}" r="${s*0.022}"  fill="${starFill}" opacity="0.65"/>
  ` : '';

  const lock = showLock ? `
    <rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="${lrx}" ry="${lrx}" fill="${lockFill}"/>
    <path d="M ${bx - arcR} ${ly} A ${arcR} ${arcR} 0 0 1 ${bx + arcR} ${ly}"
          fill="none" stroke="${lockFill}" stroke-width="${lw * 0.22}" stroke-linecap="round"/>
  ` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="bg" gradientUnits="userSpaceOnUse"
        cx="${cx}" cy="${cy * 0.8}" r="${s * 0.65}">
      <stop offset="0%"   stop-color="${bgTop}"/>
      <stop offset="100%" stop-color="${bgBtm}"/>
    </radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${s * 0.045}" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="moonClip">
      <circle cx="${moonCx}" cy="${moonCy}" r="${moonR}"/>
    </clipPath>
    <clipPath id="bgClip">
      <rect x="0" y="0" width="${s}" height="${s}" rx="${rr}" ry="${rr}"/>
    </clipPath>
  </defs>

  <!-- Rounded-square background -->
  <rect x="0" y="0" width="${s}" height="${s}" rx="${rr}" ry="${rr}" fill="url(#bg)"/>
  <rect x="0.5" y="0.5" width="${s - 1}" height="${s - 1}" rx="${rr - 0.5}" ry="${rr - 0.5}"
        fill="none" stroke="${borderCol}" stroke-width="1"/>

  <!-- All content clipped to rounded square -->
  <g clip-path="url(#bgClip)">
    <!-- Crescent moon -->
    <g clip-path="url(#moonClip)">
      <circle cx="${moonCx}" cy="${moonCy}" r="${moonR}" fill="${moonFill}"/>
      <circle cx="${cutCx}"  cy="${cutCy}"  r="${cutR}"  fill="${cutFill}"/>
    </g>

    <!-- Stars -->
    ${stars}

    <!-- Shield badge -->
    <path d="${shieldPath}" fill="${shieldFill}" ${shieldGlow}/>

    <!-- Lock -->
    ${lock}
  </g>
</svg>`;
}

function renderPNG(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  });
  return resvg.render().asPng();
}

const ICONS = [
  { file: 'dr_128.png',             size: 128, active: true  },
  { file: 'dr_48.png',              size: 48,  active: true  },
  { file: 'dr_active_38.png',       size: 38,  active: true  },
  { file: 'dr_active_19.png',       size: 19,  active: true  },
  { file: 'dr_active_light_38.png', size: 38,  active: true  },
  { file: 'dr_active_light_19.png', size: 19,  active: true  },
  { file: 'dr_16.png',              size: 16,  active: true  },
  { file: 'dr_inactive_38.png',     size: 38,  active: false },
  { file: 'dr_inactive_19.png',     size: 19,  active: false },
];

for (const { file, size, active } of ICONS) {
  const svg = buildSVG(size, active);
  const png = renderPNG(svg, size);
  writeFileSync(resolve(ICONS_DIR, file), png);
  console.log(`  wrote ${file}  (${size}×${size})`);
}

console.log('\nAll icons generated.');
