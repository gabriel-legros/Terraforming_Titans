const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
global.Project = class extends EffectableEntity {};
const ScannerProject = require('../src/js/projects/ScannerProject.js');

describe('ScannerProject initializes D_current from resource value', () => {
  test('uses current deposit count when available', () => {
    const params = { resources: { underground: { ore: { initialValue: 5, maxDeposits: 20, areaTotal: 100 } } } };
    global.resources = { underground: { ore: { value: 7, addDeposit: jest.fn() } } };
    const scanner = new ScannerProject({}, 'scan');
    scanner.initializeScanner(params);
    expect(scanner.scanData.ore.D_current).toBe(7);
  });
});
