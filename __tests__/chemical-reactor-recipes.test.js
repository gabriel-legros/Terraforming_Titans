const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EffectableEntity = require('../src/js/effectable-entity');

const loadBuildingParameters = () => {
  const fullPath = path.resolve(__dirname, '..', 'src/js/buildings-parameters.js');
  const code = `${fs.readFileSync(fullPath, 'utf8')}\nthis.buildingsParameters = buildingsParameters;`;
  const context = {};
  vm.runInNewContext(code, context, { filename: fullPath });
  return context.buildingsParameters;
};

describe('Chemical reactor recipes', () => {
  afterEach(() => {
    global.EffectableEntity = null;
    global.maintenanceFraction = null;
    global.populationModule = null;
    global.dayNightCycle = null;
    global.buildings = null;
    global.updateBuildingDisplay = null;
    global.spaceManager = null;
    global.researchManager = null;
    global.resources = null;
    global.terraforming = null;
    global.calculateAtmosphericPressure = null;
    global.Building = null;
    global.MultiRecipesBuilding = null;
  });

  test('includes gated ammonia recipes', () => {
    const buildingsParameters = loadBuildingParameters();
    const recipes = buildingsParameters.boschReactor.recipes;

    expect(recipes.haberBosch).toBeDefined();
    expect(recipes.haberBosch.requiresBuildingFlag).toBe('gabbagAmmoniaChemistry');
    expect(recipes.ammoniaCombustion).toBeDefined();
    expect(recipes.ammoniaCombustion.requiresBuildingFlag).toBe('gabbagAmmoniaChemistry');
  });

  test('locks ammonia recipes until the gabbag flag is set', () => {
    const buildingsParameters = loadBuildingParameters();

    global.EffectableEntity = EffectableEntity;
    global.maintenanceFraction = 0;
    global.populationModule = { getWorkerAvailabilityRatio: () => 1 };
    global.dayNightCycle = { isDay: () => true, isNight: () => false };
    global.buildings = {};
    global.updateBuildingDisplay = jest.fn();
    global.spaceManager = { isArtificialWorld: () => false };
    global.researchManager = {
      isBooleanFlagSet: () => false
    };
    global.resources = {
      colony: { energy: { value: 1000 } },
      atmospheric: {
        carbonDioxide: { value: 0 },
        hydrogen: { value: 0 },
        oxygen: { value: 0 },
        inertGas: { value: 0 },
        atmosphericMethane: { value: 0 },
        atmosphericAmmonia: { value: 0 },
        atmosphericWater: { value: 0 }
      }
    };
    global.terraforming = {
      celestialParameters: { gravity: 9.81, radius: 6371000 }
    };
    global.calculateAtmosphericPressure = jest.fn(() => 2000);

    const { Building } = require('../src/js/building');
    global.Building = Building;
    const { MultiRecipesBuilding } = require('../src/js/buildings/MultiRecipesBuilding');
    global.MultiRecipesBuilding = MultiRecipesBuilding;
    const { ChemicalReactor } = require('../src/js/buildings/ChemicalReactor');

    const reactor = new ChemicalReactor(buildingsParameters.boschReactor, 'boschReactor');
    const lockedKeys = reactor._getAllowedRecipeKeys();
    expect(lockedKeys).not.toContain('haberBosch');
    expect(lockedKeys).not.toContain('ammoniaCombustion');

    reactor.applyBooleanFlag({ flagId: 'gabbagAmmoniaChemistry', value: true });
    const unlockedKeys = reactor._getAllowedRecipeKeys();
    expect(unlockedKeys).toContain('haberBosch');
    expect(unlockedKeys).toContain('ammoniaCombustion');
  });
});
