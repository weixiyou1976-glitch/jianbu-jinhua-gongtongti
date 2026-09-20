const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const Database = require('better-sqlite3');
const skills = require('../seed');
const migrate = require('../migrations/skills-225-230');

// 所有数据库都在独立临时目录，绝不连接 backend/data 或生产 DB_PATH。
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'jianbu-skills-225-230-'));
const dbModule = require.resolve('../db');
const seedModule = require.resolve('../seed');
const env = (dbPath) => ({ ...process.env, DB_PATH: dbPath, JWT_SECRET: 'local-regression-only', DEEPSEEK_API_KEY: 'mock-only' });
const initialize = (dbPath) => execFileSync(process.execPath, ['-e', `require(${JSON.stringify(dbModule)}).close()`], {
  cwd: workspace, env: env(dbPath), encoding: 'utf8',
});

function openFixture(name, withOldSkills = true) {
  const dbPath = path.join(workspace, `${name}.db`);
  initialize(dbPath);
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  if (withOldSkills) {
    const tx = db.transaction(() => {
      // 故意使 ID 与周次不同，捕捉依赖 skill_id == week_number 的错误。
      for (const skill of skills.filter((s) => s.week_number <= 224)) insertFixtureSkill(db, skill, 1000 + skill.week_number);
    });
    tx();
  }
  return { db, dbPath };
}

function insertFixtureSkill(db, skill, id) {
  const row = { id, ...skill, tags: JSON.stringify(skill.tags || []) };
  const fields = Object.keys(row);
  db.prepare(`INSERT INTO skills (${fields.join(', ')}) VALUES (${fields.map((k) => `@${k}`).join(', ')})`).run(row);
  for (const tag of skill.tags || []) db.prepare('INSERT INTO skill_tags VALUES (?, ?)').run(id, tag);
}

function addLinkedRecords(db) {
  db.exec(`
    INSERT INTO users (id, email, password_hash, activation_code, activated_at, enrolled_at, referral_code, trial_skill_id)
      VALUES (1, 'regression@example.invalid', 'unused', 'local', datetime('now'), datetime('now'), 'LOCAL1', 1224);
    INSERT INTO activation_codes (code, used, used_by) VALUES ('LOCAL', 1, 1);
    INSERT INTO stamps (user_id, skill_id, learned, practiced, gained) VALUES (1, 1224, '旧策印', '旧练习', '旧收获');
    INSERT INTO modules (id, slug, name) VALUES (1, 'local-module', '旧模块');
    INSERT INTO module_items (module_id, stage_order, stage_name, skill_id, item_order) VALUES (1, 1, '旧阶段', 1224, 1);
    INSERT INTO coach_messages (user_id, skill_id, role, content) VALUES (1, 1224, 'user', '旧陪练');
    INSERT INTO trial_users (id, email, matched_skill_id, referred_skill_id) VALUES (1, 'local-old-trial@example.invalid', 1224, 1224);
    INSERT INTO trial_coach_messages (trial_user_id, role, content) VALUES (1, 'user', '旧体验陪练');
    INSERT INTO trial_stamps (trial_user_id, skill_id, learned, practiced, gained) VALUES (1, 1224, '旧体验策印', '练', '得');
    INSERT INTO temporary_unlocks (user_id, skill_id, unlock_reason, expires_at) VALUES (1, 1224, 'ai_match', datetime('now', '+72 hours'));
    INSERT INTO checkins (user_id, skill_id) VALUES (1, 1224);
    INSERT INTO daily_checkins (user_id, checkin_date) VALUES (1, '2026-01-01');
    INSERT INTO learning_checkins (user_id, checkin_date, skill_id) VALUES (1, '2026-01-01', 1224);
    INSERT INTO practice_checkins (user_id, checkin_date) VALUES (1, '2026-01-01');
    INSERT INTO saved_quotes (user_id, skill_id, quote_content) VALUES (1, 1224, '旧策语');
    INSERT INTO referral_records (referrer_user_id, referral_code, skill_id, share_type) VALUES (1, 'LOCAL1', 1224, 'stamped');
  `);
}

function snapshot(db, oldOnly = false) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  return Object.fromEntries(tables.map(({ name }) => {
    const where = oldOnly && name === 'skills' ? ' WHERE week_number <= 224'
      : oldOnly && name === 'skill_tags' ? ' WHERE skill_id IN (SELECT id FROM skills WHERE week_number <= 224)' : '';
    return [name, db.prepare(`SELECT * FROM "${name}"${where} ORDER BY rowid`).all()];
  }));
}

