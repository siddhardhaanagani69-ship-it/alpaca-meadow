const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { server } = require('../server');

test('four friends can join a room and receive live game state', async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (url, data, token) => {
    const res = await fetch(base + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await res.json() };
  };
  try {
    const created = await post('/api/rooms', { name: 'Host' });
    assert.equal(created.status, 201);
    const { code, token } = created.data;
    const others = [];
    for (const name of ['Friend A', 'Friend B', 'Friend C']) {
      const joined = await post(`/api/rooms/${code}/join`, { name });
      assert.equal(joined.status, 201);
      others.push(joined.data.token);
    }
    assert.equal((await post(`/api/rooms/${code}/join`, { name: 'Fifth' })).status, 409);
    assert.equal((await post(`/api/rooms/${code}/action`, { type: 'start' }, others[0])).status, 400);
    assert.equal((await post(`/api/rooms/${code}/action`, { type: 'start' }, token)).status, 200);
    const stateResponse = await fetch(`${base}/api/rooms/${code}`, { headers: { Authorization: `Bearer ${token}` } });
    const state = await stateResponse.json();
    assert.equal(state.stage, 'easy');
    assert.equal(state.players.length, 4);
    assert.equal(state.self.board.length, 18);
    assert(!JSON.stringify(state).includes(others[0]));

    const stream = await fetch(`${base}/api/rooms/${code}/events?token=${encodeURIComponent(others[0])}`);
    assert.equal(stream.headers.get('content-type').split(';')[0], 'text/event-stream');
    const reader = stream.body.getReader();
    const chunk = new TextDecoder().decode((await reader.read()).value);
    assert(chunk.includes('data:'));
    assert(chunk.includes('"online":true'));
    await reader.cancel();
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
