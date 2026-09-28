const crypto = require('node:crypto');

const EASY_TYPES = ['carrot', 'wool', 'cheese'];
const HARD_TYPES = [
  ...EASY_TYPES, 'skewer', 'cutlery', 'peas', 'sprout', 'gloves',
  'hat', 'yarn', 'socks', 'corner', 'jewel',
];
const TOOLS = ['remove', 'undo', 'free', 'hammer', 'mix'];
const TRAY_LIMIT = 7;
const WAREHOUSE_LIMIT = 6;

function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let n = Math.imul(value ^ (value >>> 15), 1 | value);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function positions(stage) {
  const tiles = [];
  const add = (cols, rows, x, y, layer) => {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        tiles.push({ id: tiles.length, x: x + col * 120, y: y + row * 120, layer });
      }
    }
  };
  if (stage === 'easy') add(6, 3, 170, 310, 0);
  else {
    add(8, 6, 20, 160, 0);
    add(6, 4, 100, 250, 1);
    add(3, 2, 340, 400, 2);
  }
  return tiles;
}

function overlaps(a, b) {
  return a.x < b.x + 124 && a.x + 124 > b.x && a.y < b.y + 124 && a.y + 124 > b.y;
}

function exposed(tile, board) {
  return !tile.removed && !board.some(other => !other.removed && other.layer > tile.layer && overlaps(tile, other));
}

function createBoard(stage, seed) {
  const random = rng(seed ^ (stage === 'easy' ? 0xa175 : 0xb33f));
  const board = positions(stage).map(tile => ({ ...tile, type: '', removed: false }));
  const order = [];
  const remaining = new Set(board.map(tile => tile.id));
  while (remaining.size) {
    const choices = board.filter(tile => remaining.has(tile.id) && exposed(tile, board));
    const chosen = choices[Math.floor(random() * choices.length)];
    order.push(chosen.id);
    chosen.removed = true;
    remaining.delete(chosen.id);
  }
  const types = stage === 'easy' ? EASY_TYPES : HARD_TYPES;
  const triples = shuffle(types.flatMap(type => [type, type]), random);
  board.forEach(tile => { tile.removed = false; });
  order.forEach((id, index) => { board[id].type = triples[Math.floor(index / 3)]; });
  return board;
}

function makePlayer(name, token, host, stage, seed) {
  return {
    id: crypto.randomUUID(), token, name, host, online: false,
    board: stage === 'lobby' ? [] : createBoard(stage, seed),
    tray: [], gauge: 0, matches: 0, lastPick: null,
    tools: Object.fromEntries(TOOLS.map(tool => [tool, 0])),
    request: null, order: null,
  };
}

function newRoom(name) {
  const seed = crypto.randomInt(0, 2 ** 32);
  const token = crypto.randomBytes(24).toString('base64url');
  const host = makePlayer(name, token, true, 'lobby', seed);
  return {
    code: '', seed, stage: 'lobby', players: [host], warehouse: [],
    startedAt: null, finishedAt: null, winnerId: null,
    feed: [{ text: `${name} opened the meadow.`, at: Date.now() }],
    touchedAt: Date.now(),
  };
}

function announce(room, text) {
  room.feed.unshift({ text, at: Date.now() });
  room.feed.length = Math.min(room.feed.length, 12);
  room.touchedAt = Date.now();
}

function publicState(room, viewer) {
  return {
    code: room.code, stage: room.stage, startedAt: room.startedAt,
    finishedAt: room.finishedAt, winnerId: room.winnerId,
    players: room.players.map(player => ({
      id: player.id, name: player.name, host: player.host, online: player.online,
      trayCount: player.tray.length, sos: player.tray.length >= TRAY_LIMIT,
      progress: player.board.length ? Math.round(100 * player.board.filter(tile => tile.removed).length / player.board.length) : 0,
      matches: player.matches, request: player.request,
    })),
    warehouse: room.warehouse, feed: room.feed,
    self: {
      id: viewer.id, name: viewer.name, board: viewer.board,
      tray: viewer.tray, gauge: viewer.gauge, tools: viewer.tools,
      canUndo: !!viewer.lastPick, order: viewer.order,
    },
  };
}

