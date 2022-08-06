// eslint-disable-next-line no-unused-vars
var bytenode = require('bytenode');

const fs = require('fs');
const v8 = require('v8');

v8.setFlagsFromString('--no-lazy');

try {
  let rootDir = __dirname + '/assets/js'

  let files = fs.readdirSync(rootDir)
  
  for (let i = 0; i < files.length; i++) {
    try {
      let file = files[i];
      if (!file || !file.endsWith(".js")) continue
      let path = `${rootDir}/${file}`
      let pathc = path + 'c'
      if (fs.existsSync(pathc)) fs.unlinkSync(pathc)
      bytenode.compileFile(path, pathc);
    } catch (er) {
      // ignored
    }
  }
} catch (err) {
  // ignored
}
