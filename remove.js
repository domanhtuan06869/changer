var fs = require("fs");

var winlexJsRootPath = "./app/assets/js";

async function main() {
  let files = fs.readdirSync(winlexJsRootPath);
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    if (!file.endsWith('.js')) continue
    if (file.includes('load_')) continue
    fs.unlinkSync(`${winlexJsRootPath}\\${file}`)
  }
}

main();