'use strict';
/**
 * =============================================================================
 * FORECRAFT 3D - AUTO UPDATE & MANDATORY VERSION CHECK MODULE
 * File: js/updater.js
 * 
 * Fitur:
 *  - Cek versi terbaru ke Server Lokal & GitHub sebelum masuk Main Menu
 *  - Jika versi tidak cocok / ada versi baru: tampilkan dialog New Version
 *  - Tombol Update: otomatis unduh APK / reload aset terbaru
 *  - Tombol Close: kunci game total (tidak bisa dimainkan meskipun offline)
 * =============================================================================
 */

const Updater = {
  GITHUB_RAW_PKG: 'https://raw.githubusercontent.com/Dewangganavyseal/ForeCraft/main/package.json',
  GITHUB_LATEST_RELEASE: 'https://github.com/Dewangganavyseal/ForeCraft/releases/latest',
  GITHUB_APK_DOWNLOAD: 'https://github.com/Dewangganavyseal/ForeCraft/releases/latest/download/ForecraftOnline.apk',
  
  locked: false,
  targetVersion: null,
  detectedInfo: null,

  compare(v1, v2) {
    if (!v1 || !v2) return 0;
    const p1 = String(v1).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const p2 = String(v2).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
      const a = p1[i] || 0;
      const b = p2[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  },

  isOutdated(currentVer, latestVer) {
    return this.compare(latestVer, currentVer) > 0;
  },

  async fetchWithTimeout(url, ms = 3000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  },

  async queryLatestVersion() {
    // 1. Coba hubungi Dedicated Server lokal / tunnel jika ada
    if (typeof Network !== 'undefined' && Network.getServerHttpUrl) {
      try {
        const srvUrl = Network.getServerHttpUrl();
        const data = await this.fetchWithTimeout(`${srvUrl}/api/version`, 2500);
        if (data && data.version) {
          return {
            version: data.version,
            downloadUrl: `${srvUrl}${data.apkUrl || '/ForecraftOnline.apk'}`,
            source: 'server'
          };
        }
      } catch (e) {}
    }

    // 2. Coba hubungi GitHub raw package.json resmi (online 24/7 di internet)
    try {
      const pkg = await this.fetchWithTimeout(this.GITHUB_RAW_PKG, 3200);
      if (pkg && pkg.version) {
        return {
          version: pkg.version,
          downloadUrl: this.GITHUB_APK_DOWNLOAD,
          source: 'github'
        };
      }
    } catch (e) {}

    return null;
  },

  async init() {
    const currentVer = (typeof CFG !== 'undefined' && CFG.VERSION) ? CFG.VERSION : '0.2.41';
    
    // Periksa apakah game sedang dalam kondisi terkunci (pernah ditutup tanpa update)
    const wasLocked = localStorage.getItem('forecraft_update_locked') === '1';
    const savedTarget = localStorage.getItem('forecraft_target_version');

    if (wasLocked && savedTarget) {
      // Jika versi lokal saat ini sudah sama atau lebih tinggi dari target, lepaskan kunci
      if (this.compare(currentVer, savedTarget) >= 0) {
        localStorage.removeItem('forecraft_update_locked');
        localStorage.removeItem('forecraft_target_version');
        this.locked = false;
      } else {
        // Game masih terkunci! Meskipun sedang OFFLINE, game tidak boleh dimainkan!
        this.locked = true;
        this.targetVersion = savedTarget;
        this.showModal({
          version: savedTarget,
          downloadUrl: this.GITHUB_APK_DOWNLOAD,
          source: 'offline_lock'
        }, true);
        return true; // Blokir main menu
      }
    }

    // Lakukan pengecekan versi terbaru online sebelum membuka menu utama
    try {
      const latest = await this.queryLatestVersion();
      if (latest && this.isOutdated(currentVer, latest.version)) {
        this.detectedInfo = latest;
        this.targetVersion = latest.version;
        this.showModal(latest, false);
        return true; // Blokir main menu
      }
    } catch (err) {
      console.warn('[Updater] Pengecekan versi gagal / mode offline:', err.message);
    }

    return false; // Versi cocok, lanjutkan ke Main Menu
  },

  showModal(info, isLockedScreen = false) {
    const currentVer = (typeof CFG !== 'undefined' && CFG.VERSION) ? CFG.VERSION : '0.2.41';
    const newVer = info.version || 'Terbaru';

    let overlay = document.getElementById('update-modal-ov');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'update-modal-ov';
      document.body.appendChild(overlay);
    }

    overlay.style.display = 'flex';

    if (isLockedScreen) {
      overlay.innerHTML = `
        <div id="update-modal-box">
          <div class="u-badge" style="background:#ef4444;">GAME TERKUNCI</div>
          <h2>PEMBARUAN WAJIB</h2>
          <div class="u-versions">
            <span style="color:#94a3b8;">Versi Lama: <b>v${currentVer}</b></span>
            <span style="color:#fdba74;">➜</span>
            <span style="color:#4ade80;">Wajib: <b>v${newVer}</b></span>
          </div>
          <p class="u-desc">
            Game dinonaktifkan dan tidak dapat dimainkan (termasuk mode offline) sampai diperbarui ke versi terbaru.
          </p>
          <div id="update-modal-btns">
            <button id="update-btn-update">🚀 Update Sekarang</button>
            <button id="update-btn-close">Keluar Game</button>
          </div>
          <div id="update-status" style="margin-top:12px;font-size:12px;color:#fcd34d;display:none;"></div>
        </div>
      `;
    } else {
      overlay.innerHTML = `
        <div id="update-modal-box">
          <div class="u-badge">NEW VERSION</div>
          <h2>PEMBARUAN TERSEDIA</h2>
          <div class="u-versions">
            <span style="color:#94a3b8;">Versi Saat Ini: <b>v${currentVer}</b></span>
            <span style="color:#fdba74;">➜</span>
            <span style="color:#4ade80;">Versi Baru: <b>v${newVer}</b></span>
          </div>
          <p class="u-desc">
            Versi terbaru Forecraft telah dirilis dengan perbaikan gameplay dan multiplayer. Silakan perbarui game untuk melanjutkan bermain.
          </p>
          <div id="update-modal-btns">
            <button id="update-btn-update">✨ Update</button>
            <button id="update-btn-close">❌ Close</button>
          </div>
          <div id="update-status" style="margin-top:12px;font-size:12px;color:#fcd34d;display:none;"></div>
        </div>
      `;
    }

    const btnUpdate = overlay.querySelector('#update-btn-update');
    const btnClose = overlay.querySelector('#update-btn-close');
    const statusEl = overlay.querySelector('#update-status');

    btnUpdate.addEventListener('click', () => {
      this.performUpdate(info, statusEl);
    });

    btnClose.addEventListener('click', () => {
      this.performClose(newVer);
    });
  },

  performUpdate(info, statusEl) {
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = 'Menyiapkan pengunduhan versi terbaru...';
    }

    const isMobile = (typeof IS_MOBILE !== 'undefined' && IS_MOBILE) ||
      ('ontouchstart' in window) ||
      (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

    const dlUrl = info.downloadUrl || this.GITHUB_APK_DOWNLOAD;

    if (isMobile) {
      if (statusEl) statusEl.textContent = 'Membuka unduhan file APK terbaru... Silakan pasang setelah selesai.';
      // Buka URL download langsung pada browser HP / sistem download Android
      try {
        const link = document.createElement('a');
        link.href = dlUrl;
        link.target = '_system';
        link.download = 'ForecraftOnline.apk';
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (e) {
        window.location.href = dlUrl;
      }
    } else {
      // Pada Web / PC: bersihkan cache browser & service worker, lalu refresh ke versi terbaru
      if (statusEl) statusEl.textContent = 'Membersihkan cache & memuat versi terbaru...';
      setTimeout(() => {
        try {
          if ('caches' in window) {
            caches.keys().then(names => Promise.all(names.map(name => caches.delete(name)))).then(() => {
              window.location.reload(true);
            });
          } else {
            window.location.reload(true);
          }
        } catch (e) {
          window.location.reload(true);
        }
      }, 800);
    }
  },

  performClose(targetVer) {
    // 1. Simpan status terkunci permanen di penyimpanan lokal
    localStorage.setItem('forecraft_update_locked', '1');
    if (targetVer) {
      localStorage.setItem('forecraft_target_version', targetVer);
    }

    // 2. Coba keluar dari aplikasi Android (Capacitor)
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App && window.Capacitor.Plugins.App.exitApp) {
        window.Capacitor.Plugins.App.exitApp();
      }
    } catch (e) {}

    // 3. Coba tutup jendela browser
    try {
      window.close();
    } catch (e) {}

    // 4. Jika jendela tidak tertutup otomatis, alihkan ke layar blokir total
    this.locked = true;
    this.showModal({
      version: targetVer,
      downloadUrl: this.GITHUB_APK_DOWNLOAD
    }, true);

    // Hentikan suara/musik game jika ada
    if (typeof Music !== 'undefined' && Music.stop) Music.stop();
  }
};

window.Updater = Updater;
