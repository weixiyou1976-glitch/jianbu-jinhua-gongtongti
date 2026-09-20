// Explicit local recovery only. Does not import app db.js or touch other tables.
const {FIELDS} = require('./skillContent');
function planRestore(db, skills) {
  const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('skills','skill_tags')").all().map(r=>r.name);
  if (tables.length === 1) throw new Error('Incomplete Skill schema; refusing automatic schema repair');
  if (!tables.length) return {createTables:true,insertWeeks:skills.map(s=>s.week_number),preserveWeeks:[],existingDifferences:[]};
  const columns=db.prepare('PRAGMA table_info(skills)').all().map(c=>c.name);
  for(const field of ['id',...FIELDS]) if(!columns.includes(field)) throw new Error(`Missing Skill column ${field}; recovery does not migrate schemas`);
  const rows=db.prepare(`SELECT id,${FIELDS.map(k=>`"${k}"`).join(',')} FROM skills`).all();
  const byWeek=new Map();
  for(const row of rows) {
    if(byWeek.has(row.week_number)) throw new Error(`Existing duplicate week ${row.week_number}; manual review required`);
    byWeek.set(row.week_number,row);
  }
  const insertWeeks=[],preserveWeeks=[],existingDifferences=[];
  for(const skill of skills) {
    const existing=byWeek.get(skill.week_number);
    if(!existing) {insertWeeks.push(skill.week_number);continue;}
    preserveWeeks.push(skill.week_number);
    for(const field of FIELDS) {
      const value=field==='tags'?JSON.parse(existing.tags):existing[field];
      if(JSON.stringify(value)!==JSON.stringify(skill[field])) existingDifferences.push({week_number:skill.week_number,field});
    }
    const tags=db.prepare('SELECT tag FROM skill_tags WHERE skill_id=? ORDER BY tag').all(existing.id).map(r=>r.tag);
    if(JSON.stringify([...JSON.parse(existing.tags)].sort())!==JSON.stringify(tags)) existingDifferences.push({week_number:skill.week_number,field:'skill_tags'});
  }
  return {createTables:false,insertWeeks,preserveWeeks,existingDifferences};
}
function restoreMissing(db, skills, {create=false}={}) {
  return db.transaction(()=>{
    const plan=planRestore(db,skills);
    if(plan.createTables && !create) throw new Error('Empty database: explicit --create required to create Skill tables');
    if(db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name IN ('skills','skill_tags')").all().length) throw new Error('Skill table triggers require manual review before recovery');
    if(plan.createTables) {
      db.exec(`CREATE TABLE skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ${FIELDS.map(k=>`"${k}" ${k==='week_number'?'INTEGER NOT NULL':k==='display_order'?'INTEGER':'TEXT NOT NULL'}`).join(',')},
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE skill_tags(skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE, tag TEXT NOT NULL);
      CREATE INDEX idx_skill_tags_tag ON skill_tags(tag);
      CREATE INDEX idx_skill_tags_skill_id ON skill_tags(skill_id);`);
    }
    const missing=new Set(plan.insertWeeks);
    const insert=db.prepare(`INSERT INTO skills (${FIELDS.join(',')}) VALUES (${FIELDS.map(k=>`@${k}`).join(',')})`);
    const insertTag=db.prepare('INSERT INTO skill_tags(skill_id,tag) VALUES (?,?)');
    for(const skill of skills) {
      if(!missing.has(skill.week_number)) continue;
      const {lastInsertRowid}=insert.run({...skill,tags:JSON.stringify(skill.tags)});
      for(const tag of skill.tags) insertTag.run(lastInsertRowid,tag);
    }
    return {...plan,inserted:plan.insertWeeks.length,preserved:plan.preserveWeeks.length};
  }).immediate();
}
module.exports={planRestore,restoreMissing};
