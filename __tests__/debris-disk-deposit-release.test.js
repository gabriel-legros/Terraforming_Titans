const path = require('path');
const { loadClassicScript } = require('./helpers/classic-script-loader');

function loadHazard() {
  jest.resetModules();
  global.t = (path, values, fallback) => fallback;
  global.registerRateSource = sourceId => sourceId;
  global.RESOURCE_RATE_SOURCE_IDS = { spaceshipMining: 'project:spaceshipMining' };
  global.normalizeBuildingCount = value => BigInt(value);
  global.resources = {};

  return loadClassicScript(
    path.resolve(__dirname, '../src/js/terraforming/hazards/debrisDiskHazard.js'),
    ['DebrisDiskHazard']
  ).DebrisDiskHazard;
}

afterEach(() => {
  delete global.t;
  delete global.registerRateSource;
  delete global.RESOURCE_RATE_SOURCE_IDS;
  delete global.normalizeBuildingCount;
  delete global.resources;
});

describe('Debris Disk deposit-bound structure attrition', () => {
  test('releases deposits reserved by destroyed structures', () => {
    const DebrisDiskHazard = loadHazard();
    const hazard = new DebrisDiskHazard({});
    const structure = {
      count: 11n,
      countNumber: 11,
      active: 0n,
      activeNumber: 0,
      productivity: 1,
      displayProductivity: 1,
      requiresDeposit: { underground: { ore: 1 } },
      releaseDeposit: jest.fn(),
      updateResourceStorage: jest.fn(),
      getBaseEffectiveCost: () => ({})
    };

    const result = hazard.applyAttritionToStructure(structure, 'building:oreMine', 1, 1);

    expect(result.losses).toBe(1);
    expect(structure.count).toBe(10n);
    expect(structure.releaseDeposit).toHaveBeenCalledWith(resources, 1);
  });
});
