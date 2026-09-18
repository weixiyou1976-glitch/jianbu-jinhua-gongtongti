const crypto = require('crypto');

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function generatePassword(length = 8) {
  return Array.from({ length }, () => PASSWORD_ALPHABET[crypto.randomInt(PASSWORD_ALPHABET.length)]).join('');
}

function nextUsernameSeq(db) {
  const row = db
    .prepare("SELECT MAX(CAST(SUBSTR(username, 7) AS INTEGER)) AS max_seq FROM trial_accounts WHERE username LIKE 'jianbu%'")
    .get();
  return (row?.max_seq || 0) + 1;
}

function generateTrialAccounts(db, count) {
  const startSeq = nextUsernameSeq(db);
  const insert = db.prepare('INSERT INTO trial_accounts (username, password) VALUES (?, ?)');
  const created = [];
  const tx = db.transaction(() => {
    for (let i = 0; i < count; i++) {
      const username = `jianbu${String(startSeq + i).padStart(3, '0')}`;
      const password = generatePassword();
      insert.run(username, password);
      created.push({ username, password });
    }
  });
  tx();
  return created;
}

function refreshExpiredTrialAccounts(db) {
  db.prepare(
    "UPDATE trial_accounts SET status = 'expired' WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= datetime('now')"
  ).run();
}

module.exports = { generateTrialAccounts, refreshExpiredTrialAccounts };
