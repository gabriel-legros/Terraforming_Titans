const fs = require('fs');
const path = require('path');
const vm = require('vm');

const parametersPath = path.resolve(__dirname, '../../src/js/terraforming/terraforming-parameters.js');
const parametersSource = fs.readFileSync(parametersPath, 'utf8');
const resetLevelsPath = path.resolve(__dirname, '../../src/js/game-state-reset.js');
const resetLevelsSource = fs.readFileSync(resetLevelsPath, 'utf8');

global.GAME_RESET_LEVEL = vm.runInNewContext(
  `${resetLevelsSource}\nGAME_RESET_LEVEL;`,
  {},
  { filename: resetLevelsPath }
);

global.terraformingParameters = vm.runInNewContext(
  `${parametersSource}\nterraformingParameters;`,
  {},
  { filename: parametersPath }
);
