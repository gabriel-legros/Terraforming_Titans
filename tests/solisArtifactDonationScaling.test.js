const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../src/js/solis.js');

describe('Solis artifact donation scaling', () => {
  test('donateArtifacts scales with terraformed world bonus', () => {
    const manager = new SolisManager();
    const prevResources = global.resources;
    const prevSpace = global.spaceManager;
    global.resources = { special: { alienArtifact: { value: 5, decrease(n){ this.value -= n; } } } };
    global.spaceManager = { getTerraformedPlanetCount: () => 4 };

    const result = manager.donateArtifacts(2);
    expect(result).toBe(true);
    expect(manager.solisPoints).toBe(2 * 10 * 2); // sqrt(4) = 2 bonus
    global.resources = prevResources;
    global.spaceManager = prevSpace;
  });
});
