const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const src = path.join(rootDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const dest = path.join(rootDir, 'ForestSurvival3D.apk');

if (!fs.existsSync(src)) {
  console.error('APK tidak ditemukan di: ' + src);
  process.exit(1);
}

fs.copyFileSync(src, dest);
const size = (fs.statSync(dest).size / 1048576).toFixed(2);
console.log(`APK terbaru dikopi ke ForestSurvival3D.apk (${size} MB)`);