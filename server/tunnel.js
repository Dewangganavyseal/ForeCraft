const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');

let tunnelProcess = null;
let currentPublicUrl = null;
let heartbeatTimer = null;

const DISCOVERY_TOPIC = 'forecraft_online_dewan_v1';

function publishDiscovery(domain) {
  if (!domain) return;
  try {
    const payload = domain.trim();
    const req = https.request({
      hostname: 'ntfy.sh',
      port: 443,
      path: `/${DISCOVERY_TOPIC}`,
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 5000
    }, (res) => {
      // response ignored
    });
    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch (e) {}
}

function startTunnel(port = 3000) {
  const binaryPath = path.join(__dirname, '..', 'cloudflared.exe');
  if (!fs.existsSync(binaryPath)) {
    console.warn('[Tunnel] cloudflared.exe tidak ditemukan di:', binaryPath);
    console.warn('[Tunnel] Server berjalan dalam mode Local LAN.');
    return;
  }

  console.log('[Tunnel] Menghubungkan ke Cloudflare Quick Tunnel untuk akses publik...');
  
  try {
    tunnelProcess = spawn(binaryPath, ['tunnel', '--url', `http://127.0.0.1:${port}`], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const handleOutput = (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/([a-zA-Z0-9-]+\.trycloudflare\.com)/);
      if (match && !currentPublicUrl) {
        currentPublicUrl = match[1];
        const fullUrl = `https://${currentPublicUrl}`;
        
        // Simpan ke file untuk referensi
        try {
          fs.writeFileSync(path.join(__dirname, 'public_url.txt'), fullUrl, 'utf8');
        } catch (err) {}

        console.log('\n====================================================');
        console.log('🌐 FORECRAFT ONLINE - SERVER PUBLIK INTERNET AKTIF! ');
        console.log('====================================================');
        console.log(` > Domain Publik     : ${currentPublicUrl}`);
        console.log(` > Akses Web / HTTPS : ${fullUrl}`);
        console.log(` > Akses WSS Game    : wss://${currentPublicUrl}`);
        console.log(' > Auto-Discovery    : HP & PC otomatis terhubung!');
        console.log('====================================================\n');

        publishDiscovery(currentPublicUrl);

        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => {
          if (currentPublicUrl) publishDiscovery(currentPublicUrl);
        }, 60000);
      }
    };

    tunnelProcess.stdout.on('data', handleOutput);
    tunnelProcess.stderr.on('data', handleOutput);

    tunnelProcess.on('exit', (code) => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      currentPublicUrl = null;
      console.log(`[Tunnel] Proses tunnel berhenti (code: ${code})`);
    });

    tunnelProcess.on('error', (err) => {
      console.warn('[Tunnel] Gagal menjalankan cloudflared:', err.message);
    });

  } catch (err) {
    console.warn('[Tunnel] Exception:', err.message);
  }
}

function stopTunnel() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (tunnelProcess) {
    try {
      tunnelProcess.kill('SIGTERM');
    } catch (e) {}
    tunnelProcess = null;
  }
  currentPublicUrl = null;
}

function getPublicUrl() {
  return currentPublicUrl;
}

module.exports = {
  startTunnel,
  stopTunnel,
  getPublicUrl,
  DISCOVERY_TOPIC
};
