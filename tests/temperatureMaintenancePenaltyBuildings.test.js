const EffectableEntity = require('../src/js/effectable-entity.js');
// Minimal globals
global.EffectableEntity = EffectableEntity;
global.lifeParameters = {};

const Terraforming = require('../src/js/terraforming.js');
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};
Terraforming.prototype.updateSurfaceRadiation = function(){};

describe('temperature maintenance penalty applies to buildings', () => {
  test('skips immune buildings', () => {
    global.resources = { atmospheric:{}, special:{ albedoUpgrades:{ value:0 } }, surface:{}, colony:{} };
    global.buildings = {
      normal: {},
      mirror: { temperatureMaintenanceImmune: true }
    };
    global.colonies = {};
    global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.lifeDesigner = {};
    global.lifeManager = new EffectableEntity({ description: 'life' });
    global.oreScanner = {};

    const tf = new Terraforming(global.resources, { distanceFromSun:1, radius:1, gravity:1, albedo:0 });
    tf.temperature = { value: 473.15 };
    tf.calculateColonyEnergyPenalty = () => 1;
    tf.calculateMaintenancePenalty = () => 2;
    tf.calculateSolarPanelMultiplier = () => 1;
    tf.calculateWindTurbineMultiplier = () => 1;

    const originalAdd = global.addEffect;
    const mockAdd = jest.fn();
    global.addEffect = mockAdd;

    tf.applyTerraformingEffects();

    const calls = mockAdd.mock.calls.map(c => c[0]);
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: 'building', targetId: 'normal', type: 'maintenanceMultiplier', value: 2 })
    ]));
    expect(calls).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ targetId: 'mirror' })
    ]));

    global.addEffect = originalAdd;
  });
});
