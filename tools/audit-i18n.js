#!/usr/bin/env node
'use strict';
/* =============================================================================
   AUDIT I18N — pemindai cakupan terjemahan teks UI
   -----------------------------------------------------------------------------
   Memindai SEMUA sumber teks yang tampil di layar di dalam js/*.js:
     - UI.toast('...') / .toast(`...`)
     - .innerHTML = / += `...`
     - .textContent / .innerText = '...'
     - .title = '...'
   Untuk tiap potongan teks Indonesia, jalankan simulasi I18N.translateText(en)
   memakai kamus I18N_PHRASE + I18N_DIALOG di js/i18n_data.js. Bila masih ada
   kata Indonesia yang tak berubah → dilaporkan sebagai "belum ter-translate".

   Cara pakai:
     node tools/audit-i18n.js            # laporan ringkas
     node tools/audit-i18n.js --verbose  # sertakan cuplikan teks sumber
   Keluar dengan kode 1 bila ada temuan (berguna untuk CI / pre-commit).

   CATATAN: sistem i18n game ini berbasis pencocokan frasa, bukan MT. Setiap
   teks baru yang ditambahkan ke UI harus didaftarkan ke I18N_PHRASE (atau
   I18N_DIALOG untuk kalimat dialog NPC utuh) agar ikut berganti bahasa.
   ============================================================================= */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JS_DIR = path.join(ROOT, 'js');
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');

/* ---- muat objek konstanta dari file sumber tanpa memuat seluruh modul ---- */
function loadConst(file, name) {
  const src = fs.readFileSync(path.join(JS_DIR, file), 'utf8');
  const m = new RegExp('const ' + name + '\\s*=\\s*\\{').exec(src);
  if (!m) return {};
  let i = src.indexOf('{', m.index), depth = 0, end = -1;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  // eslint-disable-next-line no-eval
  return eval('(' + src.slice(i, end + 1) + ')');
}

const I18N_PHRASE = loadConst('i18n_data.js', 'I18N_PHRASE');
const I18N_DIALOG = loadConst('i18n_data.js', 'I18N_DIALOG');
const phraseKeys = Object.keys(I18N_PHRASE).sort((a, b) => b.length - a.length);

/* ---- simulasi I18N.translateText untuk bahasa Inggris (index 0) ---- */
const LETTER = /[A-Za-z0-9\u00C0-\u024F]/;
function replaceWord(text, key, rep) {
  let out = '', i = 0;
  for (;;) {
    const at = text.indexOf(key, i);
    if (at < 0) { out += text.slice(i); break; }
    const before = at > 0 ? text[at - 1] : '';
    const after = (at + key.length < text.length) ? text[at + key.length] : '';
    const bad = (before && LETTER.test(before)) || (after && LETTER.test(after));
    out += text.slice(i, at) + (bad ? key : rep);
    i = at + key.length;
  }
  return out;
}
function translate(txt) {
  let out = txt;
  if (I18N_DIALOG[out.trim()]) return ''; // dialog utuh → tertangani
  for (const key of phraseKeys) {
    if (out.indexOf(key) < 0) continue;
    const rep = I18N_PHRASE[key][0];
    if (!rep) continue;
    out = (key.indexOf(' ') < 0) ? replaceWord(out, key, rep) : out.split(key).join(rep);
  }
  return out;
}

/* ---- daftar kata Indonesia yang jelas berbeda dari Inggris ----
   Bila salah satu tersisa utuh setelah translate(en), teks dianggap belum
   diterjemahkan. Kata yang kebetulan identik di EN (Level, Damage, Combo,
   Slot, dll) SENGAJA tidak dimasukkan agar tidak jadi false-positive. */
