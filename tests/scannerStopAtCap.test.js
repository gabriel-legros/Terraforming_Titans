const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
global.Project = class extends EffectableEntity {};
const ScannerProject = require('../src/js/projects/ScannerProject.js');

describe('Scanner stops when deposits reach cap', () => {
  test('scanning strength resets to zero at cap', () => {
    const params = { resources: { underground: { ore: { initialValue: 1, maxDeposits: 1, areaTotal: 100 } } } };
    global.resources = { underground: { ore: { value: 1, cap: 1, addDeposit: jest.fn() } } };

    const project = new ScannerProject({ attributes: { scanner: { canSearchForDeposits: true, searchValue: 1, depositType: 'ore' } } }, 'scan');
    project.initializeScanner(params);
    project.scanData.ore.currentScanningStrength = 1;
    project.updateScan(10);

    expect(project.scanData.ore.currentScanningStrength).toBe(0);
    expect(global.resources.underground.ore.value).toBe(1);
  });
});
