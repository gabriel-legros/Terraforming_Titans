const fs = require('fs');
const path = require('path');
const vm = require('vm');

const parametersPath = path.resolve(__dirname, '../../src/js/terraforming/terraforming-parameters.js');
const parametersSource = fs.readFileSync(parametersPath, 'utf8');

global.terraformingParameters = vm.runInNewContext(
  `${parametersSource}\nterraformingParameters;`,
  {},
  { filename: parametersPath }
);
