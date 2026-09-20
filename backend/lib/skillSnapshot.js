// Never import the app's db.js: it runs migrations on import.
const path = require('node:path');
const { FIELDS } = require('./skillContent');

function readSnapshot(dbPath) {
  if (!dbPath) throw new Error('Explicit --db path required');
  const Database = require('better-sqlite3');
  const db = new Database(path.resolve(dbPath), {readonly:true,fileMustExist:true});
  try {
    db.pragma('query_only = ON');
    if (!db.readonly || db.pragma('query_only',{simple:true}) !== 1) throw new Error('Read-only connection required');
    return db.transaction(() => {
      const columns = db.prepare('PRAGMA table_info(skills)').all().map(c=>c.name);
      for (const k of ['id',...FIELDS]) if(!columns.includes(k)) throw new Error(`Missing database column ${k}`);
      const skills=db.prepare(`SELECT id, ${FIELDS.map(k=>`"${k}"`).join(',')} FROM skills ORDER BY week_number,id`).all();
      const tags=db.prepare('SELECT skill_id, tag FROM skill_tags ORDER BY skill_id,tag').all();
      const grouped=new Map(skills.map(s=>[s.id,[]]));
      const orphans=[];
      for(const tag of tags) (grouped.get(tag.skill_id) || orphans).push(tag);
      return {metadata:{exported_at_utc:new Date().toISOString(),source:'SQLite read-only query',
        source_database_path:path.resolve(dbPath),sqlite_readonly:true,query_only:true,single_read_transaction:true,
        railway_environment_name:process.env.RAILWAY_ENVIRONMENT_NAME || null,
        deployment_commit:process.env.RAILWAY_GIT_COMMIT_SHA || null,
        actual_count:skills.length,skill_tags_row_count:tags.length},
        skills:skills.map(s=>({...s,skill_tags:grouped.get(s.id)})),orphan_skill_tags:orphans};
    }).deferred();
  } finally {db.close();}
}
module.exports={readSnapshot};
