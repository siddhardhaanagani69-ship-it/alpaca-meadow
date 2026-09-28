const ICONS = {
  carrot: '🥕', wool: '☁️', cheese: '🧀', skewer: '🍡', cutlery: '🍴',
  peas: '🫛', sprout: '🌱', gloves: '🧤', hat: '🎩', yarn: '🧶',
  socks: '🧦', corner: '📐', jewel: '💎',
};
const TOOL_INFO = {
  remove: ['🧺', 'Remove', 'Discard three tray cards'],
  undo: ['↩️', 'Undo', 'Return your last picked tile'],
  free: ['🪄', 'Free', 'Pick one covered tile'],
  hammer: ['🔨', 'Hammer', 'Erase one exposed tile'],
  mix: ['🔀', 'Mix', 'Shuffle the remaining board'],
};
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const roomCode = params.get('room')?.toUpperCase() || '';
let token = roomCode ? localStorage.getItem(`alpaca:${roomCode}`) : null;
let source = null;
let state = null;
let armed = null;
let selectedTrayIndex = null;
let toastTimer = null;

function toast(message) {
  const box = $('toast');
  box.textContent = message;
  box.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.add('hidden'), 3500);
}

function connection(message, offline = false) {
  $('connection').textContent = message;
  $('connection').classList.toggle('offline', offline);
}

