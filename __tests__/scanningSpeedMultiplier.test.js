const EffectableEntity = require('../effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const OreScanning = require('../ore-scanning.js');

describe('scanningSpeedMultiplier effect', () => {
  const params = {
    resources: { underground: { ore: { initialValue: 0, maxDeposits: 1, areaTotal: 100 } } }
  };

  test('doubles scanning progress', () => {
    global.resources = { underground: { ore: { addDeposit: jest.fn() } } };
    const scanner = new OreScanning(params);
    scanner.scanData.ore.currentScanningStrength = 1;
    scanner.startScan('ore');
    scanner.updateScan(50);
    expect(scanner.scanData.ore.D_current).toBe(0);

    scanner.addAndReplace({ type: 'scanningSpeedMultiplier', value: 2, effectId: 'skill', sourceId: 'skill' });
    scanner.updateScan(50);
    expect(scanner.scanData.ore.D_current).toBe(1);
  });
});