function assertNewSkills(db) {
  const rows = db.prepare('SELECT * FROM skills WHERE week_number BETWEEN 225 AND 230 ORDER BY week_number').all();
  assert.equal(rows.length, 6);
  for (const row of rows) {
    const expected = skills.find((s) => s.week_number === row.week_number);
    for (const [key, value] of Object.entries(expected)) {
      assert.deepEqual(key === 'tags' ? JSON.parse(row[key]) : row[key], value, `${row.week_number}.${key}`);
    }
    assert.equal(row.insight_audio_url, '');
    assert.deepEqual(db.prepare('SELECT tag FROM skill_tags WHERE skill_id = ? ORDER BY rowid').all(row.id).map((r) => r.tag), expected.tags);
  }
  assert.deepEqual(db.pragma('foreign_key_check'), []);
  assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
}

test('种子适配器包含连续的1—332周，导入不连接数据库', () => {
  assert.equal(skills.length, 332);
  assert.deepEqual(skills.map((s) => s.week_number), Array.from({ length: 332 }, (_, i) => i + 1));
  assert.equal(require.cache[dbModule], undefined);
});

test('真实启动路径增量写入，并保留全部旧内容、ID、关联记录；重复启动无变化', () => {
  const { db, dbPath } = openFixture('startup');
  try {
    addLinkedRecords(db);
    const before = snapshot(db);
    initialize(dbPath);
    assert.deepEqual(snapshot(db, true), before);
    assertNewSkills(db);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM skills').get().n, 254);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM activation_codes WHERE code = 'TEST-0001'").get().n, 0);
    const after = snapshot(db);
    initialize(dbPath);
    assert.deepEqual(snapshot(db), after);
    // 显式重新 seed 同样不得覆盖已有数据。
    execFileSync(process.execPath, [seedModule, '--db', dbPath, '--apply'], { cwd: workspace, env: env(dbPath) });
    const reseeded = snapshot(db);
    // New recovery adapter may fill 255–332, but never alters existing rows/IDs/tags.
    const existingIds = new Set(after.skills.map((s) => s.id));
    assert.deepEqual(reseeded.skills.filter((s) => existingIds.has(s.id)), after.skills);
    assert.deepEqual(reseeded.skill_tags.filter((t) => existingIds.has(t.skill_id)), after.skill_tags);
    assert.equal(reseeded.skills.length, 332);
    for (const name of Object.keys(after).filter((name) => !['skills', 'skill_tags'].includes(name))) {
      assert.deepEqual(reseeded[name], after[name]);
    }
  } finally { db.close(); }
});

test('已有225周的自定义内容、草稿状态、音频和标签完整保留，只补缺失周次，不触及231周', () => {
  const { db } = openFixture('partial');
  try {
    insertFixtureSkill(db, { ...skills[224], title: '数据库已有内容', status: 'draft', insight_audio_url: '/existing.mp3', tags: ['已有标签'] }, 5000);
    insertFixtureSkill(db, { ...skills[229], week_number: 231, title: '未来已有内容' }, 9000);
    const before = snapshot(db);
    assert.equal(migrate(db), 5);
    assert.equal(migrate(db), 0);
    const after = snapshot(db);
    for (const row of before.skills) assert.deepEqual(after.skills.find((s) => s.id === row.id), row);
    assert.deepEqual(after.skill_tags.filter((t) => t.skill_id <= 9000), before.skill_tags);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM skills WHERE week_number BETWEEN 225 AND 230').get().n, 6);
  } finally { db.close(); }
});

test('标签写入失败时整批Skill和标签全部回滚', () => {
  const { db } = openFixture('rollback');
  try {
    const before = snapshot(db);
    const sequence = db.prepare('SELECT * FROM sqlite_sequence').all();
    db.exec(`CREATE TRIGGER fail_new_tag BEFORE INSERT ON skill_tags
      WHEN (SELECT week_number FROM skills WHERE id = NEW.skill_id) = 228
      BEGIN SELECT RAISE(ABORT, 'simulated tag failure'); END`);
    assert.throws(() => migrate(db), /simulated tag failure/);
    assert.deepEqual(snapshot(db), before);
    assert.deepEqual(db.prepare('SELECT * FROM sqlite_sequence').all(), sequence);
  } finally { db.close(); }
});

