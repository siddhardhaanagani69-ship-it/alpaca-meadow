const ICONS = {
  carrot: '🥕', wool: '☁️', cheese: '🧀', skewer: '🍡', cutlery: '🍴',
  peas: '🫛', sprout: '🌱', gloves: '🧤', hat: '🧢', yarn: '🧶',
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
// Hand-drawn tile art: chunky fills with a dark outline, in the style of the real game.
const ART = {
  carrot: '<path d="M12 54C20 40 30 28 38 22c6-4 12 0 10 6-4 8-20 18-36 26z" fill="#f58b2a"/><path d="M27 38l5 3M34 31l4 3" fill="none"/><path d="M44 22c0-9 5-14 8-16 0 6-2 12-6 16zM47 25c5-6 10-7 13-7-2 6-7 8-12 8z" fill="#5bbf3a"/>',
  wool: '<path d="M18 48a9 9 0 0 1-3-17 10 10 0 0 1 13-13 11 11 0 0 1 19 2 9 9 0 0 1 5 16 8 8 0 0 1-9 12z" fill="#fff"/><path d="M24 32q5-4 9 0M33 40q5-4 9 0M38 27q4-3 7 0" fill="none" stroke="#b9c4cc"/>',
  cheese: '<path d="M8 34L44 14l12 20z" fill="#ffe07a"/><path d="M8 34h48v16H8z" fill="#ffc934"/><g fill="#e3a01b" stroke="none"><circle cx="20" cy="42" r="3.5"/><circle cx="38" cy="44" r="2.8"/><circle cx="48" cy="39" r="2.2"/><circle cx="38" cy="27" r="3"/></g>',
  skewer: '<path d="M10 56L54 10" fill="none" stroke-width="4" stroke="#9b6a3c"/><path d="M10 56L54 10" fill="none" stroke-width="1.5" stroke="#d9a66b"/><circle cx="20" cy="44" r="8" fill="#c65a2e"/><circle cx="31" cy="33" r="7" fill="#7cc243"/><circle cx="42" cy="22" r="8" fill="#c65a2e"/>',
  cutlery: '<path d="M16 8v12M22 8v12M28 8v12M16 20q0 8 6 8t6-8" fill="none"/><rect x="19" y="27" width="6" height="29" rx="3" fill="#c9d3dc"/><path d="M40 8c10 4 10 18 7 24h-7z" fill="#e6ecf1"/><rect x="39" y="31" width="8" height="25" rx="3" fill="#8e9aa6"/>',
  peas: '<path d="M8 36c8-16 36-20 48-10-8 16-36 20-48 10z" fill="#6cc04a"/><g fill="#a5e678"><circle cx="21" cy="34" r="5.5"/><circle cx="32" cy="31" r="5.5"/><circle cx="43" cy="29" r="5.5"/></g><path d="M56 26c2-4 4-6 6-6" fill="none"/>',
  sprout: '<path d="M16 54q16-8 32 0z" fill="#9b6a3c"/><path d="M32 52V30" fill="none" stroke-width="4" stroke="#3f8f28"/><path d="M32 32c-12 0-20-8-20-18 12 0 20 6 20 18zM32 30c2-12 12-18 22-16 0 12-10 18-22 16z" fill="#62c23f"/>',
  gloves: '<path d="M20 50V28c0-12 6-18 14-18s12 6 12 16v8l6-6c4-4 8 2 4 6L46 46v4z" fill="#e24b4b"/><rect x="17" y="46" width="32" height="11" rx="3" fill="#fff"/><path d="M24 51h18" fill="none" stroke="#e7b3b3"/>',
  hat: '<circle cx="32" cy="12" r="6" fill="#fff"/><path d="M12 42c0-20 10-28 20-28s20 8 20 28z" fill="#3d8be0"/><path d="M24 20v20M32 18v22M40 20v20" fill="none" stroke="#2a6fc0"/><rect x="9" y="40" width="46" height="13" rx="6" fill="#2a6fc0"/>',
  yarn: '<circle cx="31" cy="32" r="20" fill="#e9573f"/><path d="M14 26c10-4 24-2 34 8M13 37c12-6 26-2 34 10M23 14c7 10 9 24 5 36" fill="none" stroke="#a8321f" stroke-width="2.5"/><path d="M46 46q8 6 14 2" fill="none"/>',
  socks: '<path d="M22 8h16v26l12 8c6 4 4 14-4 14l-18-4c-8-2-8-8-6-12z" fill="#f4f7fb"/><rect x="22" y="8" width="16" height="9" fill="#3d8be0"/><path d="M22 22h16" fill="none" stroke="#3d8be0" stroke-width="3"/><path d="M44 46c4 0 7 3 6 8" fill="none" stroke="#3d8be0" stroke-width="3"/>',
  corner: '<path d="M10 54V10l44 44z" fill="#8fc3ea"/><path d="M18 45V30l15 15z" fill="#fffff4"/><path d="M10 20h5M10 28h5M10 36h5M10 44h5" fill="none" stroke-width="2"/>',
  jewel: '<path d="M14 24l8-12h20l8 12-18 30z" fill="#a66be0"/><path d="M14 24l8-12h20l8 12z" fill="#c9a0f5"/><path d="M14 24h36M26 24l6 30 6-30M22 12l4 12M42 12l-4 12" fill="none" stroke-width="2"/><path d="M24 16l-3 5" fill="none" stroke="#fff" stroke-width="2.5"/>',
};
const TOOL_ART = {
  remove: '<path d="M14 34v18h36V34"/><path d="M32 42V12M22 22l10-10 10 10"/>',
  undo: '<path d="M22 22h16a12 12 0 0 1 0 24H24"/><path d="M29 14l-8 8 8 8"/>',
  free: '<path d="M14 52l26-26"/><path d="M46 10l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="currentColor"/>',
  hammer: '<path d="M18 50l20-20" stroke-width="7"/><path d="M30 14l16 16 6-6-16-16z" fill="currentColor"/>',
  mix: '<path d="M10 22h12c12 0 12 20 24 20h8M10 42h12c6 0 8-4 10-8M36 28c2-4 4-6 10-6h8M48 16l6 6-6 6M48 36l6 6-6 6"/>',
};
function art(type, tool = false) {
  const span = make('span', tool ? 'tool-icon' : 'icon');
  span.innerHTML = tool
    ? `<svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${TOOL_ART[type]}</svg>`
    : `<svg viewBox="0 0 64 64" aria-hidden="true" stroke="#3b2a1f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${ART[type] || ''}</svg>`;
  return span;
}
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
    if (state.stage !== 'lobby' && self) continue;
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
  board.style.width = `${Math.min(100, 100 * width / 844)}%`;
  for (const tile of state.self.board) {
    if (tile.removed) continue;
    const covered = state.self.board.some(other => !other.removed && other.layer > tile.layer && tile.x < other.x + 124 && tile.x + 124 > other.x && tile.y < other.y + 124 && tile.y + 124 > other.y);
    const button = make('button', `tile ${covered ? 'covered' : 'exposed'} ${tile.type === 'jewel' ? 'jewel' : ''}${covered && armed === 'free' ? ' free-target' : ''}`);
    button.type = 'button';
    button.style.left = `${100 * (tile.x - minX) / width}%`;
    button.style.top = `${100 * (tile.y - minY) / height}%`;
    button.style.width = `${100 * 116 / width}%`;
    button.style.height = `${100 * 116 / height}%`;
    button.style.setProperty('--layer', tile.layer + 1);
    button.setAttribute('aria-label', `${tile.type} tile${covered ? ', covered' : ', playable'}`);
    button.title = `${tile.type}${covered ? ' · covered' : ''}`;
    button.append(art(tile.type));
    button.disabled = covered && armed !== 'free';
    button.addEventListener('click', () => {
      if (armed === 'hammer') return send({ type: 'hammer', tileId: tile.id });
      if (armed === 'alpaca') return send({ type: 'alpaca', tileId: tile.id });
      send({ type: 'pick', tileId: tile.id, free: covered && armed === 'free' });
    });
    board.append(button);
  }
  const remaining = state.self.board.filter(tile => !tile.removed).length;
  $('board-hint').textContent = armed === 'free' ? 'Tap a gray tile to use Free Choice.' : armed === 'hammer' ? 'Tap a bright tile to erase it with the Hammer.' : armed === 'alpaca' ? 'Tap a bright tile to call the alpaca and clear every tray.' : remaining ? '' : 'Your board is clear!';
}

