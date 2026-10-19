import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, G, Image as SvgImage, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { clock, km, pace, routePath, Run, stats } from './run';

export type ExportStyle = { id: string; name: string; family: string; layout: number; variant: number };
export const EXPORT_STYLES: ExportStyle[] = [
  ['01','The Original','Essentials',0,0],['02','Carbon Outline','Essentials',0,1],['03','Neon Split','Essentials',0,2],
  ['04','Vertical Mile','Sidebar',1,0],['05','Trackside','Sidebar',1,1],['06','Ascent Rail','Sidebar',1,2],
  ['07','Orbit','Radial',2,0],['08','Target Line','Radial',2,1],['09','Night Halo','Radial',2,2],
  ['10','Distance First','Type Study',3,0],['11','Big Number','Type Study',3,1],['12','Pace Giant','Type Study',3,2],
  ['13','Scoreboard','Data Grid',4,0],['14','Four Corners','Data Grid',4,1],['15','Run Matrix','Data Grid',4,2],
  ['16','Topline','Horizontal',5,0],['17','Ribbon','Horizontal',5,1],['18','Split Horizon','Horizontal',5,2],
  ['19','Quiet Route','Minimal',6,0],['20','Fine Print','Minimal',6,1],['21','Contour','Minimal',6,2],
  ['22','Checkpoint','Marker',7,0],['23','Start to Finish','Marker',7,1],['24','Waypoints','Marker',7,2],
  ['25','Race Bib','Poster',8,0],['26','Finish Card','Poster',8,1],['27','The Medal','Poster',8,2],
  ['28','Edge Runner','Experimental',9,0],['29','Pulse','Experimental',9,1],['30','Full Trace','Experimental',9,2],
  ['31','Bare Trace','Minimal',10,0],['32','Distance Only','Minimal',10,1],['33','Quiet Line','Minimal',10,2],
  ['34','Clean Original','Essentials',11,0],
  ['35','Night Run / Lime','Story Poster',12,0],['36','Night Run / Route / Lime','Story Poster',12,1],['37','Night Run / Split / Lime','Story Poster',12,2],
  ['38','Night Run / Cyan','Story Poster',12,3],['39','Night Run / Route / Cyan','Story Poster',12,4],['40','Night Run / Split / Cyan','Story Poster',12,5],
  ['41','Night Run / Coral','Story Poster',12,6],['42','Night Run / Route / Coral','Story Poster',12,7],['43','Night Run / Split / Coral','Story Poster',12,8],
].map(([id,name,family,layout,variant]) => ({ id: String(id), name: String(name), family: String(family), layout: Number(layout), variant: Number(variant) }));
export const DEFAULT_EXPORT_STYLE = '01';
export const isStoryPoster = (id: string) => findExportStyle(id).layout === 12;
const STORAGE_KEY = 'runrun.defaultExportStyle';
export function findExportStyle(id: string) { return EXPORT_STYLES.find(style => style.id === id) ?? EXPORT_STYLES[0]; }
export async function loadDefaultExportStyle() { return findExportStyle(await AsyncStorage.getItem(STORAGE_KEY) ?? DEFAULT_EXPORT_STYLE).id; }
export async function saveDefaultExportStyle(id: string) { await AsyncStorage.setItem(STORAGE_KEY, findExportStyle(id).id); }

const palettes = [
  { ink: '#F5F7F0', accent: '#D8FF3E', second: '#56DCE0' },
  { ink: '#F5F7F0', accent: '#56DCE0', second: '#D8FF3E' },
  { ink: '#F5F7F0', accent: '#FF765A', second: '#D8FF3E' },
];

