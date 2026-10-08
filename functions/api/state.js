const KEY = 'giveaway_state_v1';
const DEFAULT_PIN = 'AB2026';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

async function readState(env) {
  const s = await env.GIVEAWAY_KV.get(KEY, 'json');
  const base = { names: [], winners: [], locked: false, time: null, pin: DEFAULT_PIN };
  if (!s || typeof s !== 'object') return base;
  return {
    names: Array.isArray(s.names) ? s.names : [],
    winners: Array.isArray(s.winners) ? s.winners : [],
    locked: !!s.locked,
    time: typeof s.time === 'number' ? s.time : null,
    pin: typeof s.pin === 'string' && s.pin ? s.pin : DEFAULT_PIN
  };
}

async function writeState(env, s) {
  await env.GIVEAWAY_KV.put(KEY, JSON.stringify(s));
}

function pub(s) {
  return { names: s.names, winners: s.winners, locked: s.locked, time: s.time };
}

function cleanName(v) {
  return String(v || '').trim().replace(/\s+/g, ' ').slice(0, 24);
}

export async function onRequestGet({ env }) {
  return json(pub(await readState(env)));
}

export async function onRequestPost({ env, request }) {
  const b = await request.json().catch(() => ({}));
  const s = await readState(env);
  const action = String(b.action || '');

  if (action === 'add') {
    if (s.locked) return json({ error: 'locked' }, 423);
    const name = cleanName(b.name);
    if (name.length < 2) return json({ error: 'short' }, 400);
    const exists = s.names.some(n => n.toLowerCase() === name.toLowerCase());
    if (exists) return json({ error: 'duplicate' }, 409);
    s.names.push(name);
    await writeState(env, s);
    return json(pub(s));
  }

  if (action === 'unlock') {
    if (String(b.pin || '') === s.pin) return json({ ok: true, state: pub(s) });
    return json({ error: 'wrong_pin' }, 401);
  }

  if (String(b.pin || '') !== s.pin) return json({ error: 'owner_only' }, 401);

  if (action === 'remove') {
    const name = cleanName(b.name);
    s.names = s.names.filter(n => n !== name);
    await writeState(env, s);
    return json(pub(s));
  }

  if (action === 'winner') {
    const name = cleanName(b.name);
    if (!s.winners.includes(name)) s.winners.push(name);
    s.names = s.names.filter(n => n !== name);
    await writeState(env, s);
    return json(pub(s));
  }

  if (action === 'set_time') {
    const t = Number(b.time);
    if (!Number.isFinite(t)) return json({ error: 'bad_time' }, 400);
    s.time = t;
    await writeState(env, s);
    return json(pub(s));
  }

  if (action === 'set_lock') {
    s.locked = !!b.locked;
    await writeState(env, s);
    return json(pub(s));
  }

  if (action === 'set_pin') {
    const p = String(b.newPin || '').trim();
    if (p.length < 4) return json({ error: 'short' }, 400);
    s.pin = p;
    await writeState(env, s);
    return json(pub(s));
  }

  if (action === 'clear') {
    s.names = [];
    s.winners = [];
    s.time = null;
    s.locked = false;
    await writeState(env, s);
    return json(pub(s));
  }

  return json({ error: 'bad_action' }, 400);
}
