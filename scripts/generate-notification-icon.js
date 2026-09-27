/**
 * Generates the Android notification icon for Pick For Me.
 * Run: node scripts/generate-notification-icon.js
 * Output: assets/notification-icon.png (96x96, transparent)
 *
 * Android throws away every colour in this asset and keeps ONLY the alpha
 * channel, painting the silhouette in the system's tint (we set ours via the
 * `color` prop on the expo-notifications plugin). So the artwork is pure white
 * on transparent, and all that matters is the shape.
 *
 * Size: the expo-notifications plugin resizes this one source into
 * drawable-mdpi..xxxhdpi at 24/36/48/72/96 px. 96 is the largest of those, so
 * feeding it exactly 96 means the biggest density is a straight copy and every
 * other one is a downscale.
 *
 * Shape: the app icon's wheel reduced to what survives at 24x24 — the rim, six
 * spokes and the hub. No pointer triangle, no slice fills: at mdpi those turn
 * into mud. Strokes are 8px here, which is 2px at mdpi — thin enough to read as
 * a line, thick enough not to disappear.
 */

const sharp = require('sharp');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'notification-icon.png');

const SIZE = 96;
const C = SIZE / 2;   // centre: 48

const STROKE = 8;     // rim and spoke thickness -> 2px at mdpi
const RIM_R = 40;     // stroke centre, so the rim spans r=36..44 (4px margin)

// The hub has to be clearly WIDER than a spoke or it disappears. Six spokes
// meeting in the middle already paint a blob there, so at the app icon's
// hub/wheel ratio (~0.2, i.e. r=9 here) the dot is invisible — it just reads as
// the spokes crossing. r=14 is 3.5x the stroke width, which still reads as a
// round hub at mdpi. The rim stays at 40 rather than 41: the extra pixel opens
// the wedges slightly but leaves under 1px of margin once scaled to 24x24.
const HUB_R = 14;

// Spokes every 60°, one pointing straight up — same orientation as the app icon.
const SPOKES = [90, 150, 210, 270, 330, 30];

function spokeLine(angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    // Runs from the centre to the middle of the rim stroke: overlapping the rim
    // guarantees they stay visually joined once anti-aliasing shrinks at mdpi.
    const x = C + RIM_R * Math.cos(rad);
    const y = C - RIM_R * Math.sin(rad);
    return `<line x1="${C}" y1="${C}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}"`
        + ` stroke="#FFFFFF" stroke-width="${STROKE}" stroke-linecap="butt"/>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <circle cx="${C}" cy="${C}" r="${RIM_R}" fill="none" stroke="#FFFFFF" stroke-width="${STROKE}"/>
  ${SPOKES.map(spokeLine).join('\n  ')}
  <circle cx="${C}" cy="${C}" r="${HUB_R}" fill="#FFFFFF"/>
</svg>`;

sharp(Buffer.from(svg))
    .resize(SIZE, SIZE)
    .png()
    .toFile(OUT)
    .then(info => {
        console.log(`notification-icon.png  ${info.width}x${info.height}  ${info.size} bytes`);
    })
    .catch(err => {
        console.error('Failed to generate notification icon:', err);
        process.exit(1);
    });
