const fs = require('fs');

function loadClassicScript(scriptPath, globalNames) {
  const source = fs.readFileSync(scriptPath, 'utf8');
  const exports = globalNames.join(', ');
  return Function(`${source}\nreturn { ${exports} };`)();
}

module.exports = { loadClassicScript };