function fail(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function resolveTray(player) {
  for (const type of new Set(player.tray)) {
    if (player.tray.filter(card => card === type).length >= 3) {
      let removed = 0;
      player.tray = player.tray.filter(card => card !== type || ++removed > 3);
      player.matches++;
      if (type === 'jewel') player.gauge = Math.min(2, player.gauge + 1);
      return type;
    }
  }
  return null;
}

function addToTray(player, type) {
  if (player.tray.length >= TRAY_LIMIT && player.tray.filter(card => card === type).length < 2) fail('That tray is full. Send help another way.');
  player.tray.push(type);
  const matched = resolveTray(player);
  player.tray.sort();
  return matched;
}

function newOrder(player, stage) {
  const pool = stage === 'easy' ? EASY_TYPES : HARD_TYPES;
  const choices = pool.filter(type => type !== player.order?.type);
  player.order = { type: choices[crypto.randomInt(choices.length)], count: 0, goal: 3 };
}

function collectOrder(room, player, type) {
  if (player.order?.type !== type) return;
  player.order.count++;
  if (player.order.count >= player.order.goal) {
    const tool = TOOLS[crypto.randomInt(TOOLS.length)];
    player.tools[tool]++;
    announce(room, `${player.name} finished an order and earned ${tool}!`);
    newOrder(player, room.stage);
  }
}

function checkClear(room, player) {
  if (player.board.some(tile => !tile.removed)) return;
  if (room.stage === 'easy') {
    room.stage = 'hard';
    room.startedAt = Date.now();
    for (const teammate of room.players) {
      teammate.board = createBoard('hard', room.seed);
      teammate.tray = [];
      teammate.gauge = 0;
      teammate.matches = 0;
      teammate.lastPick = null;
      newOrder(teammate, 'hard');
      const random = rng(room.seed ^ teammate.id.charCodeAt(0));
      const rewards = shuffle([...TOOLS], random).slice(0, 2);
      rewards.forEach(tool => teammate.tools[tool]++);
    }
    announce(room, `${player.name} cleared the warm-up! The hard meadow is open. Everyone earned two tools.`);
  } else {
    room.stage = 'won';
    room.winnerId = player.id;
    room.finishedAt = Date.now();
    announce(room, `${player.name} cleared the hard meadow. The whole team wins!`);
  }
}

function start(room, actor) {
  if (!actor.host) fail('Only the host can start or restart.');
  if (room.players.length !== 4) fail('Four players are needed to start.');
  room.stage = 'easy';
  room.startedAt = Date.now();
  room.finishedAt = null;
  room.winnerId = null;
  room.warehouse = [];
  for (const player of room.players) {
    player.board = createBoard('easy', room.seed);
    player.tray = [];
    player.gauge = 0;
    player.matches = 0;
    player.lastPick = null;
    player.request = null;
    newOrder(player, 'easy');
    player.tools = Object.fromEntries(TOOLS.map(tool => [tool, 0]));
  }
  announce(room, `${actor.name} started a new meadow. Match three to clear!`);
}

function action(room, player, data) {
  if (data.type === 'start') return start(room, player);
  if (!['easy', 'hard'].includes(room.stage)) fail('The game has not started.');
  const board = player.board;
  const tile = board[data.tileId];
  if (data.type === 'pick' || data.type === 'hammer' || data.type === 'alpaca') {
    if (!Number.isInteger(data.tileId) || !tile || tile.removed) fail('That tile is unavailable.');
  }
  if (data.type === 'pick') {
    const free = !exposed(tile, board);
    if (free && (!data.free || player.tools.free < 1)) fail('That tile is covered. Use Free Choice.');
    if (player.tray.length >= TRAY_LIMIT && player.tray.filter(card => card === tile.type).length < 2) fail('Your tray is full. Ask your team for help.');
    player.lastPick = {
      tileId: tile.id, tray: [...player.tray], gauge: player.gauge,
      matches: player.matches, order: { ...player.order }, tools: { ...player.tools },
    };
    if (free) player.tools.free--;
    tile.removed = true;
    const matched = addToTray(player, tile.type);
    collectOrder(room, player, tile.type);
    if (matched) announce(room, `${player.name} matched three ${matched === 'jewel' ? 'jewels 💎' : matched + 's'}!`);
    checkClear(room, player);
  } else if (data.type === 'undo') {
    if (player.tools.undo < 1 || !player.lastPick) fail('No pick to undo.');
    const last = player.lastPick;
    if (board[last.tileId].removed === false) fail('That pick can no longer be undone.');
    board[last.tileId].removed = false;
    player.tray = last.tray;
    player.gauge = last.gauge;
    player.matches = last.matches;
    player.order = last.order;
    player.tools = last.tools;
    player.tools.undo = Math.max(0, player.tools.undo - 1);
    player.lastPick = null;
    announce(room, `${player.name} took back a tile.`);
  } else if (data.type === 'remove') {
    if (player.tools.remove < 1 || player.tray.length < 3) fail('You need a Remove tool and three tray cards.');
    player.tray.splice(0, 3);
    player.tools.remove--;
    player.lastPick = null;
    announce(room, `${player.name} cleared three tray cards.`);
  } else if (data.type === 'hammer') {
    if (player.tools.hammer < 1 || !exposed(tile, board)) fail('Choose an exposed tile and have a Hammer.');
    tile.removed = true;
    player.tools.hammer--;
    player.lastPick = null;
    announce(room, `${player.name} hammered a tile away.`);
    checkClear(room, player);
  } else if (data.type === 'mix') {
    if (player.tools.mix < 1) fail('You have no Mix tools.');
    const remaining = board.filter(card => !card.removed);
    const types = remaining.map(card => card.type);
    shuffle(types, rng(crypto.randomInt(0, 2 ** 32)));
    remaining.forEach((card, index) => { card.type = types[index]; });
    player.tools.mix--;
    player.lastPick = null;
    announce(room, `${player.name} mixed the remaining tiles.`);
  } else if (data.type === 'alpaca') {
    if (player.gauge < 2 || !exposed(tile, board)) fail('Charge the alpaca and choose an exposed tile.');
    tile.removed = true;
    player.gauge = 0;
    for (const teammate of room.players) {
      teammate.tray = [];
      teammate.lastPick = null;
    }
    announce(room, `${player.name} called the alpaca! Everyone's tray was cleared. 🦙`);
    checkClear(room, player);
  } else if (data.type === 'put' || data.type === 'send') {
    if (!Number.isInteger(data.index) || data.index < 0 || data.index >= player.tray.length) fail('Choose a card from your tray.');
    if (data.type === 'put' && room.warehouse.length >= WAREHOUSE_LIMIT) fail('The warehouse is full.');
    const type = player.tray[data.index];
    let recipient;
    if (data.type === 'send') {
      recipient = room.players.find(other => other.id === data.targetId && other.id !== player.id);
      if (!recipient) fail('Choose a teammate.');
      if (recipient.tray.length >= TRAY_LIMIT && recipient.tray.filter(card => card === type).length < 2) fail(`${recipient.name}'s tray is full.`);
    }
    player.tray.splice(data.index, 1);
    player.lastPick = null;
    if (recipient) {
      const matched = addToTray(recipient, type);
      recipient.lastPick = null;
      announce(room, `${player.name} sent ${type} to ${recipient.name}${matched ? ' — triple matched!' : '.'}`);
    } else {
      room.warehouse.push({ id: crypto.randomUUID(), type, from: player.name });
      announce(room, `${player.name} stored ${type} for the team.`);
    }
  } else if (data.type === 'take') {
    const index = room.warehouse.findIndex(card => card.id === data.cardId);
    if (index < 0) fail('That warehouse card is gone.');
    const type = room.warehouse[index].type;
    if (player.tray.length >= TRAY_LIMIT && player.tray.filter(card => card === type).length < 2) fail('Your tray is full.');
    room.warehouse.splice(index, 1);
    const matched = addToTray(player, type);
    player.lastPick = null;
    announce(room, `${player.name} took ${type} from storage${matched ? ' — triple matched!' : '.'}`);
  } else if (data.type === 'request') {
    if (data.kind !== null && !HARD_TYPES.includes(data.kind)) fail('Choose a valid tile type.');
    player.request = data.kind;
    announce(room, data.kind ? `${player.name} needs ${data.kind}.` : `${player.name} cleared their request.`);
  } else {
    fail('Unknown action.');
  }
  room.touchedAt = Date.now();
}

module.exports = { newRoom, makePlayer, publicState, action, createBoard, exposed, EASY_TYPES, HARD_TYPES };