const ID_WORDS = new RegExp('\\b(' + [
  'koin','blok','lagi','muncul','ditangkap','memakan','memasang','dipasang','tersimpan',
  'dibatalkan','diunduh','diupdate','berhasil','bermasalah','terlalu','jauh','mendekatlah',
  'geser','tanah','utk','dari','dulu','pohon','tumbang','hujan','turun','reda','raksasa',
  'pelajari','pemula','pawang','jumlah','gagal','kembali','putar','pasang','batal','bawah',
  'maks','sudah','maksimum','butuh','habis','berkurang','harta','reruntuhan',
  'penjaga','agung','terbangun','ditaklukkan','pulih','meja','kerja','terbuka','sebelumnya',
  'kurang','belum','aktif','menaikkan','bahan','pilih','dengan','tanpa','setiap','saat',
  'kamu','kau','milik','punya','klik','tekan','untuk','dapat','tidak','bisa',
  'ambil','buang','simpan','pindah','pakai','lepas','buka','tutup','hanya','semua',
  'seorang','sebuah','sedang','masih','akan','telah','yang','pada',
  'penduduk','desa','pedagang','rekan','ramuan','panah',
  'perisai','tameng','sarung','sepatu','baju','celana','makanan','minuman',
  'ladang','benih','panen','cangkul','tanam','resep','hadiah','musuh',
  'pertahanan','kecepatan','jangkauan','kritikal','tempa','kualitas','siapkan','bicara','rekrut'
].join('|') + ')\\b', 'i');

/* ---- pola sumber teks yang tampil di UI ---- */
const STRING = "(`(?:[^`\\\\]|\\\\.)*`|'(?:[^'\\\\]|\\\\.)*'|\"(?:[^\"\\\\]|\\\\.)*\")";
const patterns = [
  { name: 'toast',     re: new RegExp('\\.toast\\s*\\(\\s*' + STRING, 'g') },
  { name: 'innerHTML', re: new RegExp('\\.innerHTML\\s*\\+?=\\s*' + STRING, 'g') },
  { name: 'textCont',  re: new RegExp('\\.(?:textContent|innerText)\\s*=\\s*' + STRING, 'g') },
  { name: 'title',     re: new RegExp('\\.title\\s*=\\s*' + STRING, 'g') },
];

/* pecah string jadi potongan teks Indonesia: buang ${...} dan tag <...> */
function idPortions(str) {
  let s = str.replace(/\$\{[^}]*\}/g, '\u0001').replace(/<[^>]+>/g, '\u0001');
  return s.split('\u0001').map(x => x.trim()).filter(x => x.length);
}

function main() {
  const files = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js') && !f.startsWith('i18n'));
  const byFile = {};
  let total = 0;

  for (const f of files) {
    const src = fs.readFileSync(path.join(JS_DIR, f), 'utf8');
    for (const pat of patterns) {
      pat.re.lastIndex = 0;
      let m;
      while ((m = pat.re.exec(src))) {
        const inner = m[1].slice(1, -1);
        const lineNo = src.slice(0, m.index).split('\n').length;
        for (const p of idPortions(inner)) {
          if (!ID_WORDS.test(p)) continue;
          const out = translate(p.replace(/\$\{[^}]*\}/g, ' \u2022 '));
          const res = out.match(new RegExp(ID_WORDS.source, 'gi'));
          if (res) {
            (byFile[f] = byFile[f] || []).push({
              line: lineNo, src: pat.name, text: p,
              words: [...new Set(res.map(w => w.toLowerCase()))]
            });
            total++;
          }
        }
      }
    }
  }

  const fileNames = Object.keys(byFile).sort();
  if (total === 0) {
    console.log('AUDIT I18N: LULUS — semua teks UI yang terdeteksi sudah tercakup terjemahan.');
    console.log('(' + phraseKeys.length + ' entri I18N_PHRASE, ' + Object.keys(I18N_DIALOG).length + ' dialog)');
    process.exit(0);
  }

  console.log('AUDIT I18N: ' + total + ' potongan teks belum tercakup di ' + fileNames.length + ' file:\n');
  for (const f of fileNames) {
    const seen = new Set();
    const rows = byFile[f].sort((a, b) => a.line - b.line).filter(x => {
      if (seen.has(x.text)) return false; seen.add(x.text); return true;
    });
    console.log('  ' + f + ' (' + rows.length + ')');
    for (const x of rows) {
      const snippet = VERBOSE ? ('  «' + x.text.slice(0, 100) + '»') : '';
      console.log('    L' + x.line + ' [' + x.src + '] {' + x.words.join(',') + '}' + snippet);
    }
  }
  console.log('\nTambahkan frasa yang belum ada ke I18N_PHRASE di js/i18n_data.js.');
  process.exit(1);
}

main();
