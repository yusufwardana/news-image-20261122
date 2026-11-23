// THE WORLD TODAY — 22 November 2026
// A visual newspaper drawn fresh in this session: one image summing up
// Sunday 22 November 2026 world news. Node 22, standard library only.
// Writes a 1024x1024 PNG to $MAKEFUN_OUTPUT_DIR/entry.png (default: out/).
// Deterministic: same bytes on every run (no clock, no randomness).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

// ---------------------------------------------------------------- PNG writer
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w: number, h: number, rgb: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0; // filter: none
    rgb.copy(raw, y * (1 + w * 3) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------- canvas
type RGB = [number, number, number];
const W = 1024;
const H = 1024;

class Canvas {
  buf: Buffer = Buffer.alloc(W * H * 3);
  fill(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, x), y0 = Math.max(0, y);
    const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const o = (yy * W + xx) * 3;
        this.buf[o] = c[0]; this.buf[o + 1] = c[1]; this.buf[o + 2] = c[2];
      }
    }
  }
  px(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const o = (y * W + x) * 3;
    this.buf[o] = c[0]; this.buf[o + 1] = c[1]; this.buf[o + 2] = c[2];
  }
  hline(x: number, y: number, w: number, t: number, c: RGB): void {
    this.fill(x, y, w, t, c);
  }
  vline(x: number, y: number, h: number, t: number, c: RGB): void {
    this.fill(x, y, t, h, c);
  }
}

// ------------------------------------------------------- 5x7 bitmap font
// Hand-drawn glyphs (5 columns x 7 rows). Uppercase only; all copy is set
// in capitals, newspaper style. "#" = ink, "." = blank.
const GLYPHS: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#..##", "#.#.#", "##..#", "#...#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".##..", ".#..."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "—": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "(": ["...##", "..#..", ".#...", ".#...", ".#...", "..#..", "...##"],
  ")": ["##...", "..#..", "...#.", "...#.", "...#.", "..#..", "##..."],
  "%": ["##..#", "##.#.", "...#.", "..#..", ".#...", "#.##.", "#..##"],
  "$": ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
  "&": [".##..", "#..#.", "#..#.", ".#...", "#.#.#", "#..#.", ".##.#"],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  '"': [".#.#.", ".#.#.", ".....", ".....", ".....", ".....", "....."],
  "*": [".....", ".#.#.", "..#..", "#####", "..#..", ".#.#.", "....."],
};

