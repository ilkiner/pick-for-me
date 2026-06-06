/**
 * Generates app icon assets for Pick For Me.
 * Run: node scripts/generate-icons.js
 * Outputs: assets/icon.png (1024x1024), adaptive-icon.png (1024x1024),
 *          splash.png (1284x2778), favicon.png (196x196)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'assets');

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg0: '#0F0F1E',
  bg1: '#1A1740',
  indigo: '#6366F1',
  purple: '#A855F7',
  white: 'white',
};

// ─── Icon SVG ─────────────────────────────────────────────────────────────────
// 1024×1024 — shuffle arrows + glow circle
function iconSvg(size = 1024) {
  const s = size / 1024;   // scale factor
  const sw = Math.round(52 * s);  // stroke width
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${C.bg0}"/>
      <stop offset="100%" stop-color="${C.bg1}"/>
    </linearGradient>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${C.indigo}"/>
      <stop offset="100%" stop-color="${C.purple}"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="28" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#bg)"/>

  <!-- Soft glow -->
  <circle cx="512" cy="512" r="360" fill="${C.indigo}" opacity="0.07" filter="url(#glow)"/>

  <!-- Outer ring -->
  <circle cx="512" cy="512" r="348" fill="none" stroke="${C.indigo}" stroke-width="2.5" opacity="0.35"/>

  <!-- Inner ring accent -->
  <circle cx="512" cy="512" r="310" fill="none" stroke="${C.purple}" stroke-width="1.5" opacity="0.18"/>

  <!-- ── Shuffle arrows ── -->

  <!-- Top arrow: bottom-left → top-right (white) -->
  <path d="M 248 572 L 358 572 C 430 572 482 468 556 388 L 654 388"
        fill="none" stroke="${C.white}" stroke-width="${sw}" stroke-linecap="round" opacity="0.92"/>
  <!-- Arrowhead top-right -->
  <polyline points="624,348 666,388 624,428"
            fill="none" stroke="${C.white}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>

  <!-- Bottom arrow: top-left → bottom-right (gradient indigo/purple) -->
  <path d="M 248 452 L 358 452 C 430 452 482 556 556 636 L 654 636"
        fill="none" stroke="url(#g1)" stroke-width="${sw}" stroke-linecap="round"/>
  <!-- Arrowhead bottom-right -->
  <polyline points="624,596 666,636 624,676"
            fill="none" stroke="url(#g1)" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Left-end dots -->
  <circle cx="248" cy="452" r="${Math.round(20 * s)}" fill="${C.indigo}" opacity="0.8"/>
  <circle cx="248" cy="572" r="${Math.round(20 * s)}" fill="${C.white}" opacity="0.7"/>
</svg>`;
}

// ─── Splash SVG ───────────────────────────────────────────────────────────────
// 1284×2778 (iPhone 15 Pro Max — safe for all stores)
function splashSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1284" height="2778" viewBox="0 0 1284 2778">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${C.bg0}"/>
      <stop offset="100%" stop-color="${C.bg1}"/>
    </linearGradient>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${C.indigo}"/>
      <stop offset="100%" stop-color="${C.purple}"/>
    </linearGradient>
  </defs>
  <rect width="1284" height="2778" fill="url(#bg)"/>
  <!-- Glow blobs -->
  <circle cx="642" cy="1389" r="520" fill="${C.indigo}" opacity="0.05"/>
  <circle cx="642" cy="1389" r="360" fill="${C.indigo}" opacity="0.05"/>

  <!-- Icon centered -->
  <g transform="translate(321, 1069)">
    <circle cx="321" cy="321" r="321" fill="#151428" opacity="0.7"/>
    <circle cx="321" cy="321" r="316" fill="none" stroke="${C.indigo}" stroke-width="2" opacity="0.4"/>
    <!-- Shuffle arrows (scaled 0.625x from 1024 icon, shifted) -->
    <path d="M 80 362 L 163 362 C 206 362 234 305 278 253 L 340 253"
          fill="none" stroke="${C.white}" stroke-width="32" stroke-linecap="round" opacity="0.92"/>
    <polyline points="322,228 346,253 322,278"
              fill="none" stroke="${C.white}" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>
    <path d="M 80 280 L 163 280 C 206 280 234 337 278 389 L 340 389"
          fill="none" stroke="url(#g1)" stroke-width="32" stroke-linecap="round"/>
    <polyline points="322,364 346,389 322,414"
              fill="none" stroke="url(#g1)" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="80" cy="280" r="13" fill="${C.indigo}" opacity="0.8"/>
    <circle cx="80" cy="362" r="13" fill="${C.white}" opacity="0.7"/>
  </g>

  <!-- App name -->
  <text x="642" y="1480" text-anchor="middle"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-weight="900" font-size="96" fill="${C.white}" letter-spacing="4" opacity="0.95">
    PICK FOR ME
  </text>
  <!-- Tagline -->
  <text x="642" y="1560" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-weight="400" font-size="46" fill="${C.indigo}" letter-spacing="2" opacity="0.8">
    Decide. Instantly.
  </text>
</svg>`;
}

// ─── Adaptive-icon foreground SVG ─────────────────────────────────────────────
// Android adaptive: foreground should be centered within safe zone (66%)
// Canvas = 1024×1024, safe zone = center 682×682 → icon = 480px
function adaptiveFgSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${C.indigo}"/>
      <stop offset="100%" stop-color="${C.purple}"/>
    </linearGradient>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${C.bg0}"/>
      <stop offset="100%" stop-color="${C.bg1}"/>
    </linearGradient>
  </defs>
  <!-- Full bleed background (adaptive icon includes this in monochrome mode) -->
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <!-- Safe-zone circle bg -->
  <circle cx="512" cy="512" r="320" fill="#17163a" opacity="0.9"/>
  <circle cx="512" cy="512" r="316" fill="none" stroke="${C.indigo}" stroke-width="2.5" opacity="0.5"/>
  <!-- Shuffle arrows — tighter, fits in safe zone -->
  <path d="M 300 568 L 390 568 C 446 568 488 480 548 412 L 636 412"
        fill="none" stroke="${C.white}" stroke-width="50" stroke-linecap="round" opacity="0.93"/>
  <polyline points="608,372 650,412 608,452"
            fill="none" stroke="${C.white}" stroke-width="50" stroke-linecap="round" stroke-linejoin="round" opacity="0.93"/>
  <path d="M 300 456 L 390 456 C 446 456 488 544 548 612 L 636 612"
        fill="none" stroke="url(#g1)" stroke-width="50" stroke-linecap="round"/>
  <polyline points="608,572 650,612 608,652"
            fill="none" stroke="url(#g1)" stroke-width="50" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="300" cy="456" r="18" fill="${C.indigo}" opacity="0.9"/>
  <circle cx="300" cy="568" r="18" fill="${C.white}" opacity="0.8"/>
</svg>`;
}

// ─── Favicon ─────────────────────────────────────────────────────────────────
function faviconSvg() {
  return iconSvg(196);
}

// ─── Generate ─────────────────────────────────────────────────────────────────
async function generate() {
  console.log('Generating app icons...\n');

  const jobs = [
    {
      name: 'icon.png',
      svg: iconSvg(1024),
      width: 1024,
      height: 1024,
    },
    {
      name: 'adaptive-icon.png',
      svg: adaptiveFgSvg(),
      width: 1024,
      height: 1024,
    },
    {
      name: 'splash.png',
      svg: splashSvg(),
      width: 1284,
      height: 2778,
    },
    {
      name: 'favicon.png',
      svg: faviconSvg(),
      width: 196,
      height: 196,
    },
  ];

  for (const job of jobs) {
    const out = path.join(OUT, job.name);
    try {
      await sharp(Buffer.from(job.svg))
        .resize(job.width, job.height)
        .png({ compressionLevel: 9 })
        .toFile(out);
      const stat = fs.statSync(out);
      console.log(`  ✓  ${job.name}  ${job.width}×${job.height}  (${(stat.size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`  ✗  ${job.name}:`, err.message);
    }
  }

  console.log('\nDone. Run `npx expo start` to preview the splash.');
}

generate().catch(console.error);
