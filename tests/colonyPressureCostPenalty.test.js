const EffectableEntity = require('../src/js/effectable-entity.js');
// Minimal globals
global.EffectableEntity = EffectableEntity;
global.lifeParameters = {};

const Terraforming = require('../src/js/terraforming.js');
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};
Terraforming.prototype.updateSurfaceRadiation = function(){};

describe('calculateColonyPressureCostPenalty', () => {
  test('returns 1 at or below 1 atm and scales with pressure', () => {
    const tfLow = { calculateTotalPressure: () => 50 };
    const lowPenalty = Terraforming.prototype.calculateColonyPressureCostPenalty.call(tfLow);
    expect(lowPenalty).toBe(1);

    const tfHigh = { calculateTotalPressure: () => 405.3 };
    const highPenalty = Terraforming.prototype.calculateColonyPressureCostPenalty.call(tfHigh);
    expect(highPenalty).toBeCloseTo(2);
  });

  test('applies to colony metal and glass costs', () => {
    global.resources = { atmospheric:{}, special:{ albedoUpgrades:{ value:0 } }, surface:{}, colony:{} };
    global.buildings = {};
    global.colonies = {};
    global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.lifeDesigner = {};
    global.lifeManager = new EffectableEntity({ description: 'life' });
    global.oreScanner = {};

    const tf = new Terraforming(global.resources, { distanceFromSun:1, radius:1, gravity:1, albedo:0 });
    tf.calculateTotalPressure = () => 405.3; // 4 atm
    tf.calculateColonyEnergyPenalty = () => 1;
    tf.calculateMaintenancePenalty = () => 1;
    tf.calculateSolarPanelMultiplier = () => 1;
    tf.calculateWindTurbineMultiplier = () => 1;

    const originalAdd = global.addEffect;
    const mockAdd = jest.fn();
    global.addEffect = mockAdd;

    tf.applyTerraformingEffects();

    const calls = mockAdd.mock.calls.map(c => c[0]);
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: 'colony', targetId: 't1_colony', resourceId: 'metal', type: 'resourceCostMultiplier', value: 2 }),
      expect.objectContaining({ target: 'colony', targetId: 't1_colony', resourceId: 'glass', type: 'resourceCostMultiplier', value: 2 }),
      expect.objectContaining({ target: 'colony', targetId: 't7_colony', resourceId: 'metal', type: 'resourceCostMultiplier', value: 2 }),
      expect.objectContaining({ target: 'colony', targetId: 't7_colony', resourceId: 'glass', type: 'resourceCostMultiplier', value: 2 })
    ]));
    expect(calls).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ resourceId: 'water' })
    ]));

    global.addEffect = originalAdd;
  });
});

