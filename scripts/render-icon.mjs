import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';

const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const asset = (name) => new URL(`../assets/${name}`, import.meta.url);
const storeAsset = (name) => new URL(`../store/play/${name}`, import.meta.url);
const dark = '#070A0E';
const white = '#F5F7F0';
const lime = '#D8FF3E';

// Option 18: stacked RUN, 03's stagger and a square stop. Positioning follows
// the approved -7 px large preview.
function mark(accent = lime) {
  return `<g transform="skewX(-10)">
    <text x="337" y="470" fill="${white}" font-family="DejaVu Sans" font-size="286" font-weight="900" letter-spacing="-26">RUN</text>
    <text x="202" y="695" fill="${white}" font-family="DejaVu Sans" font-size="286" font-weight="900" letter-spacing="-26">RUN</text>
    <rect x="856" y="656" width="44" height="42" fill="${accent}"/>
  </g>`;
}

function svg({ background = false, monochrome = false, adaptive = false } = {}) {
  const artwork = adaptive ? `<g transform="translate(102 102) scale(.8)">${mark(monochrome ? white : lime)}</g>` : mark(monochrome ? white : lime);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
${background ? `  <rect width="1024" height="1024" fill="${dark}"/>\n` : ''}  ${artwork}
</svg>\n`;
}

function render(source, width) {
  return new Resvg(source, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles: [font], loadSystemFonts: false },
  }).render().asPng();
}

const icon = svg({ background: true });
writeFileSync(asset('runrun-icon.svg'), icon);
writeFileSync(asset('icon.png'), render(icon, 1024));
writeFileSync(asset('splash-icon.png'), render(icon, 1024));
writeFileSync(asset('splash-mark.png'), render(svg(), 1024));
writeFileSync(asset('favicon.png'), render(icon, 48));
writeFileSync(asset('android-icon-background.png'), render(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${dark}"/></svg>`, 512));
writeFileSync(asset('android-icon-foreground.png'), render(svg({ adaptive: true }), 512));
writeFileSync(asset('android-icon-monochrome.png'), render(svg({ adaptive: true, monochrome: true }), 432));
mkdirSync(new URL('../store/play/', import.meta.url), { recursive: true });
writeFileSync(storeAsset('play-icon-512.png'), render(icon, 512));
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <rect width="1024" height="500" fill="${dark}"/>
  <path d="M0 422H1024M0 326H1024M0 230H1024M0 134H1024M128 0V500M320 0V500M512 0V500M704 0V500M896 0V500" stroke="#263124" stroke-width="1"/>
  <path d="M-20 452C174 403 183 196 371 255S627 90 778 143S898 292 1044 66" fill="none" stroke="${lime}" stroke-width="7" opacity=".75"/>
  <rect x="87" y="105" width="435" height="286" rx="8" fill="${dark}"/>
  <g transform="translate(-15 -26) scale(.57)">${mark()}</g>
  <text x="590" y="239" fill="${white}" font-family="DejaVu Sans" font-size="35" font-weight="900">CHASE THE NEXT</text>
  <text x="590" y="295" fill="${lime}" font-family="DejaVu Sans" font-size="35" font-weight="900">VERSION OF YOU.</text>
  <text x="594" y="347" fill="#A7B2A6" font-family="DejaVu Sans" font-size="21" letter-spacing="3">RUN  /  RECORD  /  REPEAT</text>
</svg>`;
writeFileSync(storeAsset('feature-graphic-1024x500.png'), render(feature, 1024));
