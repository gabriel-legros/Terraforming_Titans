describe('SpaceMirrorAdvancedOversight lantern assignments', () => {
  let SpaceMirrorAdvancedOversight;

  const buildSettings = () => ({
    advancedOversight: true,
    applyToLantern: true,
    assignments: {
      mirrors: { tropical: 0, temperate: 0, polar: 0, focus: 0 },
      lanterns: { tropical: 5, temperate: 0, polar: 0, focus: 0 },
      reversalMode: { tropical: false, temperate: false, polar: false, focus: false, any: false },
    },
    targets: { tropical: 250, temperate: 0, polar: 0, water: 0 },
    priority: { tropical: 1, temperate: 1, polar: 1, focus: 1 },
    tempMode: { tropical: 'average', temperate: 'average', polar: 'average' },
  });

  beforeEach(() => {
    jest.resetModules();
    global.terraforming = {
      temperature: {
        value: 300,
        zones: {
          tropical: { value: 300, day: 300, night: 300 },
          temperate: { value: 280, day: 280, night: 280 },
          polar: { value: 260, day: 260, night: 260 },
        },
      },
      initialLand: 1,
      saveTemperatureState: jest.fn(() => ({})),
      restoreTemperatureState: jest.fn(),
      updateSurfaceTemperature: jest.fn(),
      calculateMirrorEffect: jest.fn(() => ({ interceptedPower: 1 })),
      calculateZoneSolarFlux: jest.fn(() => 1),
    };
    global.buildings = {
      spaceMirror: { active: 0 },
      hyperionLantern: { active: 10, powerPerBuilding: 1, _baseProductivity: 1 },
    };
    ({ SpaceMirrorAdvancedOversight } = require('../src/js/projects/SpaceMirrorAdvancedOversight.js'));
  });

  afterEach(() => {
    delete global.terraforming;
    delete global.buildings;
    jest.resetModules();
  });

  it('clears lanterns from zones with reversed mirrors', () => {
    const settings = buildSettings();
    const project = { reversalAvailable: true };

    SpaceMirrorAdvancedOversight.runAssignments(project, settings);

    expect(settings.assignments.reversalMode.tropical).toBe(true);
    expect(settings.assignments.lanterns.tropical).toBe(0);
  });
});