async function request(path, method = 'GET', payload, authorized = true) {
  const response = await fetch(path, {
    method,
    headers: {
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
      ...(authorized && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

async function send(action) {
  if (!state) return;
  try {
    await request(`/api/rooms/${state.code}/action`, 'POST', action);
    armed = null;
    selectedTrayIndex = null;
    render(state);
  } catch (error) { toast(error.message); }
}

function showEntry() {
  $('home').classList.remove('hidden');
  $('room').classList.add('hidden');
  if (roomCode) {
    $('entry-button').innerHTML = 'Join room <span aria-hidden="true">↗</span>';
    $('entry-note').textContent = `Room ${roomCode} · Ask your host if it has already started.`;
  }
}

function joinSession(code, newToken) {
  localStorage.setItem(`alpaca:${code}`, newToken);
  location.href = `/?room=${encodeURIComponent(code)}`;
}

async function connect() {
  if (!roomCode || !token) return showEntry();
  try {
    const first = await request(`/api/rooms/${roomCode}`);
    render(first);
  } catch (error) {
    localStorage.removeItem(`alpaca:${roomCode}`);
    token = null;
    toast(error.message);
    return showEntry();
  }
  source?.close();
  source = new EventSource(`/api/rooms/${roomCode}/events?token=${encodeURIComponent(token)}`);
  source.onopen = () => connection('Connected');
  source.onerror = () => connection('Reconnecting…', true);
  source.onmessage = event => {
    try { render(JSON.parse(event.data)); }
    catch { connection('Sync problem', true); }
  };
}

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderPlayers() {
  const container = $('players');
  container.replaceChildren();
  const playing = ['easy', 'hard'].includes(state.stage);
  for (let index = 0; index < 4; index++) {
    const player = state.players[index];
    const self = player?.id === state.self.id;
    if (playing && self) continue;
    const sending = playing && player && selectedTrayIndex !== null;
    const card = make(sending ? 'button' : 'div', `player-card${!player ? ' empty' : ''}${self ? ' self' : ''}${sending ? ' can-send' : ''}`);
    const badge = !player ? 'Open' : state.stage === 'lobby' ? (player.host ? 'Host' : 'Ready') : `${player.progress}%`;
    card.append(make('span', 'player-badge', badge));
    const avatar = make('span', `player-avatar${player?.sos ? ' sos' : ''}`, !player ? '＋' : player.sos ? 'SOS' : ['🦙', '🌼', '🍀', '⭐'][index]);
    avatar.setAttribute('aria-hidden', 'true');
    if (player) {
      const online = make('span', `player-online${player.online ? '' : ' off'}`);
      online.title = player.online ? 'Online' : 'Offline';
      avatar.append(online);
    }
    const name = make('span', 'player-name');
    name.append(make('span', 'player-num', String(index + 1)), make('span', '', player ? (self ? `${player.name} (you)` : player.name) : 'Waiting…'));
    card.append(avatar, name);
    if (player?.request) card.append(make('span', 'request-bubble', `Needs ${ICONS[player.request]}`));
    if (sending) {
      card.type = 'button';
      card.setAttribute('aria-label', `Send ${state.self.tray[selectedTrayIndex]} to ${player.name}`);
      card.append(make('span', 'send-pill', `Send ${ICONS[state.self.tray[selectedTrayIndex]] || ''}`));
      card.addEventListener('click', () => send({ type: 'send', index: selectedTrayIndex, targetId: player.id }));
    }
    container.append(card);
  }
}

function renderBoard() {
  const board = $('board');
  board.replaceChildren();
  // fit the board to the layout's bounding box so no empty band shows
  const all = state.self.board;
  const minX = Math.min(...all.map(tile => tile.x)), minY = Math.min(...all.map(tile => tile.y));
  const width = Math.max(...all.map(tile => tile.x)) + 124 - minX, height = Math.max(...all.map(tile => tile.y)) + 124 - minY;
  board.style.aspectRatio = `${width} / ${height}`;
  for (const tile of state.self.board) {
    if (tile.removed) continue;
    const covered = state.self.board.some(other => !other.removed && other.layer > tile.layer && tile.x < other.x + 124 && tile.x + 124 > other.x && tile.y < other.y + 124 && tile.y + 124 > other.y);
    const button = make('button', `tile ${covered ? 'covered' : 'exposed'} ${tile.type === 'jewel' ? 'jewel' : ''}${covered && armed === 'free' ? ' free-target' : ''}`);
    button.type = 'button';
    button.style.left = `${100 * (tile.x - minX) / width}%`;
    button.style.top = `${100 * (tile.y - minY) / height}%`;
    button.style.width = `${100 * 124 / width}%`;
    button.style.height = `${100 * 124 / height}%`;
    button.style.setProperty('--layer', tile.layer + 1);
    button.setAttribute('aria-label', `${tile.type} tile${covered ? ', covered' : ', playable'}`);
    button.title = `${tile.type}${covered ? ' · covered' : ''}`;
    button.append(make('span', 'icon', ICONS[tile.type] || '•'));
    button.disabled = covered && armed !== 'free';
    button.addEventListener('click', () => {
      if (armed === 'hammer') return send({ type: 'hammer', tileId: tile.id });
      if (armed === 'alpaca') return send({ type: 'alpaca', tileId: tile.id });
      send({ type: 'pick', tileId: tile.id, free: covered && armed === 'free' });
    });
    board.append(button);
  }
  const remaining = state.self.board.filter(tile => !tile.removed).length;
  $('board-hint').textContent = armed === 'free' ? 'Tap a gray tile to use Free Choice.' : armed === 'hammer' ? 'Tap a bright tile to erase it with the Hammer.' : armed === 'alpaca' ? 'Tap a bright tile to call the alpaca and clear every tray.' : remaining ? 'Tap bright tiles. Gray tiles are covered by another layer.' : 'Your board is clear!';
}

function renderTray() {
  const tray = $('tray');
  tray.replaceChildren();
  state.self.tray.forEach((type, index) => {
    const button = make('button', `tray-tile${type === 'jewel' ? ' jewel' : ''}${selectedTrayIndex === index ? ' selected' : ''}`, ICONS[type]);
    button.type = 'button';
    button.title = type;
    button.setAttribute('aria-label', `${type} in tray, select to store or send`);
    button.addEventListener('click', () => {
      selectedTrayIndex = selectedTrayIndex === index ? null : index;
      renderTray();
      renderPlayers();
      renderWarehouse();
    });
    tray.append(button);
  });
  for (let slot = state.self.tray.length; slot < 7; slot++) tray.append(make('span', 'tray-slot'));
  $('tray-count').textContent = `${state.self.tray.length} / 7`;
  $('sos').classList.toggle('hidden', state.self.tray.length < 7);
  $('tray-hint').textContent = selectedTrayIndex === null ? 'Select a tray tile, then tap a teammate or an empty crate.' : `Selected ${ICONS[state.self.tray[selectedTrayIndex]]} ${state.self.tray[selectedTrayIndex]}. Tap a teammate to send it or an empty crate to store it.`;
  $('gauge-fill').style.width = `${state.self.gauge * 50}%`;
  $('gauge-count').textContent = `${state.self.gauge} / 2`;
  $('alpaca-button').disabled = state.self.gauge < 2;
  $('alpaca-button').classList.toggle('active', state.self.gauge >= 2);
  $('alpaca-button').textContent = armed === 'alpaca' ? '🦙 Choose a bright tile above · tap again to cancel' : '🦙 Call the alpaca · clear every tray';
}

function renderTools() {
  const container = $('tools');
  container.replaceChildren();
  for (const [type, [icon, label, title]] of Object.entries(TOOL_INFO)) {
    const count = state.self.tools[type];
    const button = make('button', `tool${count ? ' available' : ''}${armed === type ? ' armed' : ''}`);
    button.type = 'button';
    button.disabled = count < 1 || (type === 'undo' && !state.self.canUndo);
    button.title = title;
    button.setAttribute('aria-label', `${label}, ${count} available. ${title}`);
    button.append(make('span', 'tool-icon', icon), make('span', 'tool-count', String(count)), make('span', 'tool-label', label));
    button.addEventListener('click', () => {
      if (type === 'free' || type === 'hammer') {
        armed = armed === type ? null : type;
        renderBoard();
        renderTools();
      } else send({ type });
    });
    container.append(button);
  }
}

function renderWarehouse() {
  const container = $('warehouse');
  container.replaceChildren();
  for (let slot = 0; slot < 6; slot++) {
    const card = state.warehouse[slot];
    const button = make('button', `crate${card ? ' full' : ''}`, card ? ICONS[card.type] : '');
    button.type = 'button';
    if (card) {
      button.title = `${card.type} from ${card.from} · tap to take`;
      button.setAttribute('aria-label', `Take ${card.type} from the warehouse`);
      button.addEventListener('click', () => send({ type: 'take', cardId: card.id }));
    } else {
      button.disabled = selectedTrayIndex === null;
      button.title = 'Empty crate · select a tray tile, then tap to store it';
      button.setAttribute('aria-label', 'Store the selected tray tile in the warehouse');
      button.addEventListener('click', () => send({ type: 'put', index: selectedTrayIndex }));
    }
    container.append(button);
  }
}

function renderFeed() {
  $('feed').replaceChildren(...state.feed.map(item => make('li', '', item.text)));
}

function render(next) {
  if (state && state.self.tray.join('|') !== next.self.tray.join('|')) selectedTrayIndex = null;
  state = next;
  $('home').classList.add('hidden');
  $('room').classList.remove('hidden');
  $('room-code').textContent = state.code;
  $('invite-url').textContent = `${location.origin}/?room=${state.code}`;
  renderPlayers();
  const lobby = state.stage === 'lobby';
  const won = state.stage === 'won';
  $('lobby').classList.toggle('hidden', !lobby);
  $('play').classList.toggle('hidden', lobby || won);
  $('victory').classList.toggle('hidden', !won);
  $('order-panel').classList.toggle('hidden', lobby || won);
  if (lobby) {
    $('lobby-message').textContent = state.players.length === 4 ? 'All four alpacas are here. Your team is ready!' : `Share the link with ${4 - state.players.length} more friend${state.players.length === 3 ? '' : 's'}. The host can start when all four arrive.`;
    $('start-button').classList.toggle('hidden', !state.players.some(player => player.id === state.self.id && player.host));
    $('start-button').disabled = state.players.length !== 4;
  } else if (won) {
    const winner = state.players.find(player => player.id === state.winnerId);
    $('victory-message').textContent = `${winner?.name || 'Your team'} cleared the hard round in ${formatTime((state.finishedAt - state.startedAt) / 1000)}. Every alpaca gets the win!`;
    $('play-again').classList.toggle('hidden', !state.players.some(player => player.id === state.self.id && player.host));
  } else {
    const hard = state.stage === 'hard';
    $('stage-kicker').textContent = hard ? 'ROUND 2 OF 2 · THE CHALLENGE' : 'ROUND 1 OF 2 · WARM-UP';
    $('stage-title').textContent = hard ? 'The tricky meadow' : 'A gentle start';
    const self = state.players.find(player => player.id === state.self.id);
    $('progress-label').textContent = `${self.progress}% cleared`;
    $('progress-fill').style.width = `${self.progress}%`;
    const order = state.self.order;
    $('order-icon').textContent = ICONS[order.type];
    $('order-panel').setAttribute('aria-label', `Order: collect ${order.goal} ${order.type}, ${order.count} done. Finish it for a free tool.`);
    $('order-goal').textContent = `×${order.goal}`;
    $('order-fill').style.width = `${100 * order.count / order.goal}%`;
    $('order-progress').textContent = `${order.count} / ${order.goal}`;
    $('restart-button').classList.toggle('hidden', !self.host);
    if (selectedTrayIndex >= state.self.tray.length) selectedTrayIndex = null;
    renderBoard();
    renderTray();
    renderTools();
    renderWarehouse();
    renderFeed();
    $('request-kind').value = self.request || '';
  }
  renderTimer();
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function renderTimer() {
  if (!state?.startedAt) return;
  $('timer').textContent = formatTime(((state.finishedAt || Date.now()) - state.startedAt) / 1000);
}

for (const [type, icon] of Object.entries(ICONS)) {
  const option = make('option', '', `${icon} ${type}`);
  option.value = type;
  $('request-kind').append(option);
}
$('entry-form').addEventListener('submit', async event => {
  event.preventDefault();
  const name = $('name').value.trim();
  $('entry-button').disabled = true;
  try {
    const result = await request(roomCode ? `/api/rooms/${roomCode}/join` : '/api/rooms', 'POST', { name }, false);
    joinSession(result.code, result.token);
  } catch (error) {
    toast(error.message);
    $('entry-button').disabled = false;
  }
});
$('copy-link').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(`${location.origin}/?room=${state.code}`);
    toast('Invite link copied. Send it to three friends!');
  } catch { toast(`Room code: ${state.code}`); }
});
$('start-button').addEventListener('click', () => send({ type: 'start' }));
$('play-again').addEventListener('click', () => send({ type: 'start' }));
$('restart-button').addEventListener('click', () => send({ type: 'start' }));
$('alpaca-button').addEventListener('click', () => {
  armed = armed === 'alpaca' ? null : 'alpaca';
  renderBoard();
  renderTray();
  renderTools();
});
$('request-kind').addEventListener('change', event => send({ type: 'request', kind: event.target.value || null }));
setInterval(renderTimer, 1000);
connect();
