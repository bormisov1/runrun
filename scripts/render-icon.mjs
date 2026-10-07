import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
const svg = readFileSync(new URL('../assets/runrun-icon.svg', import.meta.url), 'utf8');
const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 }, font: { fontFiles: [font], loadSystemFonts: false } }).render().asPng();
writeFileSync(new URL('../assets/icon.png', import.meta.url), png);
