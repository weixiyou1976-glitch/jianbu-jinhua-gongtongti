// Always uses a NEW local temporary database, never DB_PATH or a supplied target.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {loadLibrary,compareSnapshot}=require('../lib/skillContent');
const {readSnapshot}=require('../lib/skillSnapshot');
function rehearse() {
  if(process.argv.length>2) throw new Error('No target accepted: rehearsal only creates a fresh temporary database');
  if(Object.keys(process.env).some(k=>k.startsWith('RAILWAY_'))) throw new Error('Recovery rehearsal must run locally, outside Railway');
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'jianbu-skill-recovery-'));
  const database=path.join(directory,'recovered.db');
  // Minimal environment keeps production credentials and DB_PATH out of child processes.
  const env={PATH:process.env.PATH,HOME:directory,DB_PATH:database};
  const seed=path.join(__dirname,'../seed.js');
  execFileSync(process.execPath,[seed,'--db',database,'--apply','--create'],{cwd:directory,env,stdio:'pipe'});
  const first=readSnapshot(database);
  execFileSync(process.execPath,[seed,'--db',database,'--apply'],{cwd:directory,env,stdio:'pipe'});
  const second=readSnapshot(database);
  if(JSON.stringify(first.skills)!==JSON.stringify(second.skills)) throw new Error('Second seed changed existing Skill content');
  const result=compareSnapshot(loadLibrary().skills,second);
  if(result.differenceCount) throw new Error(JSON.stringify(result));
  console.log(JSON.stringify({temporaryDatabase:database,skills:result.repositoryCount,skillTags:second.metadata.skill_tags_row_count,differences:0,reseedPreservesExistingContent:true},null,2));
}
try {rehearse();} catch(error) {console.error(error.message);process.exitCode=2;}
