const fs=require('node:fs'),path=require('node:path');
const {loadLibrary}=require('../lib/skillContent');
const {planRestore,restoreMissing}=require('../lib/skillRestore');
function main(args=process.argv.slice(2)) {
  if(args[0]!=='--db' || !args[1] || args[1].startsWith('--') || args.slice(2).some(a=>!['--apply','--create'].includes(a)) || new Set(args.slice(2)).size!==args.slice(2).length) {
    throw new Error('Usage: npm run restore:skills -- --db <local-path> [--apply] [--create]. Default is read-only preview.');
  }
  const apply=args.includes('--apply'),create=args.includes('--create');
  if(apply && (process.env.NODE_ENV==='production' || Object.keys(process.env).some(k=>k.startsWith('RAILWAY_')))) throw new Error('Recovery writes are forbidden in production/Railway environments');
  const target=path.resolve(args[1]);
  const realTarget=fs.existsSync(target) ? fs.realpathSync(target) : path.join(fs.realpathSync(path.dirname(target)),path.basename(target));
  if(apply && [target,realTarget].some(p=>p==='/data' || p.startsWith('/data/'))) throw new Error('Recovery writes to production /data are forbidden');
  const {skills}=loadLibrary();
  const exists=fs.existsSync(target);
  if(!exists && !apply) {
    console.log(JSON.stringify({mode:'preview',database:target,exists:false,createTables:true,insertWeeks:skills.map(s=>s.week_number),wouldInsert:skills.length,requires:'--apply --create'},null,2));
    return;
  }
  if(!exists && !create) throw new Error('Missing database: explicit --create required');
  const Database=require('better-sqlite3');
  const db=new Database(target,{readonly:!apply,fileMustExist:exists || !create});
  try {
    if(!apply) db.pragma('query_only = ON');
    else db.pragma('foreign_keys = ON');
    const result=apply?restoreMissing(db,skills,{create}):db.transaction(()=>planRestore(db,skills)).deferred();
    console.log(JSON.stringify({mode:apply?'apply-missing-only':'preview',database:target,...result},null,2));
  } finally {db.close();}
}
if(require.main===module) {try{main();}catch(error){console.error(error.message);process.exitCode=2;}}
module.exports={main};
