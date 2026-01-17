const { SpaceMirrorAdvancedOversight } = require('../src/js/projects/SpaceMirrorAdvancedOversight.js');

describe('SpaceMirrorAdvancedOversight', () => {
  const buildTerraforming = () => ({
    temperature: {
      value: 250,
      zones: {
        tropical: { value: 250, day: 250, night: 250 },
        temperate: { value: 250, day: 250, night: 250 },
        polar: { value: 250, day: 250, night: 250 },
      },
    },
    initialLand: 1,
    saveTemperatureState: () => ({}),
    restoreTemperatureState: () => {},
    updateSurfaceTemperature: () => {},
    calculateMirrorEffect: () => ({ interceptedPower: 1 }),
    calculateZoneSolarFlux: () => 1,
  });

  const buildBuildings = () => ({
    spaceMirror: { active: 10 },
    hyperionLantern: {
      active: 5,
      powerPerBuilding: 1,
      _baseProductivity: 1,
    },
  });

  const buildProjectManager = () => ({
    isBooleanFlagSet: () => true,
    projects: {
      spaceMirrorFacility: {
        isBooleanFlagSet: () => true,
      },
    },
  });

  let savedTerraforming;
  let savedBuildings;
  let savedProjectManager;

  beforeEach(() => {
    savedTerraforming = global.terraforming;
    savedBuildings = global.buildings;
    savedProjectManager = global.projectManager;
    global.terraforming = buildTerraforming();
    global.buildings = buildBuildings();
    global.projectManager = buildProjectManager();
  });

  afterEach(() => {
    global.terraforming = savedTerraforming;
    global.buildings = savedBuildings;
    global.projectManager = savedProjectManager;
  });

  test('clears focus assignments when water target is zero', () => {
    const settings = {
      advancedOversight: true,
      applyToLantern: true,
      assignments: {
        mirrors: { tropical: 0, temperate: 0, polar: 0, focus: 4 },
        lanterns: { tropical: 0, temperate: 0, polar: 0, focus: 2 },
        reversalMode: { focus: true },
      },
      targets: { tropical: 0, temperate: 0, polar: 0, water: 0 },
      priority: { tropical: 1, temperate: 1, polar: 1, focus: 1 },
      tempMode: { tropical: 'average', temperate: 'average', polar: 'average' },
    };

    SpaceMirrorAdvancedOversight.runAssignments({ reversalAvailable: true }, settings);

    expect(settings.assignments.mirrors.focus).toBe(0);
    expect(settings.assignments.lanterns.focus).toBe(0);
    expect(settings.assignments.reversalMode.focus).toBe(false);
  });
});
