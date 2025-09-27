const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Resource, produceResources } = require('../src/js/resource.js');

describe('nanotech produceResources integration', () => {
  test('resource.js calls nanotechManager.produceResources with changes', () => {
    const energy = new Resource({ name: 'energy', category: 'colony', initialValue: 0, hasCap: true, baseCap: 0 });
    global.resources = { colony: { energy }, surface: { land: new Resource({ name: 'land', category: 'surface', initialValue: 1, hasCap: true, baseCap: 1 }) } };
    global.structures = {};
    global.buildings = {};
    global.dayNightCycle = { isDay: () => true };
    global.fundingModule = null;
    global.terraforming = null;
    global.lifeManager = null;
    global.researchManager = null;
    global.updateShipReplication = null;
    global.updateAndroidResearch = null;
    global.projectManager = null;
    const spy = jest.fn();
    global.nanotechManager = { produceResources: spy };
    produceResources(1000);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][1]).toBeTruthy();
  });
});
