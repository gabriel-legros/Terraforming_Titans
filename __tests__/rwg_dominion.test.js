const { planetParameters } = require('../src/js/planet-parameters.js');
global.planetParameters = planetParameters;
const { RwgManager } = require('../src/js/rwg/rwg.js');

describe('Random World Generator dominions', () => {
  test('defaults to human and fritizian dominions', () => {
    const manager = new RwgManager();
    expect(manager.getAvailableDominions()).toEqual(['human', 'ammonia']);
  });

  test('unlocks gabbagian dominion through effects', () => {
    const manager = new RwgManager();
    manager.applyEffect({ type: 'allowDominion', targetId: 'gabbagian' });
    expect(manager.getAvailableDominions()).toEqual(['human', 'gabbagian', 'ammonia']);
  });
});
