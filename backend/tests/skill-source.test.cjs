const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const Database=require('better-sqlite3');
const {FIELDS,loadLibrary,validateLibrary,compareSnapshot}=require('../lib/skillContent');
const {readSnapshot}=require('../lib/skillSnapshot');
const {restoreMissing}=require('../lib/skillRestore');
const {skills,manifest}=loadLibrary();
const copy=()=>structuredClone(skills);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'jianbu-source-tests-'));
const dbPath=path.join(tmp,'fixture.db');

function fixture() {
  const db=new Database(dbPath);
  db.exec(`CREATE TABLE skills (id INTEGER PRIMARY KEY, ${FIELDS.map(k=>`"${k}" ${['week_number','display_order'].includes(k)?'INTEGER':'TEXT'}`).join(',')});CREATE TABLE skill_tags(skill_id INTEGER,tag TEXT);`);
  const insert=db.prepare(`INSERT INTO skills VALUES (${Array(FIELDS.length+1).fill('?').join(',')})`);
  const tag=db.prepare('INSERT INTO skill_tags VALUES (?,?)');
  db.transaction(()=>{for(const s of skills){const id=5000+s.week_number;insert.run(id,...FIELDS.map(k=>k==='tags'?JSON.stringify(s.tags):s[k]));for(const t of s.tags)tag.run(id,t);}})();
  db.close();
}
fixture();
const hash=()=>crypto.createHash('sha256').update(fs.readFileSync(dbPath)).digest('hex');

test('332 records, 52 main-track positions; known duplicate name is a warning',()=>{
  const v=validateLibrary(skills,manifest);
  assert.deepEqual(v.errors,[]);assert.equal(v.count,332);assert.equal(v.mainTrackCount,52);
  assert.deepEqual(v.duplicateNames,[{skill_name:'关系修复',week_numbers:[137,331]}]);
  assert.ok(!Object.hasOwn(skills[0],'id'));assert.ok(!Object.hasOwn(skills[0],'created_at'));
  assert.equal(require.cache[require.resolve('../db')],undefined);
});
test('invalid weeks, fields, tags, main-track order, URL and runtime fields fail',()=>{
  for(const mutate of [s=>s.pop(),s=>s[1].week_number=1,s=>delete s[0].title,s=>s[0].title='',s=>s[0].tags='[]',s=>s[0].tags=['x','x'],s=>s[0].display_order=0,s=>s[0].insight_audio_url='javascript:alert(1)',s=>s[0].id=1]) {
    const s=copy();mutate(s);assert.ok(validateLibrary(s,manifest).errors.length);
  }
});
test('malformed JSON, invalid UTF-8 and unlisted shards are rejected',()=>{
  const directory=path.join(tmp,'library');fs.mkdirSync(directory);
  fs.cpSync(path.join(__dirname,'../data/skills'),directory,{recursive:true});
  const first=path.join(directory,manifest.files[0]),original=fs.readFileSync(first);
  fs.writeFileSync(first,'{');assert.throws(()=>loadLibrary(directory));
  fs.writeFileSync(first,Buffer.from([0xff]));assert.throws(()=>loadLibrary(directory));
  fs.writeFileSync(first,original);fs.writeFileSync(path.join(directory,'skills-333-350.json'),'[]');assert.throws(()=>loadLibrary(directory));
});
test('read-only comparison is independent of database IDs and leaves bytes unchanged',()=>{
  const before=hash();const result=compareSnapshot(skills,readSnapshot(dbPath));
  assert.equal(result.differenceCount,0);assert.equal(result.productionCount,332);assert.equal(hash(),before);
});
test('compares every content field, missing/extra records and independent tag table',()=>{
  for(const field of FIELDS.filter(k=>k!=='week_number')) {
    const s=copy();s[0][field]=field==='tags'?['changed']:field==='display_order'?52:'changed';
    assert.ok(compareSnapshot(s,readSnapshot(dbPath)).differences.some(d=>d.field===field));
  }
  const snapshot=readSnapshot(dbPath);snapshot.skills[0].skill_tags.push({skill_id:snapshot.skills[0].id,tag:'drift'});snapshot.metadata.skill_tags_row_count++;
  assert.ok(compareSnapshot(skills,snapshot).tagIssues.length);
  const duplicate=readSnapshot(dbPath);duplicate.skills[1].week_number=1;assert.throws(()=>compareSnapshot(skills,duplicate));
  assert.deepEqual(compareSnapshot(skills.slice(1),readSnapshot(dbPath)).missingInRepository,[1]);
  const missing=readSnapshot(dbPath);const removed=missing.skills.pop();missing.metadata.actual_count--;missing.metadata.skill_tags_row_count-=removed.skill_tags.length;
  assert.deepEqual(compareSnapshot(skills,missing).missingInProduction,[332]);
});
test('CLI exits 1 for drift, 2 for unsafe/missing input; never creates absent DB',()=>{
  const cli=path.join(__dirname,'../scripts/compare-skills.cjs');
  const run=(args)=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',env:{...process.env,DB_PATH:dbPath}});
  const before=hash();assert.equal(run([]).status,2);assert.equal(run(['--db',dbPath,'--apply']).status,2);
  const missing=path.join(tmp,'must-not-be-created.db');assert.equal(run(['--db',missing]).status,2);assert.ok(!fs.existsSync(missing));
  assert.equal(run(['--db',dbPath]).status,0);assert.equal(hash(),before);
  const snap=readSnapshot(dbPath);snap.skills[0].title+='x';const file=path.join(tmp,'drift.json');fs.writeFileSync(file,JSON.stringify(snap));assert.equal(run(['--snapshot',file]).status,1);
});
test('recovery rehearsal cannot target existing DB or run inside Railway',()=>{
  const cli=path.join(__dirname,'../scripts/rehearse-skills.cjs');
  assert.equal(spawnSync(process.execPath,[cli,'--db',dbPath]).status,2);
  assert.equal(spawnSync(process.execPath,[cli],{env:{...process.env,RAILWAY_ENVIRONMENT_NAME:'production'}}).status,2);
});