function renderTray() {
  const tray = $('tray');
  tray.replaceChildren();
  state.self.tray.forEach((type, index) => {
    const button = make('button', `tray-tile${type === 'jewel' ? ' jewel' : ''}${selectedTrayIndex === index ? ' selected' : ''}`);
    button.append(art(type));
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
  $('tray-hint').textContent = selectedTrayIndex === null ? '' : `Selected ${ICONS[state.self.tray[selectedTrayIndex]]} ${state.self.tray[selectedTrayIndex]}. Tap a teammate to send it or an empty crate to store it.`;
  $('gauge-fill').style.width = `${state.self.gauge * 50}%`;
  $('gauge-count').textContent = `${state.self.gauge} / 2`;
  $('alpaca-button').classList.toggle('hidden', state.self.gauge < 2);
  $('alpaca-button').textContent = armed === 'alpaca' ? '🦙 Choose a bright tile · tap to cancel' : '🦙 Call the alpaca · clear every tray';
}

function renderTools() {
  const container = $('tools');
  container.replaceChildren();
  for (const [type, [, label, title]] of Object.entries(TOOL_INFO)) {
    const count = state.self.tools[type];
    const button = make('button', `tool${count ? ' available' : ''}${armed === type ? ' armed' : ''}`);
    button.type = 'button';
    button.disabled = count < 1 || (type === 'undo' && !state.self.canUndo);
    button.title = title;
    button.setAttribute('aria-label', `${label}, ${count} available. ${title}`);
    button.append(art(type, true), make('span', 'tool-count', String(count)), make('span', 'tool-label', label));
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
    const button = make('button', `crate${card ? ' full' : ''}`);
    if (card) button.append(art(card.type));
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
  $('play').classList.toggle('hidden', lobby);
  document.body.classList.toggle('in-game', !lobby);
  $('victory').classList.toggle('hidden', !won);
  $('order-panel').classList.toggle('hidden', lobby);
  if (lobby) {
    const open = 4 - state.players.length;
    $('lobby-message').textContent = open ? `Play solo or invite up to ${open} more friend${open === 1 ? '' : 's'}. The host can start any time.` : 'All four alpacas are here. Your team is ready!';
    $('start-button').classList.toggle('hidden', !state.players.some(player => player.id === state.self.id && player.host));
  } else if (won) {
    const winner = state.players.find(player => player.id === state.winnerId);
    $('victory-message').textContent = `${winner?.name || 'Your team'} cleared the meadow. Time the team took: ${formatTime((state.finishedAt - state.startedAt) / 1000)}`;
    $('play-again').classList.toggle('hidden', !state.players.some(player => player.id === state.self.id && player.host));
  } else {
    const hard = state.stage === 'hard';
    $('stage-kicker').textContent = hard ? 'ROUND 2 OF 2 · THE CHALLENGE' : 'ROUND 1 OF 2 · WARM-UP';
    $('stage-title').textContent = hard ? 'The tricky meadow' : 'A gentle start';
    const self = state.players.find(player => player.id === state.self.id);
    $('progress-label').textContent = `${self.progress}% cleared`;
    $('progress-fill').style.width = `${self.progress}%`;
    const order = state.self.order;
    $('order-icon').replaceChildren(art(order.type));
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
