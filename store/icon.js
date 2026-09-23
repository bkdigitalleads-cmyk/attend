const sharp = require('sharp');

// Attendance Tracker icon: deep navy field, an amber clipboard with three
// rows and bold check marks. Reads at 60px; nothing like the medal (Merit),
// the flame (Hearth) or the gift (Given).
const svg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1B2A5E"/>
      <stop offset="1" stop-color="#0D1430"/>
    </linearGradient>
    <linearGradient id="board" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F6C453"/>
      <stop offset="1" stop-color="#E39A12"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.35" r="0.6">
      <stop offset="0" stop-color="#F2B544" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#F2B544" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="512" cy="400" r="380" fill="url(#glow)"/>
  <!-- clipboard body -->
  <rect x="232" y="196" width="560" height="680" rx="56" fill="url(#board)"/>
  <rect x="232" y="196" width="560" height="680" rx="56" fill="none" stroke="#0D1430" stroke-opacity="0.18" stroke-width="10"/>
  <!-- clip -->
  <rect x="402" y="150" width="220" height="110" rx="40" fill="#0D1430"/>
  <rect x="440" y="176" width="144" height="46" rx="20" fill="#F6C453"/>
  <!-- paper -->
  <rect x="290" y="300" width="444" height="520" rx="26" fill="#FFF7E6"/>
  <!-- rows: check, check, x -->
  <g stroke-width="34" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M 346 402 L 392 448 L 470 366" stroke="#1E8E5A"/>
    <line x1="520" y1="410" x2="676" y2="410" stroke="#1B2A5E" stroke-opacity="0.35"/>
    <path d="M 346 562 L 392 608 L 470 526" stroke="#1E8E5A"/>
    <line x1="520" y1="570" x2="676" y2="570" stroke="#1B2A5E" stroke-opacity="0.35"/>
    <path d="M 366 690 L 452 776 M 452 690 L 366 776" stroke="#C0392B"/>
    <line x1="520" y1="730" x2="676" y2="730" stroke="#1B2A5E" stroke-opacity="0.35"/>
  </g>
</svg>`;

(async () => {
  const buf = Buffer.from(svg);
  await sharp(buf).resize(1024, 1024).png().toFile('../assets/icon.png');
  await sharp(buf).resize(1024, 1024).png().toFile('../assets/android-icon-foreground.png');
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#0F1424' } })
    .png().toFile('../assets/android-icon-background.png');
  await sharp(buf).resize(1024, 1024).grayscale().png().toFile('../assets/android-icon-monochrome.png');
  await sharp(buf).resize(48, 48).png().toFile('../assets/favicon.png');
  await sharp(buf).resize(512, 512).png().toFile('../assets/splash-icon.png');
  console.log('icons written');
})();
