const fs = require('fs');
const path = require('path');

const files = [
  { src: path.join(__dirname, '..', 'public', 'pwa-192.png.base64'), dest: path.join(__dirname, '..', 'public', 'pwa-192.png') },
  { src: path.join(__dirname, '..', 'public', 'pwa-512.png.base64'), dest: path.join(__dirname, '..', 'public', 'pwa-512.png') },
];

files.forEach(({ src, dest }) => {
  if (!fs.existsSync(src)) {
    console.warn('Base64 file not found:', src);
    return;
  }
  const b64 = fs.readFileSync(src, 'utf8').trim();
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(dest, buf);
  console.log('Wrote', dest);
});
