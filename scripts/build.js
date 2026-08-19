const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const wwwDir = path.join(rootDir, 'www');

if (fs.existsSync(wwwDir)) {
  fs.rmSync(wwwDir, { recursive: true, force: true });
}
fs.mkdirSync(wwwDir, { recursive: true });

fs.copyFileSync(path.join(rootDir, 'index.html'), path.join(wwwDir, 'index.html'));
fs.cpSync(path.join(rootDir, 'css'), path.join(wwwDir, 'css'), { recursive: true });
fs.cpSync(path.join(rootDir, 'js'), path.join(wwwDir, 'js'), { recursive: true });
/* folder Audio (musik latar & SFX) ikut disalin bila ada */
if (fs.existsSync(path.join(rootDir, 'Audio'))) {
  fs.cpSync(path.join(rootDir, 'Audio'), path.join(wwwDir, 'Audio'), { recursive: true });
}
/* folder Cutscene (intro story saat New Game) ikut disalin bila ada */
if (fs.existsSync(path.join(rootDir, 'Cutscene'))) {
  fs.cpSync(path.join(rootDir, 'Cutscene'), path.join(wwwDir, 'Cutscene'), { recursive: true });
}

console.log('Build completed: Assets successfully copied to www/');
