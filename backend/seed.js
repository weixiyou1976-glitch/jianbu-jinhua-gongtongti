// Compatibility adapter. Content lives only in data/skills/*.json.
// Importing this module never opens a database or runs application migrations.
module.exports = require('./lib/skillContent').loadLibrary().skills;

// Legacy command now follows explicit-path, preview-first recovery policy.
// It never creates activation codes or touches unrelated business tables.
if (require.main === module) {
  try { require('./scripts/restore-skills.cjs').main(); }
  catch (error) { console.error(error.message); process.exitCode = 2; }
}