test('空库启动不抢先写六张，完整seed可初始化332张且再次执行不重复', () => {
  const { db, dbPath } = openFixture('fresh', false);
  try {
    assert.equal(migrate(db), 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM skills').get().n, 0);
    execFileSync(process.execPath, [seedModule, '--db', dbPath, '--apply'], { cwd: workspace, env: env(dbPath) });
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM skills').get().n, 332);
    assertNewSkills(db);
    const before = snapshot(db);
    execFileSync(process.execPath, [seedModule, '--db', dbPath, '--apply'], { cwd: workspace, env: env(dbPath) });
    assert.deepEqual(snapshot(db), before);
  } finally { db.close(); }
});

test('两个进程并发执行增量迁移不会产生重复Skill或标签', async () => {
  const { db, dbPath } = openFixture('concurrent');
  try {
    const code = `const Database = require(${JSON.stringify(require.resolve('better-sqlite3'))});
      const db = new Database(process.env.DB_PATH);
      db.pragma('foreign_keys = ON');
      require(${JSON.stringify(require.resolve('../migrations/skills-225-230'))})(db);
      db.close();`;
    await Promise.all([1, 2].map(() => promisify(execFile)(process.execPath, ['-e', code], { cwd: workspace, env: env(dbPath) })));
    assertNewSkills(db);
  } finally { db.close(); }
});

test('体验账号用户名按最大编号递增生成，密码互不相同，不会与已有编号重复', () => {
  const { db } = openFixture('trial-accounts-seq', false);
  try {
    const { generateTrialAccounts } = require('../lib/trialAccounts');
    const first = generateTrialAccounts(db, 3);
    assert.deepEqual(first.map((a) => a.username), ['jianbu001', 'jianbu002', 'jianbu003']);
    assert.equal(new Set(first.map((a) => a.password)).size, 3);
    for (const a of first) assert.equal(a.password.length, 8);

    db.prepare("DELETE FROM trial_accounts WHERE username = 'jianbu002'").run();
    const second = generateTrialAccounts(db, 2);
    assert.deepEqual(second.map((a) => a.username), ['jianbu004', 'jianbu005'], '删除中间编号后仍按已有最大编号继续递增，不回填空缺');

    const all = db.prepare('SELECT username FROM trial_accounts ORDER BY id').all().map((r) => r.username);
    assert.deepEqual(all, ['jianbu001', 'jianbu003', 'jianbu004', 'jianbu005']);
  } finally { db.close(); }
});

test('真实HTTP接口：总库、周次/类型/标签、解锁、详情、重复策印、匹配、陪练记忆、Trial账号体验和进度', async () => {
  const fixture = openFixture('api');
  addLinkedRecords(fixture.db);
  fixture.db.close();
  process.env.DB_PATH = fixture.dbPath;
  process.env.JWT_SECRET = 'local-regression-only';
  process.env.DEEPSEEK_API_KEY = 'mock-only';
  const db = require('../db');
  const express = require('express');
  const jwt = require('jsonwebtoken');
  const app = express();
  app.use(express.json());
  for (const route of ['skills', 'stamps', 'coach', 'trial', 'progress']) app.use('/api', require(`../routes/${route}`));
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET);
  const realFetch = global.fetch;
  let selected = skills[224];
  let lastAIRequest;
  let failAI = false;
  // 仅替换外部AI，数据库、认证、路由、提示词构建和流式解析使用真实代码。
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.deepseek.com/chat/completions');
    if (failAI) throw new Error('simulated AI outage');
    lastAIRequest = JSON.parse(options.body);
    if (lastAIRequest.stream) {
      return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: '模拟陪练回复' } }] })}\n\ndata: [DONE]\n\n`);
    }
    assert.ok(lastAIRequest.messages[0].content.includes(`${selected.skill_name}|${selected.trigger_condition}`));
    return Response.json({ choices: [{ message: { content: JSON.stringify([{ skill_name: selected.skill_name, reason: '测试匹配' }]) } }] });
  };
  async function request(route, body, auth = token) {
    const response = await realFetch(base + route, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
    assert.equal(response.status, 200, `${route}: ${JSON.stringify(data)}`);
    return data;
  }
  try {
    const all = await request('/skills');
    assert.equal(all.length, 254);
    assert.equal((await request('/skills/current')).week, 1);
    assert.equal((await request('/skills/1001')).skill_name, skills[0].skill_name);
    assert.equal((await request('/skills/1224')).next.id, all.find((s) => s.week_number === 225).id);
    assert.equal((await request('/skills/1002')).locked, true);
    assert.ok((await request('/skills/search?tag=' + encodeURIComponent('信念'))).filter((s) => s.week_number >= 225).length === 6);

    for (const expected of skills.filter((s) => s.week_number >= 225 && s.week_number <= 254)) {
      selected = expected;
      const skill = all.find((s) => s.week_number === expected.week_number);
      assert.equal(skill.unlocked, false);
      assert.equal((await request(`/skills/${skill.id}`)).locked, true);
      assert.equal((await request(`/skills?week=${expected.week_number}`))[0].id, skill.id);
      assert.ok((await request('/skills?category=' + encodeURIComponent(expected.category))).some((s) => s.id === skill.id));
      for (const tag of expected.tags) assert.ok((await request('/skills/search?tag=' + encodeURIComponent(tag))).some((s) => s.id === skill.id));
      const match = await request('/skills/match', { query: '我很担心报价后客户的沉默，迟迟不愿意开始做事，想练习新的方法' });
      assert.equal(match.source, 'ai');
      assert.equal(match.results[0].id, skill.id);
      assert.equal(match.results[0].temp_unlocked, true);
      const detail = await request(`/skills/${skill.id}`);
      assert.equal(detail.locked, false);
      for (const [key, value] of Object.entries(expected)) assert.deepEqual(detail[key], value);
      const stamp = { learned: `学到${expected.skill_name}`, practiced: '完整练习过一次', gained: '留下可验证的行动证据' };
      for (let n = 0; n < 2; n++) assert.equal((await request(`/skills/${skill.id}/stamp`, stamp)).stamp.skill_id, skill.id);
      assert.equal((await request(`/skills/${skill.id}/stamps`)).length, 2);
      assert.equal(await request('/coach/message', { skill_id: skill.id, message: '请结合我的策印继续陪练' }), '模拟陪练回复');
      assert.ok(lastAIRequest.messages[0].content.includes(expected.step_one));
      assert.ok(lastAIRequest.messages[0].content.includes(stamp.learned));
      await request('/coach/message', { skill_id: skill.id, message: '我完成了第一步' });
      assert.equal(lastAIRequest.messages[1].content, '请结合我的策印继续陪练');
      assert.equal((await request(`/coach/${skill.id}/history`)).messages.length, 4);

      const trialUsername = `jianbu-test-${expected.week_number}`;
      db.prepare('INSERT INTO trial_accounts (username, password) VALUES (?, ?)').run(trialUsername, 'pw123456');
      const trialToken = (await request('/trial/login', { username: trialUsername, password: 'pw123456' })).token;
      const trialSkill = await request('/trial/match', { concern: '我很担心报价后客户的沉默，迟迟不愿意开始做事，想练习新的方法' }, trialToken);
      assert.equal(trialSkill.id, skill.id);
      assert.equal((await request('/trial/skill', null, trialToken)).id, skill.id);
      await request('/trial/stamp', { skill_id: skill.id, ...stamp }, trialToken);
      assert.equal(await request('/trial/coach/message', { skill_id: skill.id, message: '请帮我练第一步' }, trialToken), '模拟陪练回复');
      assert.equal((await request('/trial/coach/history', null, trialToken)).messages.length, 2);
    }

    // 体验账号登录逻辑：密码错误、首次登录后转为已使用、未过期可重复登录、过期后拒绝并提示。
    db.prepare("INSERT INTO trial_accounts (username, password) VALUES ('jianbu-login-test', 'rightpw')").run();
    const wrongPw = await realFetch(base + '/trial/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'jianbu-login-test', password: 'wrongpw' }),
    });
    assert.equal(wrongPw.status, 400);
    assert.equal((await wrongPw.json()).error, '账号或密码不正确');

    const firstLogin = await realFetch(base + '/trial/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'jianbu-login-test', password: 'rightpw' }),
    });
    assert.equal(firstLogin.status, 200);
    const afterFirstLogin = db.prepare('SELECT status, first_used_at, expires_at FROM trial_accounts WHERE username = ?').get('jianbu-login-test');
    assert.equal(afterFirstLogin.status, 'active');
    assert.ok(afterFirstLogin.first_used_at);
    assert.ok(afterFirstLogin.expires_at);

    const secondLogin = await realFetch(base + '/trial/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'jianbu-login-test', password: 'rightpw' }),
    });
    assert.equal(secondLogin.status, 200, '已使用但未过期的账号应可继续登录');

    db.prepare("UPDATE trial_accounts SET expires_at = datetime('now', '-1 hour') WHERE username = 'jianbu-login-test'").run();
    const expiredLogin = await realFetch(base + '/trial/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'jianbu-login-test', password: 'rightpw' }),
    });
    assert.equal(expiredLogin.status, 409);
    assert.equal((await expiredLogin.json()).error, '体验账号已过期，欢迎加入渐步');
    assert.equal(db.prepare("SELECT status FROM trial_accounts WHERE username = 'jianbu-login-test'").get().status, 'expired');

    failAI = true;
    const fallback = await request('/skills/match', { query: '选择性注意 机会 信念 注意力 元认知' });
    assert.equal(fallback.source, 'keyword');
    assert.ok(fallback.results.some((s) => s.week_number === 227));
    const progress = await request('/progress');
    assert.equal(progress.total, 254);
    assert.equal(progress.skills_mastered, 31);
    assert.equal(progress.total_stamps, 61);
    assert.ok(progress.grid.find((g) => g.week === 224).completed);
    assert.ok(progress.grid.filter((g) => g.week >= 225).every((g) => g.completed));
    assert.equal((await request('/skills/1224/stamps'))[0].learned, '旧策印');
    assert.equal((await request('/coach/1224/history')).messages[0].content, '旧陪练');
    assert.deepEqual(db.pragma('foreign_key_check'), []);
  } finally {
    global.fetch = realFetch;
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

test.after(() => console.log(`隔离测试数据库保留于：${workspace}`));
