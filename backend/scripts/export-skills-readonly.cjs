try {
  const [mode,file,...rest]=process.argv.slice(2);
  if(mode!=='--db' || !file || rest.length) throw new Error('Usage: node backend/scripts/export-skills-readonly.cjs --db <explicit-sqlite-path>');
  console.log(JSON.stringify(require('../lib/skillSnapshot').readSnapshot(file),null,2));
} catch(error) {console.error(error.message);process.exitCode=2;}
