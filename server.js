const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { newRoom, makePlayer, publicState, action } = require('./game');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const rooms = new Map();
const clients = new Map();
const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
};

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(data));
}

function error(res, status, message) {
  json(res, status, { error: message });
}

async function body(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 8192) {
      const issue = new Error('Request too large.');
      issue.status = 413;
      throw issue;
    }
  }
  try { return JSON.parse(text || '{}'); }
  catch {
    const issue = new Error('Invalid JSON.');
    issue.status = 400;
    throw issue;
  }
}

function validName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (Array.from(name).length < 2 || Array.from(name).length > 16 || /[\p{Cc}\p{Cf}]/u.test(name)) {
    const issue = new Error('Choose a name from 2 to 16 characters.');
    issue.status = 400;
    throw issue;
  }
  return name;
}

function code() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result;
  do { result = Array.from(crypto.randomBytes(6), byte => letters[byte % letters.length]).join(''); }
  while (rooms.has(result));
  return result;
}

function member(room, token) {
  const player = room.players.find(candidate => candidate.token === token);
  if (!player) {
    const issue = new Error('Your player session is missing. Rejoin with the room link.');
    issue.status = 401;
    throw issue;
  }
  return player;
}

function broadcast(room) {
  for (const client of clients.get(room.code) || []) {
    const player = room.players.find(candidate => candidate.id === client.playerId);
    if (player) client.res.write(`data: ${JSON.stringify(publicState(room, player))}\n\n`);
  }
}

function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && files[url.pathname]) {
    const [filename, type] = files[url.pathname];
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; connect-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'self'",
    });
    fs.createReadStream(path.join(__dirname, 'public', filename)).pipe(res);
    return;
  }
  if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true });
  if (req.method === 'POST' && url.pathname === '/api/rooms') {
    return body(req).then(data => {
      if (rooms.size >= 500) return error(res, 503, 'Too many active rooms. Try later.');
      const room = newRoom(validName(data.name));
      room.code = code();
      rooms.set(room.code, room);
      clients.set(room.code, new Set());
      json(res, 201, { code: room.code, token: room.players[0].token });
    });
  }
  const match = url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{6})(?:\/(join|action|events))?$/);
  if (!match) return error(res, 404, 'Not found.');
  const room = rooms.get(match[1]);
  if (!room) return error(res, 404, 'Room not found. Ask the host for a new link.');
  const endpoint = match[2];
  if (req.method === 'POST' && endpoint === 'join') {
    return body(req).then(data => {
      if (room.stage !== 'lobby') return error(res, 409, 'This game has already started.');
      if (room.players.length >= 4) return error(res, 409, 'This room is full.');
      const name = validName(data.name);
      if (room.players.some(player => player.name.toLowerCase() === name.toLowerCase())) return error(res, 409, 'That name is already in the room.');
      const token = crypto.randomBytes(24).toString('base64url');
      const player = makePlayer(name, token, false, room.stage, room.seed);
      room.players.push(player);
      room.touchedAt = Date.now();
      json(res, 201, { code: room.code, token });
      broadcast(room);
    });
  }
  if (req.method === 'GET' && endpoint === 'events') {
    const player = member(room, url.searchParams.get('token'));
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(': connected\n\n');
    const client = { res, playerId: player.id };
    clients.get(room.code).add(client);
    player.online = true;
    broadcast(room);
    req.on('close', () => {
      clients.get(room.code)?.delete(client);
      player.online = [...(clients.get(room.code) || [])].some(other => other.playerId === player.id);
      broadcast(room);
    });
    return;
  }
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const player = member(room, token);
  if (req.method === 'GET' && !endpoint) return json(res, 200, publicState(room, player));
  if (req.method === 'POST' && endpoint === 'action') {
    return body(req).then(data => {
      action(room, player, data);
      json(res, 200, { ok: true });
      broadcast(room);
    });
  }
  error(res, 405, 'Method not allowed.');
}

const server = http.createServer((req, res) => {
  Promise.resolve().then(() => route(req, res)).catch(issue => error(res, issue.status || 500, issue.status ? issue.message : 'Server error.'));
});

setInterval(() => {
  for (const set of clients.values()) for (const client of set) client.res.write(': ping\n\n');
  for (const [roomCode, room] of rooms) {
    if (!clients.get(roomCode)?.size && Date.now() - room.touchedAt > 6 * 60 * 60 * 1000) {
      rooms.delete(roomCode);
      clients.delete(roomCode);
    }
  }
}, 25000).unref();

if (require.main === module) server.listen(PORT, HOST, () => console.log(`Alpaca Meadow running at http://localhost:${PORT}`));
module.exports = { server };
