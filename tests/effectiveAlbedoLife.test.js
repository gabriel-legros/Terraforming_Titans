const { getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');
const { getPlanetParameters } = require('../src/js/planet-parameters.js');

// Globals required by terraforming.js
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;

const Terraforming = require('../src/js/terraforming.js');
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};

function setupGlobals() {
  global.resources = { atmospheric: {}, special: { albedoUpgrades: { value: 0 } }, surface: { biomass: { value: 0 }, liquidWater: {} } };
  global.buildings = { spaceMirror: { active: 0 } };
  global.colonies = {};
  global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
  global.populationModule = {};
  global.tabManager = {};
  global.fundingModule = {};
  global.lifeDesigner = {};
  global.lifeManager = {};
  global.oreScanner = {};
}

describe('effective albedo with biomass', () => {
  test('higher biomass coverage lowers albedo', () => {
    setupGlobals();
    const params = getPlanetParameters('mars');
    global.currentPlanetParameters = params;
    const celestial = { radius: 1, gravity: 1, albedo: 0.5, surfaceArea: 1, distanceFromSun: 1 };
    const terra = new Terraforming(global.resources, celestial);
    terra.calculateInitialValues(params);

    const baseAlbedo = terra.calculateEffectiveAlbedo();

    terra.zonalSurface.tropical.biomass = 10;
    terra.zonalSurface.temperate.biomass = 10;
    terra.zonalSurface.polar.biomass = 10;

    terra._updateZonalCoverageCache();

    const withBiomass = terra.calculateEffectiveAlbedo();
    expect(withBiomass).not.toBeCloseTo(baseAlbedo);
  });
});
