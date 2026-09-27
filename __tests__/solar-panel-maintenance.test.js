const { createGameDom } = require('./helpers/jsdom-game-harness');

describe('solar panel maintenance penalties', () => {
  let dom;
  let window;
  let panel;
  let resources;

  beforeAll(async () => {
    dom = await createGameDom({ trackEventListeners: false });
    window = dom.window;
    window.eval('resources = createResources(currentPlanetParameters.resources); buildings = initializeBuildings(buildingsParameters);');
    resources = window.eval('resources');
    panel = window.eval('buildings.solarPanel');
  });

  afterAll(() => dom.window.close());

  beforeEach(() => {
    jest.spyOn(window.eval('dayNightCycle'), 'isDay').mockReturnValue(true);
    window.eval('gameSettings.unfulfilledMaintenancePenalties = true');
    panel.count = 1n;
    panel.active = 1n;
    panel.productivity = 1;
    panel.displayProductivity = 1;
    panel.maintenanceProductivity = 0.5;
  });

  afterEach(() => jest.restoreAllMocks());

  function applyMaintenance() {
    const changes = {};
    for (const category in resources) {
      changes[category] = {};
      for (const name in resources[category]) {
        changes[category][name] = 0;
      }
    }
    const maintenance = {};
    panel.applyMaintenance(changes, maintenance, 1000);
    return { changes, maintenance };
  }

  test('daytime output respects the maintenance cap', () => {
    panel.updateProductivity(resources, 1000);
    expect(panel.productivity).toBeCloseTo(0.5);
    expect(panel.displayProductivity).toBeCloseTo(0.5);
    const { changes } = applyMaintenance();
    panel.produce(changes, 1000);
    const output = changes.colony.energy;
    panel.maintenanceProductivity = 1;
    panel.productivity = 1;
    panel.displayProductivity = 1;
    panel.updateProductivity(resources, 1000);
    const full = applyMaintenance();
    panel.produce(full.changes, 1000);
    expect(output).toBeGreaterThan(0);
    expect(output).toBeCloseTo(full.changes.colony.energy / 2);
  });

  test('nighttime without a maintenance payment does not repair panels', () => {
    window.eval('dayNightCycle').isDay.mockReturnValue(false);
    panel.productivity = 0;
    panel.displayProductivity = 0;
    const { maintenance } = applyMaintenance();
    expect(maintenance.metal).toBe(0);
    window.eval('updateBuildingMaintenanceProductivities')({ panel }, {}, 900000);
    expect(panel.maintenanceProductivity).toBe(0.5);
  });

  test('paid daytime maintenance repairs panels', () => {
    applyMaintenance();
    window.eval('updateBuildingMaintenanceProductivities')(
      { panel }, { metal: 1, glass: 1, electronics: 1 }, 900000
    );
    expect(panel.maintenanceProductivity).toBe(1);
  });

  test('deactivated panels still reset their penalty', () => {
    panel.active = 0n;
    applyMaintenance();
    window.eval('updateBuildingMaintenanceProductivities')({ panel }, {}, 900000);
    expect(panel.maintenanceProductivity).toBe(1);
  });
});
