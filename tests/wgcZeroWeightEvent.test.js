const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC zero weight event exclusion', () => {
  test('Social Science challenge is excluded when weight is 0', () => {
    const wgc = new WarpGateCommand();
    wgc.stances[0].hazardousBiomass = 'Aggressive';
    const originalRandom = Math.random;
    Math.random = () => 0.6875;
    const event = wgc.chooseEvent(0);
    Math.random = originalRandom;
    expect(event.name).toBe('Natural Science challenge');
  });
});
