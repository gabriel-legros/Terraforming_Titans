const EffectableEntity = require('../src/js/effectable-entity.js');

global.EffectableEntity = EffectableEntity;
global.lifeParameters = {};

const Terraforming = require('../src/js/terraforming.js');
Terraforming.prototype.updateLuminosity = function() {};
Terraforming.prototype.updateSurfaceTemperature = function() {};
Terraforming.prototype.updateSurfaceRadiation = function() {};

describe('gravity cost penalty', () => {
  test('calculateGravityCostPenalty handles threshold behavior', () => {
    const low = Terraforming.prototype.calculateGravityCostPenalty.call({
      celestialParameters: { gravity: 8 }
    });
    expect(low).toEqual({ multiplier: 1, linearIncrease: 0, exponentialIncrease: 0 });

    const mid = Terraforming.prototype.calculateGravityCostPenalty.call({
      celestialParameters: { gravity: 12 }
    });
    expect(mid.linearIncrease).toBeCloseTo(0.2);
    expect(mid.exponentialIncrease).toBe(0);
    expect(mid.multiplier).toBeCloseTo(1.2);

    const high = Terraforming.prototype.calculateGravityCostPenalty.call({
      celestialParameters: { gravity: 25 }
    });
    const expectedMultiplier = 1 + (15 * 0.1) + (Math.pow(2, 0.5) - 1);
    expect(high.linearIncrease).toBeCloseTo(1.5);
    expect(high.exponentialIncrease).toBeCloseTo(Math.pow(2, 0.5) - 1);
    expect(high.multiplier).toBeCloseTo(expectedMultiplier);
  });

  test('applyTerraformingEffects applies gravity multiplier to build costs', () => {
    global.resources = {
      atmospheric: {},
      special: { albedoUpgrades: { value: 0 } },
      surface: {},
      colony: {}
    };
    const originalCurrentPlanetParameters = global.currentPlanetParameters;
    global.currentPlanetParameters = {
      resources: {
        atmospheric: {},
        surface: {},
        underground: {},
        colony: {}
      },
      gravityPenaltyEnabled: true,
      celestialParameters: {
        gravity: 25,
        radius: 1,
        distanceFromSun: 1,
        albedo: 0.1
      }
    };
    const originalBuildings = global.buildings;
    const originalColonies = global.colonies;
    global.buildings = {
      sampleBuilding: {
        cost: {
          colony: { metal: 10 },
          surface: { land: 2 }
        }
      }
    };
    global.colonies = {
      sample_colony: {
        cost: {
          colony: { metal: 20 }
        }
      }
    };
    global.structures = { ...global.buildings, ...global.colonies };
    global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.lifeDesigner = {};
    global.lifeManager = new EffectableEntity({ description: 'life' });
    global.oreScanner = {};

    const tf = new Terraforming(global.resources, {
      distanceFromSun: 1,
      radius: 1,
      gravity: 25,
      albedo: 0.1
    });
    tf.calculateSolarPanelMultiplier = () => 1;
    tf.calculateWindTurbineMultiplier = () => 1;
    tf.calculateColonyEnergyPenalty = () => 1;
    tf.calculateColonyPressureCostPenalty = () => 1;
    tf.calculateMaintenancePenalty = () => 1;
    tf.getFactoryTemperatureMaintenancePenaltyReduction = () => 0;

    const originalAdd = global.addEffect;
    const mockAdd = jest.fn();
    global.addEffect = mockAdd;

    tf.applyTerraformingEffects();

    const calls = mockAdd.mock.calls.map(call => call[0]);
    const gravityEffects = calls.filter(effect => effect && effect.effectId && effect.effectId.startsWith('gravityCostPenalty'));
    const expectedMultiplier = 1 + (15 * 0.1) + (Math.pow(2, 0.5) - 1);

    const buildingMetal = gravityEffects.find(effect =>
      effect.target === 'building' &&
      effect.targetId === 'sampleBuilding' &&
      effect.resourceCategory === 'colony' &&
      effect.resourceId === 'metal'
    );
    expect(buildingMetal).toBeDefined();
    expect(buildingMetal.value).toBeCloseTo(expectedMultiplier);

    const buildingLand = gravityEffects.find(effect =>
      effect.target === 'building' &&
      effect.targetId === 'sampleBuilding' &&
      effect.resourceCategory === 'surface' &&
      effect.resourceId === 'land'
    );
    expect(buildingLand).toBeDefined();
    expect(buildingLand.value).toBeCloseTo(expectedMultiplier);

    const colonyMetal = gravityEffects.find(effect =>
      effect.target === 'colony' &&
      effect.targetId === 'sample_colony' &&
      effect.resourceCategory === 'colony' &&
      effect.resourceId === 'metal'
    );
    expect(colonyMetal).toBeDefined();
    expect(colonyMetal.value).toBeCloseTo(expectedMultiplier);

    global.addEffect = originalAdd;
    global.buildings = originalBuildings;
    global.colonies = originalColonies;
    delete global.structures;
    if (originalCurrentPlanetParameters === undefined) {
      delete global.currentPlanetParameters;
    } else {
      global.currentPlanetParameters = originalCurrentPlanetParameters;
    }
  });

  test('applyTerraformingEffects skips gravity multiplier when penalty disabled', () => {
    global.resources = {
      atmospheric: {},
      special: { albedoUpgrades: { value: 0 } },
      surface: {},
      colony: {}
    };
    const originalCurrentPlanetParameters = global.currentPlanetParameters;
    global.currentPlanetParameters = {
      resources: {
        atmospheric: {},
        surface: {},
        underground: {},
        colony: {}
      },
      gravityPenaltyEnabled: false,
      celestialParameters: {
        gravity: 25,
        radius: 1,
        distanceFromSun: 1,
        albedo: 0.1
      }
    };
    const originalBuildings = global.buildings;
    const originalColonies = global.colonies;
    global.buildings = {
      sampleBuilding: {
        cost: {
          colony: { metal: 10 },
          surface: { land: 2 }
        }
      }
    };
    global.colonies = {
      sample_colony: {
        cost: {
          colony: { metal: 20 }
        }
      }
    };
    global.structures = { ...global.buildings, ...global.colonies };
    global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.lifeDesigner = {};
    global.lifeManager = new EffectableEntity({ description: 'life' });
    global.oreScanner = {};

    const tf = new Terraforming(global.resources, {
      distanceFromSun: 1,
      radius: 1,
      gravity: 25,
      albedo: 0.1
    });
    tf.calculateSolarPanelMultiplier = () => 1;
    tf.calculateWindTurbineMultiplier = () => 1;
    tf.calculateColonyEnergyPenalty = () => 1;
    tf.calculateColonyPressureCostPenalty = () => 1;
    tf.calculateMaintenancePenalty = () => 1;
    tf.getFactoryTemperatureMaintenancePenaltyReduction = () => 0;

    const originalAdd = global.addEffect;
    const mockAdd = jest.fn();
    global.addEffect = mockAdd;

    tf.applyTerraformingEffects();

    const calls = mockAdd.mock.calls.map(call => call[0]);
    const gravityEffects = calls.filter(effect => effect && effect.effectId && effect.effectId.startsWith('gravityCostPenalty'));
    expect(gravityEffects).toHaveLength(0);

    global.addEffect = originalAdd;
    global.buildings = originalBuildings;
    global.colonies = originalColonies;
    delete global.structures;
    if (originalCurrentPlanetParameters === undefined) {
      delete global.currentPlanetParameters;
    } else {
      global.currentPlanetParameters = originalCurrentPlanetParameters;
    }
  });
});
