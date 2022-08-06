var JavaScriptObfuscator = require("javascript-obfuscator");
var fs = require("fs");

var winlexJsRootPath = "./app/assets/js";

async function main() {
  let files = fs.readdirSync(winlexJsRootPath);
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    if (!file.endsWith('.js')) continue
    let path = winlexJsRootPath + '\\' + file
    let fileContent = fs.readFileSync(path, 'utf8').toString();
    var obfuscationResult = JavaScriptObfuscator.obfuscate(fileContent, {
      compact: false,
      controlFlowFlattening: true,
      numbersToExpressions: true,
      simplify: true,
      shuffleStringArray: true,
      splitStrings: true,
    });
    fs.writeFileSync(path, obfuscationResult.getObfuscatedCode(), {encoding: 'utf-8'})
  }
}

main();
