const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const wwwDir = path.join(rootDir, 'www');

if (fs.existsSync(wwwDir)) {
  fs.rmSync(wwwDir, { recursive: true, force: true });
}
fs.mkdirSync(wwwDir, { recursive: true });

let version = '0.2.45';
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  if (pkg.version) version = pkg.version;
} catch (e) {}

let html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
// Tambahkan query parameter versi anti-cache ke seluruh file JS & CSS internal
html = html.replace(/(src="js\/[^"]+\.js)(")/g, `$1?v=${version}$2`);
html = html.replace(/(href="css\/[^"]+\.css)(")/g, `$1?v=${version}$2`);
fs.writeFileSync(path.join(wwwDir, 'index.html'), html, 'utf8');

if (fs.existsSync(path.join(rootDir, 'Walkthrough_Studio.html'))) {
  fs.copyFileSync(path.join(rootDir, 'Walkthrough_Studio.html'), path.join(wwwDir, 'Walkthrough_Studio.html'));
}
fs.cpSync(path.join(rootDir, 'css'), path.join(wwwDir, 'css'), { recursive: true });
fs.cpSync(path.join(rootDir, 'js'), path.join(wwwDir, 'js'), { recursive: true });
/* folder buttons (gambar tombol UI dari "Button UI") ikut disalin bila ada */
if (fs.existsSync(path.join(rootDir, 'buttons'))) {
  fs.cpSync(path.join(rootDir, 'buttons'), path.join(wwwDir, 'buttons'), { recursive: true });
}
/* folder Audio (musik latar & SFX) ikut disalin bila ada */
if (fs.existsSync(path.join(rootDir, 'Audio'))) {
  fs.cpSync(path.join(rootDir, 'Audio'), path.join(wwwDir, 'Audio'), { recursive: true });
}
/* folder Cutscene (intro story saat New Game) ikut disalin bila ada */
if (fs.existsSync(path.join(rootDir, 'Cutscene'))) {
  fs.cpSync(path.join(rootDir, 'Cutscene'), path.join(wwwDir, 'Cutscene'), { recursive: true });
}

console.log('Build completed: Assets successfully copied to www/');
