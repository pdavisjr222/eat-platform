const fs = require('fs');
const path = require('path');

// SVG template for E.A.T. icon with leaf and green color
const createSVG = (size) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Green background -->
  <rect width="${size}" height="${size}" fill="#22c55e"/>
  
  <!-- Leaf shape (main icon) -->
  <g transform="translate(${size/2}, ${size/2})">
    <!-- Leaf body -->
    <path d="M 0,-${size*0.35} Q ${size*0.2},-${size*0.1} ${size*0.15},${size*0.1} Q ${size*0.1},${size*0.25} -${size*0.05},${size*0.35} Q -${size*0.2},${size*0.2} -${size*0.15},${size*0.05} Q -${size*0.1},-${size*0.15} 0,-${size*0.35} Z" fill="#ffffff" stroke="#f0f0f0" stroke-width="1"/>
    
    <!-- Leaf vein -->
    <line x1="0" y1="${-size*0.35}" x2="0" y2="${size*0.35}" stroke="#e0e0e0" stroke-width="${Math.max(1, size/100)}"/>
  </g>
</svg>`;
};

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = __dirname;

sizes.forEach(size => {
  const svg = createSVG(size);
  const fileName = `icon-${size}x${size}.png.svg`;
  fs.writeFileSync(path.join(publicDir, fileName), svg);
  console.log(`Created ${fileName}`);
});

// Create maskable version for icon (512x512)
const maskableSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Leave room for safe zone (as per maskable guidelines) -->
  <g transform="translate(256, 256)">
    <circle cx="0" cy="0" r="180" fill="#22c55e"/>
    <path d="M 0,-140 Q 60,-40 50,40 Q 30,90 -20,130 Q -80,90 -50,20 Q -30,-60 0,-140 Z" fill="#ffffff"/>
    <line x1="0" y1="-140" x2="0" y2="130" stroke="#e0e0e0" stroke-width="3"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon-512x512-maskable.png.svg'), maskableSVG);
console.log('Created icon-512x512-maskable.png.svg');

// Create screenshot placeholders
const createScreenshot = (width, height, label) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#22c55e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#grad)"/>
  <text x="${width/2}" y="${height/2}" font-size="${Math.max(32, width/10)}" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="bold">${label}</text>
</svg>`;
};

const screenshots = [
  { name: 'screenshot-mobile-540x720.png.svg', width: 540, height: 720, label: 'E.A.T.\nMobile' },
  { name: 'screenshot-mobile-600x800.png.svg', width: 600, height: 800, label: 'E.A.T.\nMobile' },
  { name: 'screenshot-desktop-1280x720.png.svg', width: 1280, height: 720, label: 'E.A.T. - Desktop' },
  { name: 'screenshot-desktop-1920x1080.png.svg', width: 1920, height: 1080, label: 'E.A.T. - Desktop' }
];

screenshots.forEach(({ name, width, height, label }) => {
  const svg = createScreenshot(width, height, label);
  fs.writeFileSync(path.join(publicDir, name), svg);
  console.log(`Created ${name}`);
});

console.log('All placeholder images created successfully!');
