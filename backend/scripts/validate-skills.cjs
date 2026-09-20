const {loadLibrary} = require('../lib/skillContent');
try {
  if (process.argv.length > 2) throw new Error('Usage: npm run validate:skills');
  const {validation} = loadLibrary(undefined,{strict:false});
  console.log(JSON.stringify(validation,null,2));
  process.exitCode=validation.errors.length ? 2 : 0;
} catch(error) {console.error(error.message);process.exitCode=2;}
