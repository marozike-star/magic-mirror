#!/usr/bin/env node
/* Magic Mirror – vietinis serveris be jokių priklausomybių.
   - HTTP  (8080): televizoriaus puslapis /tv
   - HTTPS (8443): telefono puslapis (kamerai reikia https)
   - WebSocket /ws: perduoda judesio taškus iš telefono į TV tame pačiame „kambaryje".
   Vaizdo įrašas niekada nepasiekia serverio. */
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const HTTP_PORT = +process.env.PORT || 8080;
const HTTPS_PORT = +process.env.HTTPS_PORT || 8443;
const PUBLIC = path.join(__dirname, 'docs');
const MAX_MSG = 64 * 1024;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon'
};

function lanIPs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  }
  // Pirmiausia tipiniai namų tinklų adresai
  return out.sort((a, b) => (/^192\.168\./.test(b) ? 1 : 0) - (/^192\.168\./.test(a) ? 1 : 0));
}

/* ---------- Savarankiškai pasirašytas https sertifikatas (be openssl) ---------- */
function der(tag, body) {
  const n = body.length;
  const len = n < 0x80 ? Buffer.from([n]) : n < 0x100 ? Buffer.from([0x81, n]) : Buffer.from([0x82, n >> 8, n & 0xff]);
  return Buffer.concat([Buffer.from([tag]), len, body]);
}
const seq = (...items) => der(0x30, Buffer.concat(items));
function oid(str) {
  const p = str.split('.').map(Number), out = [40 * p[0] + p[1]];
  for (const v of p.slice(2)) {
    const b = [v & 0x7f]; let x = v >> 7;
    while (x) { b.unshift((x & 0x7f) | 0x80); x >>= 7; }
    out.push(...b);
  }
  return der(0x06, Buffer.from(out));
}
function utcTime(d) {
  const z = n => String(n).padStart(2, '0');
  return der(0x17, Buffer.from(z(d.getUTCFullYear() % 100) + z(d.getUTCMonth() + 1) + z(d.getUTCDate()) + z(d.getUTCHours()) + z(d.getUTCMinutes()) + z(d.getUTCSeconds()) + 'Z'));
}

function makeSelfSignedCert(ips) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const sigAlg = seq(oid('1.2.840.113549.1.1.11'), Buffer.from([0x05, 0x00])); // sha256WithRSAEncryption
  const name = seq(der(0x31, seq(oid('2.5.4.3'), der(0x0c, Buffer.from('Magic Mirror')))));
  const serial = crypto.randomBytes(16); serial[0] &= 0x7f; serial[0] |= 0x01;
  const now = Date.now();
  const san = Buffer.concat([der(0x82, Buffer.from('localhost'))].concat(
    ['127.0.0.1'].concat(ips).map(ip => der(0x87, Buffer.from(ip.split('.').map(Number))))));
  const exts = der(0xa3, seq(
    seq(oid('2.5.29.17'), der(0x04, der(0x30, san))),                                // subjectAltName
    seq(oid('2.5.29.19'), der(0x04, seq()))                                          // basicConstraints
  ));
  const tbs = seq(
    der(0xa0, der(0x02, Buffer.from([2]))),                                          // v3
    der(0x02, serial), sigAlg, name,
    seq(utcTime(new Date(now - 864e5)), utcTime(new Date(now + 825 * 864e5))),
    name, publicKey.export({ type: 'spki', format: 'der' }), exts
  );
  const sig = crypto.sign('sha256', tbs, privateKey);
  const cert = seq(tbs, sigAlg, der(0x03, Buffer.concat([Buffer.from([0]), sig])));
  const b64 = cert.toString('base64').match(/.{1,64}/g).join('\n');
  return {
    key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    cert: '-----BEGIN CERTIFICATE-----\n' + b64 + '\n-----END CERTIFICATE-----\n'
  };
}

function ensureCert() {
  const dir = path.join(__dirname, 'certs');
  const key = path.join(dir, 'key.pem'), cert = path.join(dir, 'cert.pem'), ipsFile = path.join(dir, 'ips.txt');
  const ips = lanIPs().filter(ip => /^\d+\.\d+\.\d+\.\d+$/.test(ip));
  try {
    // Naudojame esamą sertifikatą, jei kompiuterio adresai nepasikeitė
    if (fs.existsSync(key) && fs.existsSync(cert)) {
      const known = fs.existsSync(ipsFile) ? fs.readFileSync(ipsFile, 'utf8').split(',') : null;
      if (!known || ips.every(ip => known.includes(ip))) return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };
    }
    const c = makeSelfSignedCert(ips);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(key, c.key); fs.writeFileSync(cert, c.cert); fs.writeFileSync(ipsFile, ips.join(','));
    return c;
  } catch (e) {
    console.error('  Sertifikato klaida:', e.message);
    return null;
  }
}

