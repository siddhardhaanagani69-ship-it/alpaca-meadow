const test = require('node:test');
const assert = require('node:assert/strict');
const { createBoard, exposed, newRoom, makePlayer, action, publicState } = require('../game');

test('both rounds contain exact triples and layered covered tiles', () => {
  for (const [stage, size, kinds] of [['easy', 18, 3], ['hard', 117, 13]]) {
    const board = createBoard(stage, 12345);
    assert.equal(board.length, size);
    const counts = Object.groupBy(board, tile => tile.type);
    assert.equal(Object.keys(counts).length, kinds);
    for (const cards of Object.values(counts)) assert.equal(cards.length, size / kinds);
    assert(board.some(tile => !exposed(tile, board)));
    assert(board.some(tile => exposed(tile, board)));
  }
});

test('one player can start and clear alone', () => {
  const room = newRoom('Solo');
  const [solo] = room.players;
  action(room, solo, { type: 'start' });
  assert.equal(room.stage, 'easy');
  while (room.stage === 'easy') action(room, solo, { type: 'pick', tileId: solo.board.find(tile => exposed(tile, solo.board)).id });
  assert.equal(room.stage, 'hard');
});

test('calling the alpaca clears every tray and tells every player', () => {
  const room = newRoom('Host');
  room.players.push(makePlayer('Two', 'Two', false, 'lobby', room.seed));
  const [host, teammate] = room.players;
  action(room, host, { type: 'start' });
  teammate.tray = ['carrot', 'wool'];
  host.gauge = 2;
  action(room, host, { type: 'alpaca', tileId: host.board.find(tile => exposed(tile, host.board)).id });
  assert.deepEqual(teammate.tray, []);
  assert.equal(host.gauge, 0);
  assert.ok(publicState(room, teammate).alpacaAt);
});

test('four players can play, trade, and undo exactly', () => {
  const room = newRoom('Host');
  room.code = 'ABC234';
  for (const name of ['Two', 'Three', 'Four']) room.players.push(makePlayer(name, name, false, 'lobby', room.seed));
  const [host, teammate] = room.players;
  assert.throws(() => action(room, teammate, { type: 'start' }), /host/);
  action(room, host, { type: 'start' });
  assert.equal(room.stage, 'easy');
  host.tools.undo = 1;
  const first = host.board.find(tile => exposed(tile, host.board));
  const before = structuredClone(publicState(room, host));
  action(room, host, { type: 'pick', tileId: first.id });
  assert.equal(host.board[first.id].removed, true);
  assert.equal(host.tray.length, 1);
  action(room, host, { type: 'undo' });
  assert.equal(host.board[first.id].removed, false);
  assert.deepEqual(host.tray, before.self.tray);
  assert.equal(host.tools.undo, 0);
  action(room, host, { type: 'pick', tileId: first.id });
  action(room, host, { type: 'send', index: 0, targetId: teammate.id });
  assert.equal(teammate.tray[0], first.type);
  assert.equal(host.tray.length, 0);
  assert.equal(publicState(room, teammate).self.token, undefined);
  action(room, teammate, { type: 'put', index: 0 });
  assert.equal(room.warehouse.length, 1);
  action(room, host, { type: 'take', cardId: room.warehouse[0].id });
  assert.equal(host.tray[0], first.type);
});
