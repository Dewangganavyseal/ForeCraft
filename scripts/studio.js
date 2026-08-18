/**
 * Zero-dependency static server for Forecraft 3D Studio.
 *
 * Why a server instead of double-clicking index.html:
 * opening the file directly gives the page a "null" origin, which blocks
 * localStorage in some browsers and makes every AI request fail CORS.
 *
 * Usage:
 *   npm run studio            -> serves /Modeling and opens the browser
 *   npm run studio -- 8081    -> pick a specific port
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ROOT = path.join(__dirname, '..', 'Modeling');
const START_PORT = Number(process.argv[2]) || 8080;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.glb': 'model/gltf-binary'
};

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
    console.error(`Tidak menemukan ${path.join(ROOT, 'index.html')}`);
    process.exit(1);
}

const server = http.createServer((req, res) => {
    // Enable CORS headers for local server
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-target-url');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let rel = decodeURIComponent(req.url.split('?')[0]);

    // CORS Proxy endpoint for external AI provider calls
    if (rel === '/api/proxy' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk; });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(bodyStr);
                const targetUrl = payload.url;
                const headers = payload.headers || {};
                const bodyData = typeof payload.body === 'string' ? payload.body : JSON.stringify(payload.body);

                const response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: headers,
                    body: bodyData
                });

                const resText = await response.text();
                res.writeHead(response.status, {
                    'Content-Type': response.headers.get('content-type') || 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(resText);
            } catch (err) {
                console.error('[Proxy Error]:', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: { message: 'Proxy request error: ' + err.message } }));
            }
        });
        return;
    }

    // Save Generated HTML WebGL Showcase into Modeling/Model 3D folder
    if (rel === '/api/save-html' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(bodyStr);
                const filename = (payload.filename || `Showcase_${Date.now()}.html`).replace(/[^a-z0-9_.-]/gi, '_');
                const targetFolder = path.join(ROOT, 'Model 3D');
                if (!fs.existsSync(targetFolder)) {
                    fs.mkdirSync(targetFolder, { recursive: true });
                }
                const savePath = path.join(targetFolder, filename);

                fs.writeFileSync(savePath, payload.content, 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, filename, relativePath: `Model 3D/${filename}` }));
            } catch (err) {
                console.error('[Save HTML Error]:', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    if (rel === '/') rel = '/index.html';

    // Keep every request inside the studio folder.
    const filePath = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403).end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 - ' + rel);
            return;
        }
        res.writeHead(200, {
            'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-store'   // always pick up fresh edits
        });
        res.end(data);
    });
});

// If the chosen port is busy, move to the next one instead of crashing.
let port = START_PORT;
server.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && port < START_PORT + 20) {
        console.log(`Port ${port} dipakai, mencoba ${port + 1}...`);
        server.listen(++port, '127.0.0.1');
    } else {
        console.error(e.message);
        process.exit(1);
    }
});

server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}/`;
    console.log('');
    console.log('  Forecraft 3D Studio berjalan di:');
    console.log('  ' + url);
    console.log('');
    console.log('  Tekan Ctrl+C untuk berhenti.');
    console.log('');
    exec(`start "" "${url}"`, { shell: 'cmd.exe' });
});
