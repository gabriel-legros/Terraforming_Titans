const EffectableEntity = require('../effectable-entity.js');
// expose globally so OreScanning can extend it when required
global.EffectableEntity = EffectableEntity;
const OreScanning = require('../ore-scanning.js');

describe('OreScanning integration with EffectableEntity', () => {
  const params = {
    resources: {
      underground: {
        ore: { initialValue: 0, maxDeposits: 1, areaTotal: 100 }
      }
    }
  };

  test('instance inherits addEffect method', () => {
    const scanner = new OreScanning(params);
    expect(typeof scanner.addEffect).toBe('function');
  });
});
