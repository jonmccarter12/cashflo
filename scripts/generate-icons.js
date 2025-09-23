// Placeholder icon generator for PWA
// Run this to create temporary icons until you have proper designs

const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 72, 96, 128, 144, 152, 167, 180, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create SVG icon template
const createSVGIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
  <text x="50%" y="55%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold">💰</text>
</svg>
`;

// Generate icon files
sizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  const fileName = `icon-${size}x${size}.svg`;
  const filePath = path.join(iconsDir, fileName);

  fs.writeFileSync(filePath, svgContent.trim());
  console.log(`✅ Created ${fileName}`);
});

// Create browser config for Windows
const browserConfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/icons/icon-144x144.svg"/>
      <TileColor>#8b5cf6</TileColor>
    </tile>
  </msapplication>
</browserconfig>
`;

fs.writeFileSync(path.join(iconsDir, 'browserconfig.xml'), browserConfig);
console.log('✅ Created browserconfig.xml');

// Create favicon
const faviconSVG = createSVGIcon(32);
fs.writeFileSync(path.join(__dirname, '../public/favicon.svg'), faviconSVG.trim());
console.log('✅ Created favicon.svg');

console.log('\n🎉 PWA icons generated successfully!');
console.log('📝 Note: These are placeholder SVG icons. For production, you should:');
console.log('   1. Create proper PNG icons using a tool like Figma or Canva');
console.log('   2. Use a service like RealFaviconGenerator.net');
console.log('   3. Replace the SVG files with optimized PNG versions');