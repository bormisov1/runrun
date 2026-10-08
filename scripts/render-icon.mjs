import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';

const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const asset = (name) => new URL(`../assets/${name}`, import.meta.url);
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
writeFileSync(asset('favicon.png'), render(icon, 48));
writeFileSync(asset('android-icon-background.png'), render(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${dark}"/></svg>`, 512));
writeFileSync(asset('android-icon-foreground.png'), render(svg({ adaptive: true }), 512));
writeFileSync(asset('android-icon-monochrome.png'), render(svg({ adaptive: true, monochrome: true }), 432));
