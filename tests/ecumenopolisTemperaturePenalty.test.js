const EffectableEntity = require('../src/js/effectable-entity.js');
// Provide minimal globals expected by terraforming module
global.EffectableEntity = EffectableEntity;
global.lifeParameters = {};

const Terraforming = require('../src/js/terraforming.js');
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};
Terraforming.prototype.updateSurfaceRadiation = function(){};

describe('Ecumenopolis temperature penalty', () => {
  test('temperature penalty applies to ecumenopolis districts', () => {
    global.resources = {
      surface: { land: { value: 1000000 } },
      atmospheric: {},
      special: { albedoUpgrades: { value: 0 } }
    };
    global.buildings = {};
    global.colonies = {};
    global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.lifeDesigner = {};
    global.lifeManager = new EffectableEntity({ description: 'life' });
    global.oreScanner = {};

    const tf = new Terraforming(global.resources, { distanceFromSun: 1, radius: 1, gravity: 1, albedo: 0 });

    const originalAddEffect = global.addEffect;
    const mockAddEffect = jest.fn();
    global.addEffect = mockAddEffect;

    tf.calculateSolarPanelMultiplier = () => 1;
    tf.calculateWindTurbineMultiplier = () => 1;
    tf.calculateColonyEnergyPenalty = () => 1.5;

    tf.applyTerraformingEffects();

    const calls = mockAddEffect.mock.calls.map(call => call[0]);
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: 'colony', targetId: 't7_colony', effectId: 'temperaturePenalty', value: 1.5 })
    ]));

    global.addEffect = originalAddEffect;
  });
});