test('empty recovery restores all 19 fields including endings and both tag representations',()=>{
  const file=path.join(tmp,'restored.db'),db=new Database(file);
  const result=restoreMissing(db,skills,{create:true});
  assert.equal(result.inserted,332);
  assert.deepEqual(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name),['skill_tags','skills']);
  db.close();
  assert.equal(compareSnapshot(skills,readSnapshot(file)).differenceCount,0);
  assert.equal(readSnapshot(file).metadata.skill_tags_row_count,2439);
});
test('repeat recovery is idempotent and preserves all IDs and database bytes',()=>{
  const file=path.join(tmp,'repeat.db'),db=new Database(file);restoreMissing(db,skills,{create:true});db.close();
  const before=fs.readFileSync(file),snapshot=readSnapshot(file);
  const reopened=new Database(file);assert.equal(restoreMissing(reopened,skills).inserted,0);reopened.close();
  assert.deepEqual(readSnapshot(file).skills,snapshot.skills);assert.deepEqual(fs.readFileSync(file),before);
});
test('partial recovery preserves edited content, nonsequential IDs and unrelated business rows',()=>{
  const file=path.join(tmp,'partial.db'),db=new Database(file);
  restoreMissing(db,[skills[0]],{create:true});
  db.exec("UPDATE skills SET id=9001,title='existing edited title'; UPDATE skill_tags SET skill_id=9001; CREATE TABLE users(id INTEGER,name TEXT); INSERT INTO users VALUES(5,'local fixture'); CREATE TABLE stamps(id INTEGER,skill_id INTEGER); INSERT INTO stamps VALUES(8,9001); CREATE TABLE activation_codes(code TEXT); INSERT INTO activation_codes VALUES('local');");
  const previous=db.prepare('SELECT * FROM skills WHERE id=9001').get();
  const business=()=>['users','stamps','activation_codes'].map(t=>db.prepare(`SELECT * FROM ${t}`).all());
  const before=business();const result=restoreMissing(db,skills);
  assert.equal(result.inserted,331);assert.ok(result.existingDifferences.some(d=>d.field==='title'));
  assert.deepEqual(db.prepare('SELECT * FROM skills WHERE id=9001').get(),previous);assert.deepEqual(business(),before);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM skills').get().n,332);db.close();
});
test('recovery CLI defaults to read-only preview and rejects production writes',()=>{
  const cli=path.join(__dirname,'../scripts/restore-skills.cjs');
  const run=(args,env={})=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',env:{...process.env,...env}});
  const before=hash();assert.equal(run(['--db',dbPath]).status,0);assert.equal(hash(),before);
  const file=path.join(tmp,'preview-not-created.db');assert.equal(run(['--db',file]).status,0);assert.ok(!fs.existsSync(file));
  assert.equal(run(['--db',file,'--apply']).status,2);assert.ok(!fs.existsSync(file));
  assert.equal(run(['--db',dbPath,'--apply'],{NODE_ENV:'production'}).status,2);
  assert.equal(run(['--db',dbPath,'--apply'],{RAILWAY_ENVIRONMENT_NAME:'production'}).status,2);
  assert.equal(hash(),before);
});
test('recovery refuses trigger side effects and rolls back failed multi-row inserts',()=>{
  const file=path.join(tmp,'failure.db'),db=new Database(file);
  restoreMissing(db,[skills[0]],{create:true});
  db.exec('CREATE TRIGGER blocked BEFORE INSERT ON skills BEGIN SELECT RAISE(ABORT, "blocked"); END;');
  assert.throws(()=>restoreMissing(db,skills),/triggers/);db.exec('DROP TRIGGER blocked');
  const broken=structuredClone(skills.slice(1,4));broken[1].title=null;
  assert.throws(()=>restoreMissing(db,broken));assert.equal(db.prepare('SELECT COUNT(*) AS n FROM skills').get().n,1);db.close();
});