type ArtworkProps = { run: Run; styleId: string; width?: number; height?: number };
export function ExportArtwork({ run, styleId, width = 360, height }: ArtworkProps) {
  const style = findExportStyle(styleId);
  const poster = style.layout === 12;
  const artHeight = height ?? (poster ? width * 16 / 9 : width * 4 / 3);
  const p = palettes[poster ? Math.floor(style.variant / 3) : style.variant];
  const s = stats(run);
  const values = [km(s.distance), clock(s.seconds), pace(s.avgSpeed), `+${Math.round(s.ascent)}`];
  const labels = ['DISTANCE', 'DURATION', 'AVG PACE', 'ELEVATION'];
  const units = ['KM', '', 'MIN/KM', 'M'];
  const trace = run.points.length >= 2 ? routePath(run.points, 420, 360, 25) : 'M 74 293 C 98 281 122 277 137 255 S 136 216 169 210 C 207 204 197 170 175 163 S 129 152 146 125 C 165 94 191 105 198 82 S 226 58 244 75 C 266 95 276 117 302 119 S 329 145 311 165 C 289 191 267 182 274 213 S 307 260 324 246 C 346 228 354 196 368 170';
  const txt = (x: number, y: number, value: string, size = 20, color = p.ink, anchor: 'start' | 'middle' | 'end' = 'start', weight = '800') => <SvgText key={`${x}-${y}-${value}`} x={x} y={y} fill={color} fontFamily="Arial" fontSize={size} fontWeight={weight} textAnchor={anchor}>{value}</SvgText>;
  const line = (x1: number, y1: number, x2: number, y2: number, sw = 2) => <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={p.accent} strokeWidth={sw}/>;
  const brand = (x = 48, y = 99) => txt(x, y, 'RUNRUN', 36);
  const stat = (i: number, x: number, y: number, size = 45) => <G key={i}>{txt(x,y-37,labels[i],13,p.accent,'middle')}{txt(x,y,values[i],size,p.ink,'middle')}{units[i] ? txt(x,y+22,units[i],12,p.accent,'middle') : null}</G>;
  const route = (x: number, y: number, w: number, h: number, thin = false) => <G transform={`translate(${x} ${y}) scale(${w/420} ${h/360})`}>
    {!thin && <Path d={trace} fill="none" stroke={p.accent} strokeWidth={20} opacity={0.12} strokeLinecap="round" strokeLinejoin="round"/>}
    <Path d={trace} fill="none" stroke={p.accent} strokeWidth={thin ? 3 : style.variant === 2 ? 9 : 6} strokeLinecap="round" strokeLinejoin="round"/>
    {!thin && run.points.length < 2 && <><Circle cx={74} cy={293} r={7} fill={p.ink}/><Circle cx={368} cy={170} r={10} fill={p.accent}/></>}
  </G>;
  const grid = (x: number, y: number, gapX = 310, gapY = 140) => [0,1,2,3].map(i => stat(i,x+(i%2)*gapX,y+Math.floor(i/2)*gapY,42));
  const date = new Date(run.startedAt).toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' }).toUpperCase();
  if (poster) {
    const white = '#FFFFFF';
    const posterLayout = style.variant % 3;
    const totalMinutes = Math.round(s.seconds / 60);
    const duration = totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, '0')}m` : `${totalMinutes}m`;
    const posterStats = [
      ['Distance', `${values[0]} km`],
      ['Pace', `${values[2]} /km`],
      ['Time', duration],
    ];
    const label = (x: number, y: number, value: string, anchor: 'start' | 'middle' = 'middle') => txt(x, y, value, 29, white, anchor, '700');
    const number = (x: number, y: number, value: string, size = 61, anchor: 'start' | 'middle' = 'middle') => txt(x, y, value, size, white, anchor, '900');
    const posterRoute = (x: number, y: number, w: number, h: number) => {
      const padding = 28;
      const sampleScale = Math.min((w - 2 * padding) / 294, (h - 2 * padding) / 235);
      const sampleTransform = `translate(${(w - 294 * sampleScale) / 2 - 74 * sampleScale} ${(h - 235 * sampleScale) / 2 - 58 * sampleScale}) scale(${sampleScale})`;
      const path = run.points.length >= 2 ? routePath(run.points, w, h, padding) : trace;
      return <G transform={`translate(${x} ${y})`}><Path d={path} transform={run.points.length >= 2 ? undefined : sampleTransform} fill="none" stroke={p.accent} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round"/></G>;
    };
    const posterLogo = (x: number, y: number, w = 360) => <SvgImage x={x} y={y} width={w} height={w * 150 / 540} href={require('../assets/watermark.png')} preserveAspectRatio="xMidYMid meet"/>;
    let content: React.ReactNode;
    if (posterLayout === 0) {
      content = <>{posterStats.map(([title, value], i) => <G key={title}>{label(360, 250 + i * 150, title)}{number(360, 319 + i * 150, value)}</G>)}{posterRoute(60, 690, 600, 260)}{posterLogo(180, 965)}</>;
    } else if (posterLayout === 1) {
      content = <>{label(360, 206, 'Distance')}{number(360, 285, posterStats[0][1], 75)}{posterRoute(60, 350, 600, 325)}{label(200, 754, 'Pace')}{label(520, 754, 'Time')}{number(200, 816, posterStats[1][1], 44)}{number(520, 816, posterStats[2][1], 44)}{posterLogo(180, 990)}</>;
    } else {
      content = <>{txt(88, 184, date, 22, white, 'start', '700')}{posterStats.map(([title, value], i) => <G key={title}>{label(88, 273 + i * 174, title, 'start')}{number(88, 340 + i * 174, value, 67, 'start')}</G>)}{posterRoute(70, 750, 580, 285)}{posterLogo(88, 1040)}</>;
    }
    return <Svg width={width} height={artHeight} viewBox="0 0 720 1280" accessibilityLabel={`${style.name} transparent story poster with route and run statistics`}>{content}</Svg>;
  }
  let art: React.ReactNode;
  switch (style.layout) {
    case 0: art = <>{brand()}{txt(48,143,`RUN DATA / ${date}`,14,p.accent)}{route(72,164,576,408)}{grid(205,687,310,141)}{txt(52,915,'MOVE DIFFERENT. / RUNRUN',13,p.accent)}</>; break;
    case 1: art = <>{brand()}{txt(48,139,'THE ROAD IS YOURS',14,p.accent)}{line(414,172,414,825)}{route(-51,200,504,540)}{[0,1,2,3].map(i => stat(i,555,265+i*157,47))}</>; break;
    case 2: art = <>{txt(360,101,'RUNRUN',36,p.ink,'middle')}<Circle cx={360} cy={424} r={273} fill="none" stroke={p.accent} strokeWidth={style.variant === 2 ? 5 : 2}/>{route(125,218,470,390)}{stat(0,190,741)}{stat(1,530,741)}{stat(2,190,853)}{stat(3,530,853)}</>; break;
    case 3: { const focus = style.variant === 2 ? 2 : 0; art = <>{brand(49,94)}{txt(360,216,labels[focus],16,p.accent,'middle')}{txt(360,361,values[focus],style.variant === 1 ? 184 : 166,p.ink,'middle')}{txt(360,412,units[focus],27,p.accent,'middle')}{route(124,359,540,360)}{line(51,727,669,727,3)}{[0,1,2,3].filter(i=>i!==focus).map((i,j)=>stat(i,155+j*205,818,38))}</>; break; }
    case 4: art = <>{brand(49,97)}{txt(49,140,'THE FOUR THAT MATTER',14,p.accent)}{route(109,162,500,350)}<Rect x={44} y={518} width={632} height={353} rx={18} fill="#061014" opacity={0.56}/>{grid(210,597,300,145)}</>; break;
    case 5: art = <>{brand(48,98)}{txt(673,94,date,14,p.accent,'end')}{line(48,126,672,126,3)}{grid(210,214,325,131)}{line(48,413,672,413)}{route(66,435,588,406)}</>; break;
    case 6: art = <>{brand(48,99)}{route(80,159,560,470,true)}{[0,1,2,3].map((i)=> <G key={i}>{txt(131+i*158,711,labels[i],11,p.accent,'middle')}{txt(131+i*158,753,values[i],i===1?27:34,p.ink,'middle')}</G>)}</>; break;
    case 7: art = <>{brand(48,95)}{line(101,185,101,777,3)}<Circle cx={101} cy={188} r={12} fill={p.accent}/><Circle cx={101} cy={774} r={12} fill={p.ink}/>{route(132,204,528,438)}{grid(255,668,263,109)}</>; break;
    case 8: art = <><Rect x={50} y={50} width={620} height={860} rx={31} fill="#071014" opacity={0.58} stroke={p.accent}/><Rect x={72} y={72} width={576} height={91} rx={13} fill={p.accent}/>{txt(98,132,'RUNRUN',55,'#071014')}{txt(91,204,date,14,p.accent)}{route(105,242,510,348)}{line(89,616,631,616)}{grid(225,692,275,135)}</>; break;
    case 9: art = <>{brand(50,99)}{route(28,110,664,603)}<Rect x={45} y={608} width={630} height={254} rx={21} fill="#071014" opacity={0.73}/>{grid(210,700,306,109)}</>; break;
    case 11: art = <>{brand()}<Rect x={48} y={110} width={35} height={5} rx={2} fill={p.accent}/>{route(72,164,576,408)}{[0,1,2,3].map(i => {
      const x = 205 + (i % 2) * 310;
      const y = 690 + Math.floor(i / 2) * 141;
      return <G key={i}>{txt(x,y-56,i === 3 ? 'ELEVATION GAIN' : labels[i],13,p.accent,'middle')}{txt(x,y,`${values[i]}${units[i] ? ` ${units[i]}` : ''}`,42,p.ink,'middle')}</G>;
    })}</>; break;
    default: art = style.variant === 0 ? <>{route(95,240,530,445,true)}{txt(360,777,values[0],56,p.ink,'middle')}{txt(360,815,'KM',13,p.accent,'middle')}</> : style.variant === 1 ? <>{route(110,200,500,415,true)}{txt(360,760,values[0],100,p.ink,'middle')}{txt(360,800,'KM',13,p.accent,'middle')}</> : <>{route(95,235,530,445,true)}{line(180,790,540,790,1)}{txt(360,835,`${values[0]} KM  ·  ${values[1]}`,25,p.ink,'middle')}</>;
  }
  // Frames belong to the original concept families. Minimal designs stay open and transparent.
  const frame = style.layout < 10 && style.variant === 1 ? <Path d="M 42 130 V 42 H 155 M 565 42 H 678 V 140 M 42 808 V 918 H 152 M 565 918 H 678 V 810" fill="none" stroke={p.accent} strokeWidth={3} opacity={0.85}/> : style.layout < 10 && style.variant === 2 ? <><Rect x={28} y={28} width={664} height={904} rx={28} fill="none" stroke={p.accent} strokeWidth={2}/>{line(45,82,675,82)}</> : null;
  return <Svg width={width} height={artHeight} viewBox="0 0 720 960" accessibilityLabel={`${style.name} transparent route export`}>{frame}{art}</Svg>;
}
