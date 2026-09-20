const {loadLibrary,readJSON,compareSnapshot} = require('../lib/skillContent');
try {
  const [mode,file,...rest]=process.argv.slice(2);
  if (!['--snapshot','--db'].includes(mode) || !file || rest.length) throw new Error('Usage: npm run compare:skills -- --snapshot <readonly-export.json> | --db <explicit-sqlite-path>');
  const snapshot=mode==='--snapshot'?readJSON(file):require('../lib/skillSnapshot').readSnapshot(file);
  const result=compareSnapshot(loadLibrary().skills,snapshot);
  console.log(JSON.stringify(result,null,2));
  process.exitCode=result.differenceCount ? 1 : 0;
} catch(error) {console.error(error.message);process.exitCode=2;}
