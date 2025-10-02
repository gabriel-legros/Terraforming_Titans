const EffectableEntity = require('../src/js/effectable-entity.js');
// expose globally so OreScanning can extend it when required
global.EffectableEntity = EffectableEntity;
global.Project = class extends EffectableEntity {};
const ScannerProject = require('../src/js/projects/ScannerProject.js');

describe('OreScanning integration with EffectableEntity', () => {
  const params = {
    resources: {
      underground: {
        ore: { initialValue: 0, maxDeposits: 1, areaTotal: 100 }
      }
    }
  };

  test('instance inherits addEffect method', () => {
    const scanner = new ScannerProject({}, 'test');
    scanner.initializeScanner(params);
    expect(typeof scanner.addEffect).toBe('function');
  });
});
