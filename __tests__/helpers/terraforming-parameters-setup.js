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

// Load the same classic-script optical resolver used by browser world generation.
const surfaceAlbedoPath = path.resolve(__dirname, '../../src/js/terraforming/surface-albedo.js');
global.calculateSurfaceFractions = vm.runInNewContext(
  `${fs.readFileSync(surfaceAlbedoPath, 'utf8')}\ncalculateSurfaceFractions;`,
  { terraformingParameters: global.terraformingParameters },
  { filename: surfaceAlbedoPath }
);

// RWG resolves required physics at generation time, after ordered browser loading.
global.defaultPlanetResources = require('../../src/js/planet-resource-parameters.js');
const physics = require('../../src/js/terraforming/physics.js');
global.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
global.dayNightTemperaturesModel = physics.dayNightTemperaturesModel;
