'use strict';
/**
 * Forecraft Online - Dedicated Game Server
 * HTTP Static File Server + WebSocket MMORPG Engine
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const os = require('os');
const RoomManager = require('./roomManager');
const tunnel = require('./tunnel');

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const roomManager = new RoomManager();

// Dapatkan alamat IP lokal laptop agar perangkat lain di jaringan yang sama dapat terhubung
function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];

  // API Endpoints
  if (urlPath === '/api/rooms') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ rooms: roomManager.getRoomsList() }));
    return;
  }

  if (urlPath === '/api/server-info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      port: PORT,
      localIp: getLocalIp(),
      publicDomain: tunnel.getPublicUrl(),
      discoveryTopic: tunnel.DISCOVERY_TOPIC
    }));
    return;
  }

  if (urlPath === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      version: '0.2.4-online',
      uptime: process.uptime()
    }));
    return;
  }

  // Static File Serving
  let safePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  const fullPath = path.join(ROOT_DIR, safePath);

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  });
});

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      return;
    }

    switch (msg.type) {
      case 'get_rooms':
        ws.send(JSON.stringify({
          type: 'rooms_list',
          rooms: roomManager.getRoomsList()
        }));
        break;

      case 'join':
        roomManager.handleJoin(ws, msg);
        break;

      case 'move':
        roomManager.handleMove(ws, msg);
        break;

      case 'block_change':
        roomManager.handleBlockChange(ws, msg);
        break;

      case 'attack':
        roomManager.handleAttack(ws, msg);
        break;

      case 'chat':
        roomManager.handleChat(ws, msg);
        break;

      case 'mob_spawn':
        roomManager.handleMobSpawn(ws, msg);
        break;

      case 'mob_sync':
        roomManager.handleMobSync(ws, msg);
        break;

      case 'mob_damage':
        roomManager.handleMobDamage(ws, msg);
        break;

      case 'mob_death':
        roomManager.handleMobDeath(ws, msg);
        break;

      case 'drop_spawn':
        roomManager.handleDropSpawn(ws, msg);
        break;

      case 'drop_pickup':
        roomManager.handleDropPickup(ws, msg);
        break;

      case 'sync_player':
        roomManager.handlePlayerSync(ws, msg);
        break;

      case 'leave':
        roomManager.handleDisconnect(ws);
        break;
    }
  });

  ws.on('close', () => {
    roomManager.handleDisconnect(ws);
  });

  ws.on('error', (err) => {
    console.error('[WebSocket Error]', err.message);
    roomManager.handleDisconnect(ws);
  });
});

// Ping interval untuk menjaga koneksi dan mendeteksi disconnected sockets
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Tick rate snapshot broadcast: 20 ticks per second (50ms)
const tickInterval = setInterval(() => {
  roomManager.broadcastSnapshot();
}, 50);

// Shutdown handling
function handleExit() {
  console.log('\n[Server] Mematikan server & menyimpan database...');
  tunnel.stopTunnel();
  clearInterval(pingInterval);
  clearInterval(tickInterval);
  roomManager.shutdown();
  server.close(() => {
    console.log('[Server] Server ditutup.');
    process.exit(0);
  });
}

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log('====================================================');
  console.log('            FORECRAFT ONLINE GAME SERVER            ');
  console.log('====================================================');
  console.log(` > Server aktif di port : ${PORT}`);
  console.log(` > Akses Lokal (Laptop) : http://localhost:${PORT}`);
  console.log(` > Akses LAN (HP / PC)  : http://${localIp}:${PORT}`);
  console.log(' > 10 Persistent World Rooms siap menerima koneksi.');
  console.log('====================================================\n');

  tunnel.startTunnel(PORT);
});
