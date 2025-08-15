const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
global.lifeParameters = {};
const Terraforming = require('../src/js/terraforming.js');
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};
Terraforming.prototype.updateSurfaceRadiation = function(){};
const { getEcumenopolisLandFraction } = require('../src/js/advanced-research/ecumenopolis.js');
const { getEffectiveLifeFraction } = require('../src/js/terraforming.js');

describe('Ecumenopolis land effect on life target', () => {
  test('life target scales with ecumenopolis coverage', () => {
    global.resources = {
      surface: { land: { value: 1000000 } },
      atmospheric: {},
      special: { albedoUpgrades: { value: 0 } }
    };
    global.buildings = {};
    global.colonies = { t7_colony: { active: 0, requiresLand: 100000 } };
    global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.lifeDesigner = {};
    global.lifeManager = new EffectableEntity({ description: 'life' });
    global.oreScanner = {};

    const tf = new Terraforming(global.resources, { distanceFromSun: 1, radius: 1, gravity: 1, albedo: 0 });

    expect(getEcumenopolisLandFraction(tf)).toBe(0);
    expect(getEffectiveLifeFraction(tf)).toBeCloseTo(0.5);

    global.colonies.t7_colony.active = 2; // 20% coverage
    expect(getEcumenopolisLandFraction(tf)).toBeCloseTo(0.2);
    expect(getEffectiveLifeFraction(tf)).toBeCloseTo(0.3);

    global.colonies.t7_colony.active = 5; // 50% coverage
    expect(getEcumenopolisLandFraction(tf)).toBeCloseTo(0.5);
    expect(getEffectiveLifeFraction(tf)).toBe(0);
  });
});