/* ---------- Statiniai failai ---------- */
function handler(req, res) {
  let u;
  try { u = new URL(req.url, 'http://local'); } catch (e) { res.writeHead(400); return res.end(); }
  let p;
  try { p = decodeURIComponent(u.pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (p === '/info') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ ips: lanIPs(), httpPort: HTTP_PORT, httpsPort: tlsOk ? HTTPS_PORT : null }));
  }
  if (p === '/') p = '/index.html';
  if (p === '/tv' || p === '/tv/') p = '/tv.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Nerasta'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Permissions-Policy': 'camera=(self)',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(data);
  });
}

/* ---------- Minimalus WebSocket ---------- */
const rooms = new Map(); // kodas -> { phone:Set, tv:Set }

function wsSend(sock, str) {
  if (sock.destroyed) return;
  const payload = Buffer.from(str);
  let header;
  if (payload.length < 126) header = Buffer.from([0x81, payload.length]);
  else if (payload.length < 65536) { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 126; header.writeUInt16BE(payload.length, 2); }
  else { header = Buffer.alloc(10); header[0] = 0x81; header[1] = 127; header.writeBigUInt64BE(BigInt(payload.length), 2); }
  // Jei TV nespėja priimti, praleidžiame kadrą, o ne kaupiame atmintį
  if (sock.writableLength > 256 * 1024) return;
  sock.write(Buffer.concat([header, payload]));
}

function broadcastPeers(code) {
  const r = rooms.get(code); if (!r) return;
  const msg = JSON.stringify({ t: 'peers', tv: r.tv.size, phone: r.phone.size });
  for (const s of r.phone) wsSend(s, msg);
  for (const s of r.tv) wsSend(s, msg);
}

function onUpgrade(req, socket) {
  let u;
  try { u = new URL(req.url, 'http://local'); } catch (e) { return socket.destroy(); }
  const code = (u.searchParams.get('room') || '').toUpperCase();
  const role = u.searchParams.get('role') === 'tv' ? 'tv' : 'phone';
  const key = req.headers['sec-websocket-key'];
  if (u.pathname !== '/ws' || !key || !/^[A-Z0-9]{4,8}$/.test(code)) return socket.destroy();

  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);

  if (!rooms.has(code)) rooms.set(code, { phone: new Set(), tv: new Set() });
  const room = rooms.get(code);
  room[role].add(socket);
  broadcastPeers(code);

  let buf = Buffer.alloc(0), frags = [];
  const others = () => (role === 'phone' ? room.tv : room.phone);

  socket.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    if (buf.length > MAX_MSG * 4) return socket.destroy();
    while (buf.length >= 2) {
      const fin = buf[0] & 0x80, op = buf[0] & 0x0f, masked = buf[1] & 0x80;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      if (len > MAX_MSG) return socket.destroy();
      const maskOff = off; if (masked) off += 4;
      if (buf.length < off + len) return;
      const data = Buffer.from(buf.subarray(off, off + len));
      if (masked) for (let i = 0; i < data.length; i++) data[i] ^= buf[maskOff + (i & 3)];
      buf = buf.subarray(off + len);

      if (op === 0x8) { try { socket.end(Buffer.from([0x88, 0])); } catch (e) { } return; }
      if (op === 0x9) { socket.write(Buffer.concat([Buffer.from([0x8A, data.length]), data])); continue; }
      if (op === 0xA) continue;
      if (op === 0x1 || op === 0x0) {
        frags.push(data);
        if (!fin) continue;
        const text = Buffer.concat(frags).toString('utf8'); frags = [];
        for (const s of others()) wsSend(s, text);
      }
    }
  });
  const cleanup = () => {
    if (!room[role].delete(socket)) return;
    if (!room.phone.size && !room.tv.size) rooms.delete(code); else broadcastPeers(code);
  };
  socket.on('close', cleanup);
  socket.on('error', cleanup);
}

/* ---------- Paleidimas ---------- */
const tls = ensureCert();
const tlsOk = !!tls;

const httpServer = http.createServer(handler);
httpServer.on('upgrade', onUpgrade);
httpServer.listen(HTTP_PORT, '0.0.0.0');

if (tls) {
  const httpsServer = https.createServer(tls, handler);
  httpsServer.on('upgrade', onUpgrade);
  httpsServer.listen(HTTPS_PORT, '0.0.0.0');
}

const ip = lanIPs()[0] || 'localhost';
console.log('\n  Magic Mirror veikia!\n');
console.log('  Televizoriuje atidarykite:   http://' + ip + ':' + HTTP_PORT + '/tv');
if (tls) console.log('  Telefonas (be TV):           https://' + ip + ':' + HTTPS_PORT + '/');
else console.log('  DĖMESIO: nepavyko sukurti https sertifikato. Telefono kamera veiks tik per https.');
console.log('\n  Sustabdyti: Ctrl+C\n');