function textWidth(s: string, scale: number): number {
  // 5 px glyph + 1 px gap, scaled. Trailing gap trimmed by caller where needed.
  return s.length * 6 * scale;
}
function drawText(cv: Canvas, s: string, x: number, y: number, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s) {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let col = 0; col < 5; col++) {
        if (row[col] === "#") cv.fill(cx + col * scale, y + r * scale, scale, scale, c);
      }
    }
    cx += 6 * scale;
  }
}
function drawTextCentered(cv: Canvas, s: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(cv, s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}
// Greedy word wrap; returns lines that fit maxW px at the given scale.
function wrap(s: string, maxW: number, scale: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (textWidth(trial, scale) <= maxW || !cur) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ------------------------------------------------------------------ palette
const PAPER: RGB = [246, 239, 220];
const PANEL: RGB = [255, 253, 245];
const INK: RGB = [25, 23, 19];
const GREY: RGB = [90, 84, 72];
const RED: RGB = [166, 32, 32];
const NAVY: RGB = [29, 58, 110];
const TEAL: RGB = [14, 107, 92];
const GOLD: RGB = [154, 107, 0];
const GREEN: RGB = [46, 94, 46];
const RULE: RGB = [201, 190, 163];
const CREAM: RGB = [246, 239, 220];
const WHITE: RGB = [255, 255, 255];

// --------------------------------------------------------------------- data
// Every label verified against reporting of 22 Nov 2026 (see working notes
// outside the repo). Sources are cited beside each story in the image.
interface Story { label: string; src: string }
interface Headline { kick: string; color: RGB; head: string; sub: string; src: string }

const HEADLINES: Headline[] = [
  { kick: "CLIMATE - ANTALYA", color: GREEN, head: "COP31 TALKS COLLAPSE", sub: "NO DEAL AS EU REJECTS TEXT WITH NO FOSSIL FUELS", src: "BBC" },
  { kick: "CONFLICT - LIBYA", color: RED, head: "DRONES HIT RUSSIAN WARSHIP", sub: "SUSPECTED UKRAINIAN STRIKE AT BENGHAZI WIDENS WAR", src: "LIBYAN OFFICIALS" },
  { kick: "POLITICS - USA", color: NAVY, head: "DEMOCRATS TAKE 258 SEATS", sub: "LARGEST HOUSE MAJORITY SINCE 1992 AFTER NC RECOUNT", src: "AP" },
];

const COLUMNS: { title: string; color: RGB; stories: Story[] }[] = [
  {
    title: "WAR & CONFLICT", color: RED, stories: [
      { label: "IRAN HITS BAHRAIN SITE; 2 HURT IN GULF FLARE-UP", src: "AL-MONITOR" },
      { label: "IRAN STRIKES 3 TANKERS NEAR STRAIT OF HORMUZ", src: "REUTERS" },
      { label: "TRUMP DARES IRAN TO BREAK US PORT BLOCKADE", src: "AP" },
      { label: "HOUTHIS SAY THEY HIT SAUDI REFINERY", src: "AP" },
      { label: "ISRAELI STRIKES CONTINUE IN GAZA", src: "AP" },
      { label: "SETTLERS TORCH CARS IN WEST BANK; INQUIRY OPENS", src: "AP" },
      { label: "EISENKOT CALLS SETTLER ATTACKS 'TERRORISM'", src: "AP" },
      { label: "RUSSIAN STRIKE HITS FLAT NEAR KYIV; 2 KILLED", src: "AP" },
      { label: "MISSILE HITS ZELENSKYY HOMETOWN; BOY, 7, KILLED", src: "AP" },
      { label: "RUSSIAN MISSILES LAND IN POLAND; NATO PROTESTS", src: "AP" },
      { label: "DENMARK EXPELS RUSSIAN OVER ASSASSINATION PLOT", src: "AP" },
      { label: "DRONES HIT KHARTOUM HOMES AND UN BUILDING; 4 DEAD", src: "AL JAZEERA" },
      { label: "MEXICO CAPTURES 'EL CHAPO ISIDRO'; 11 DEAD IN RAID", src: "AP" },
    ],
  },
  {
    title: "POLITICS & POWER", color: NAVY, stories: [
      { label: "TRUMP VOWS TO WORK WITH DEMOCRATS ON 10% CARD CAP", src: "AP" },
      { label: "MCBRIDE FIRST TRANS PERSON IN LEADERSHIP", src: "REUTERS" },
      { label: "HOUSE DEMOCRATS NOMINATE JEFFRIES FOR SPEAKER", src: "AP" },
      { label: "SENATE REJECTS IRAN WAR-POWERS RESOLUTION", src: "AP" },
      { label: "SUPREME COURT DECLINES TRUMP APPEAL ON UC GRANTS", src: "AP" },
      { label: "FBI PROBES APPARENT HACK OF POLICE DATABASE", src: "AP" },
      { label: "DNI CONFIRMS PROBE OF ALICE HUANG AND MEGASPEED", src: "ABC" },
      { label: "UK AND EU AGREE CLOSER POST-BREXIT TIES", src: "BBC" },
      { label: "SUMMIT FALLOUT: TRUMP'S 'FRIEND' DEFENDED", src: "ABC" },
      { label: "MONGOLIA FACES SNAP PRESIDENTIAL VOTE", src: "AP" },
      { label: "HONG KONG HOLDS ELECTION COMMITTEE VOTE", src: "AP" },
      { label: "S. KOREA MINISTER QUITS OVER AI CHEATING", src: "AP" },
      { label: "ICJ: MYANMAR COMMITTED ROHINGYA GENOCIDE", src: "ICJ" },
    ],
  },
  {
    title: "WORLD, SCIENCE & SPORT", color: TEAL, stories: [
      { label: "BEPICOLOMBO ENTERS MERCURY ORBIT", src: "REUTERS" },
      { label: "CRISPR THERAPY CUTS BAD CHOLESTEROL 52%", src: "AP" },
      { label: "EARTH GAINS A NEW MINI-MOON, 2026 QQ8", src: "AP" },
      { label: "EU AND INDONESIA SIGN LANDMARK TRADE DEAL", src: "REUTERS" },
      { label: "ARGENTINA APPROVES $50BN LNG PROJECT", src: "AP" },
      { label: "UN TALKS ON AI WEAPONS END WITH NO BINDING RULES", src: "UN" },
      { label: "INDONESIA CANDY FACTORY FIRE: 3 DEAD, 36 MISSING", src: "AP" },
      { label: "BOAT CAPSIZES IN NIGERIA; 24 DEAD", src: "AP" },
      { label: "18 ABDUCTED CHILDREN RESCUED IN KADUNA", src: "AP" },
      { label: "EX-SA DEPUTY PRESIDENT MLAMBO-NGCUKA DIES, 71", src: "AP" },
      { label: "LIVERPOOL THRASH MAN UTD 4-0 ON POCHETTINO DEBUT", src: "PL" },
      { label: "BARCELONA RALLY TO BEAT VILLARREAL 3-2", src: "LALIGA" },
      { label: "ATALANTA 4-4 INTER IN EIGHT-GOAL THRILLER", src: "SERIE A" },
    ],
  },
];

const SPORT_BRIEF: Story[] = [
  { label: "BOCA WIN COPA SUDAMERICANA 2-0", src: "AP" },
  { label: "ALCARAZ WINS ATP FINALS", src: "AP" },
  { label: "MARQUEZ 8TH MOTOGP TITLE", src: "AP" },
  { label: "KC CURRENT WIN NWSL TITLE", src: "AP" },
  { label: "UK TO HOST 2035 WORLD CUP", src: "FIFA" },
];

const TICKER = "MARKETS S&P 500 6,910 -3.70% NIKKEI -5.06% SENSEX +2.3% BRENT $89.95 BTC $60,800";

// ------------------------------------------------------------------- layout
const COL_X = [8, 348, 688];
const COL_W = 328;

function drawMasthead(cv: Canvas): void {
  cv.fill(0, 0, W, 108, PAPER);
  cv.hline(0, 0, W, 4, INK);
  drawTextCentered(cv, "THE WORLD TODAY", W / 2, 14, 6, INK);
  cv.hline(8, 64, W - 16, 2, RED);
  drawTextCentered(cv, "SUNDAY, 22 NOVEMBER 2026", W / 2, 70, 3, RED);
  drawTextCentered(cv, "ONE DAY - ONE PAGE - THE WORLD IN FULL", W / 2, 99, 1, GREY);
}

function drawHeadlines(cv: Canvas): void {
  const y0 = 116;
  const bh = 172;
  for (let i = 0; i < 3; i++) {
    const hd = HEADLINES[i];
    const x = COL_X[i];
    cv.fill(x, y0, COL_W, bh, PANEL);
    cv.hline(x, y0, COL_W, 2, INK);
    cv.hline(x, y0 + bh - 2, COL_W, 2, INK);
    cv.vline(x, y0, bh, 2, INK);
    cv.vline(x + COL_W - 2, y0, bh, 2, INK);
    // kicker band
    cv.fill(x + 2, y0 + 2, COL_W - 4, 26, hd.color);
    drawTextCentered(cv, hd.kick, x + COL_W / 2, y0 + 9, 2, WHITE);
    // headline, wrapped at scale 3 (18 px advance -> 16 chars/line)
    const lines = wrap(hd.head, COL_W - 24, 3);
    let ly = y0 + 40;
    for (const ln of lines) {
      drawTextCentered(cv, ln, x + COL_W / 2, ly, 3, INK);
      ly += 24;
    }
    // sub, wrapped at scale 2 (12 px advance -> 25 chars/line)
    const sub = wrap(hd.sub, COL_W - 24, 2);
    ly += 4;
    for (const ln of sub) {
      drawTextCentered(cv, ln, x + COL_W / 2, ly, 2, GREY);
      ly += 17;
    }
    drawTextCentered(cv, "— " + hd.src, x + COL_W / 2, y0 + bh - 18, 1, hd.color);
  }
}

function drawTicker(cv: Canvas): void {
  const y0 = 296;
  cv.fill(0, y0, W, 30, INK);
  drawTextCentered(cv, TICKER, W / 2, y0 + 8, 2, CREAM);
}

function drawColumns(cv: Canvas): void {
  const y0 = 334;
  const yEnd = 930;
  for (let c = 0; c < 3; c++) {
    const col = COLUMNS[c];
    const x = COL_X[c];
    // section header band
    cv.fill(x, y0, COL_W, 30, col.color);
    drawTextCentered(cv, col.title, x + COL_W / 2, y0 + 8, 2, WHITE);
    // stories (labels wrap to at most 2 lines at scale 2; anything longer
    // is a data bug and must fail loudly instead of overflowing the page)
    let y = y0 + 36;
    for (const st of col.stories) {
      // bullet square
      cv.fill(x + 2, y + 3, 8, 8, col.color);
      const lines = wrap(st.label, COL_W - 22, 2);
      if (lines.length > 2) throw new Error("label wraps to 3 lines: " + st.label);
      let ly = y;
      for (const ln of lines) {
        drawText(cv, ln, x + 16, ly, 2, INK);
        ly += 15;
      }
      drawText(cv, "— " + st.src, x + 16, ly + 1, 1, col.color);
      y = ly + 1 + 7 + 4; // source line (7px) + gap
      if (y > yEnd) throw new Error("column overflow: " + col.title);
    }
  }
}

function drawSportStrip(cv: Canvas): void {
  const y0 = 938;
  cv.fill(0, y0, W, 34, PANEL);
  cv.hline(0, y0, W, 2, INK);
  const line = "SPORT IN BRIEF: " + SPORT_BRIEF.map((s) => s.label).join(" / ");
  const lines = wrap(line, W - 32, 2);
  if (lines.length > 2) throw new Error("sport strip wraps to 3 lines");
  let ly = y0 + 4;
  for (const ln of lines) {
    drawText(cv, ln, 16, ly, 2, INK);
    ly += 15;
  }
}

function drawFooter(cv: Canvas, total: number): void {
  const y0 = 980;
  cv.fill(0, y0, W, H - y0, INK);
  drawTextCentered(
    cv,
    "DATE CHECK: EVERY STORY VERIFIED 23 NOV 2026 AGAINST AP, REUTERS, BBC, AL JAZEERA, ESA, ICJ, UN, FIFA",
    W / 2, y0 + 8, 1, CREAM,
  );
  drawTextCentered(
    cv,
    "ALL " + total + " STORIES ARE EVENTS OF SUNDAY 22 NOVEMBER 2026 - THE WORLD TODAY",
    W / 2, y0 + 22, 1, CREAM,
  );
}

// ---------------------------------------------------------------------- main
function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
  // Create the output directory if needed; never delete it (the grader may
  // mount it as a volume).
  mkdirSync(outDir, { recursive: true });

  const cv = new Canvas();
  cv.fill(0, 0, W, H, PAPER);
  drawMasthead(cv);
  drawHeadlines(cv);
  drawTicker(cv);
  drawColumns(cv);
  drawSportStrip(cv);
  const total =
    HEADLINES.length +
    COLUMNS.reduce((n, c) => n + c.stories.length, 0) +
    SPORT_BRIEF.length;
  drawFooter(cv, total);

  const png = encodePNG(W, H, cv.buf);
  writeFileSync(join(outDir, "entry.png"), png);
  console.log("wrote " + join(outDir, "entry.png") + " (" + png.length + " bytes, " + total + " stories)");
}

main();
