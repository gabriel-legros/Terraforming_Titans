const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
global.Project = class extends EffectableEntity {};
const ScannerProject = require('../src/js/projects/ScannerProject.js');

describe('scanningSpeedMultiplier effect', () => {
  const params = {
    resources: { underground: { ore: { initialValue: 0, maxDeposits: 1, areaTotal: 100 } } }
  };

  test('doubles scanning progress', () => {
    global.resources = { underground: { ore: { addDeposit: jest.fn() } } };
    const scanner = new ScannerProject({}, 'test');
    scanner.initializeScanner(params);
    scanner.scanData.ore.currentScanningStrength = 1;
    scanner.startScan('ore');
    scanner.updateScan(50);
    expect(scanner.scanData.ore.D_current).toBe(0);

    scanner.addAndReplace({ type: 'scanningSpeedMultiplier', value: 2, effectId: 'skill', sourceId: 'skill' });
    scanner.updateScan(50);
    expect(scanner.scanData.ore.D_current).toBe(1);
  });
});
