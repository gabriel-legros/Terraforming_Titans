global.Project = class {};
global.projectElements = {};
const { runAdvancedOversightAssignments, mirrorOversightSettings } = require('../src/js/projects/SpaceMirrorFacilityProject.js');

describe('runAdvancedOversightAssignments', () => {
  let baseTemps;
  beforeEach(() => {
    mirrorOversightSettings.advancedOversight = true;
    mirrorOversightSettings.applyToLantern = false;
    mirrorOversightSettings.targets = { tropical: 230, temperate: 220, polar: 0, focus: 0 };
    mirrorOversightSettings.priority = { tropical: 1, temperate: 2, polar: 3, focus: 4 };
    mirrorOversightSettings.assignments.mirrors = { tropical: 0, temperate: 0, polar: 0, focus: 0, any: 0 };
    mirrorOversightSettings.assignments.lanterns = { tropical: 0, temperate: 0, polar: 0, focus: 0, any: 0 };
    mirrorOversightSettings.assignments.reversalMode = { tropical: false, temperate: false, polar: false, focus: false };

    global.buildings = {
      spaceMirror: { active: 5 },
      hyperionLantern: { active: 0, unlocked: false }
    };

    baseTemps = { tropical: 200, temperate: 200, polar: 200, focus: 200 };
    global.terraforming = {
      temperature: { zones: {
        tropical: { value: baseTemps.tropical },
        temperate: { value: baseTemps.temperate },
        polar: { value: baseTemps.polar },
        focus: { value: baseTemps.focus },
      } },
      updateSurfaceTemperature() {
        for (const z of ['tropical','temperate','polar','focus']) {
          const rev = mirrorOversightSettings.assignments.reversalMode[z] ? -1 : 1;
          const m = mirrorOversightSettings.assignments.mirrors[z] || 0;
          const l = mirrorOversightSettings.assignments.lanterns[z] || 0;
          this.temperature.zones[z].value = baseTemps[z] + rev * m * 10 + l * 10;
        }
      },
    };
  });

  test('assigns mirrors by priority', () => {
    runAdvancedOversightAssignments();
    expect(mirrorOversightSettings.assignments.mirrors.tropical).toBe(3);
    expect(mirrorOversightSettings.assignments.mirrors.temperate).toBe(2);
    expect(mirrorOversightSettings.assignments.mirrors.polar).toBe(0);
  });

  test('uses lanterns when mirrors insufficient', () => {
    mirrorOversightSettings.targets = { tropical: 220, temperate: 0, polar: 0, focus: 0 };
    buildings.spaceMirror.active = 1;
    buildings.hyperionLantern = { active: 5, unlocked: true };
    mirrorOversightSettings.applyToLantern = true;

    runAdvancedOversightAssignments();

    expect(mirrorOversightSettings.assignments.mirrors.tropical).toBe(1);
    expect(mirrorOversightSettings.assignments.lanterns.tropical).toBe(1);
  });
  afterAll(() => {
    delete global.Project;
    delete global.projectElements;
  });
});
