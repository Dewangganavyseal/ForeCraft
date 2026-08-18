'use strict';
/* =============================================================================
   UI STUDIO SERVER — server lokal development
   -----------------------------------------------------------------------------
   Cara pakai:
     node tools/ui-studio-server.js

   Lalu buka:
     http://localhost:8123

   Fitur:
   - Menyajikan game dari folder project.
   - Endpoint POST /__ui_studio_save untuk menulis file yang dihasilkan
     UI Studio, default: js/ui_layout.js.
   ============================================================================= */
const http=require('http');
const fs=require('fs');
const path=require('path');

const ROOT=path.join(__dirname,'..');
const PORT=8123;

const MIME={
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.svg':'image/svg+xml',
  '.ico':'image/x-icon',
  '.mp3':'audio/mpeg',
  '.ogg':'audio/ogg',
  '.wav':'audio/wav',
};

function safePath(urlPath){
  let p=decodeURIComponent(urlPath.split('?')[0]);
  if(p==='/')p='/index.html';
  const fp=path.normalize(path.join(ROOT,p));
  if(!fp.startsWith(ROOT))return null;
  return fp;
}

const server=http.createServer((req,res)=>{
  /* ---------- save dari UI Studio ---------- */
  if(req.method==='POST'&&req.url==='/__ui_studio_save'){
    let body='';
    req.on('data',c=>body+=c);
    req.on('end',()=>{
      try{
        const data=JSON.parse(body||'{}');
        const file=data.file||'js/ui_layout.js';
        const content=String(data.content||'');
        const fp=path.normalize(path.join(ROOT,file));
        if(!fp.startsWith(ROOT)){
          res.writeHead(400);res.end('bad path');return;
        }
        fs.mkdirSync(path.dirname(fp),{recursive:true});
        fs.writeFileSync(fp,content,'utf8');
        res.writeHead(200,{'Content-Type':'application/json'});
        res.end(JSON.stringify({ok:true,file}));
      }catch(err){
        res.writeHead(500);res.end(String(err&&err.message||err));
      }
    });
    return;
  }

  /* ---------- static files ---------- */
  const fp=safePath(req.url||'/');
  if(!fp){res.writeHead(403);res.end('forbidden');return;}
  fs.readFile(fp,(err,buf)=>{
    if(err){res.writeHead(404);res.end('not found');return;}
    const ext=path.extname(fp).toLowerCase();
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream'});
    res.end(buf);
  });
});

server.listen(PORT,()=>{
  console.log('UI Studio server aktif: http://localhost:'+PORT);
  console.log('Root project: '+ROOT);
});
