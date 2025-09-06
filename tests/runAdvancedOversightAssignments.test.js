global.Project = class {};
global.projectElements = {};
const { SpaceMirrorFacilityProject, runAdvancedOversightAssignments } = require('../src/js/projects/SpaceMirrorFacilityProject.js');
const project = new SpaceMirrorFacilityProject({ name: 'Mirror', cost: {}, duration: 0 }, 'spaceMirrorFacility');
const mirrorOversightSettings = project.mirrorOversightSettings;

describe('runAdvancedOversightAssignments', () => {
  let baseTemps;
  beforeEach(() => {
    mirrorOversightSettings.advancedOversight = true;
    mirrorOversightSettings.applyToLantern = false;
    mirrorOversightSettings.targets = { tropical: 230, temperate: 220, polar: 0, water: 0 };
    mirrorOversightSettings.priority = { tropical: 1, temperate: 2, polar: 3, focus: 4 };
    mirrorOversightSettings.assignments.mirrors = { tropical: 0, temperate: 0, polar: 0, focus: 0, unassigned: 0, any: 0 };
    mirrorOversightSettings.assignments.lanterns = { tropical: 0, temperate: 0, polar: 0, focus: 0, unassigned: 0, any: 0 };
    mirrorOversightSettings.assignments.reversalMode = { tropical: false, temperate: false, polar: false, focus: false, any: false };
    mirrorOversightSettings.tempMode = { tropical: 'average', temperate: 'average', polar: 'average' };

    global.buildings = {
      spaceMirror: { active: 5 },
      hyperionLantern: { active: 0, unlocked: false, powerPerBuilding: 250000, productivity: 1 }
    };
    baseTemps = {
      tropical: { value: 200, day: 210, night: 190 },
      temperate: { value: 200, day: 210, night: 190 },
      polar: { value: 200, day: 210, night: 190 },
      focus: { value: 200, day: 210, night: 190 }
    };
    global.terraforming = {
      temperature: {
        value: 200,
        zones: {
          tropical: { value: baseTemps.tropical.value, day: baseTemps.tropical.day, night: baseTemps.tropical.night },
          temperate: { value: baseTemps.temperate.value, day: baseTemps.temperate.day, night: baseTemps.temperate.night },
          polar: { value: baseTemps.polar.value, day: baseTemps.polar.day, night: baseTemps.polar.night },
          focus: { value: baseTemps.focus.value, day: baseTemps.focus.day, night: baseTemps.focus.night },
        }
      },
      calculateMirrorEffect() {
        return { interceptedPower: 250000 };
      },
      updateSurfaceTemperature() {
        for (const z of ['tropical','temperate','polar','focus']) {
          const rev = mirrorOversightSettings.assignments.reversalMode[z] ? -1 : 1;
          const m = mirrorOversightSettings.assignments.mirrors[z] || 0;
          const l = mirrorOversightSettings.assignments.lanterns[z] || 0;
          const delta = rev * m * 10 + l * 10;
          this.temperature.zones[z].value = baseTemps[z].value + delta;
          this.temperature.zones[z].day = baseTemps[z].day + delta;
          this.temperature.zones[z].night = baseTemps[z].night + delta;
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
    mirrorOversightSettings.targets = { tropical: 220, temperate: 0, polar: 0, water: 0 };
    buildings.spaceMirror.active = 1;
    buildings.hyperionLantern = { active: 5, unlocked: true, powerPerBuilding: 250000, productivity: 1 };
    mirrorOversightSettings.applyToLantern = true;

    runAdvancedOversightAssignments();

    expect(mirrorOversightSettings.assignments.mirrors.tropical).toBe(1);
    expect(mirrorOversightSettings.assignments.lanterns.tropical).toBe(1);
  });

  test('uses selected temperature mode', () => {
    mirrorOversightSettings.targets = { tropical: 195, temperate: 0, polar: 0, water: 0 };
    mirrorOversightSettings.tempMode = { tropical: 'night', temperate: 'average', polar: 'average' };
    runAdvancedOversightAssignments();
    expect(mirrorOversightSettings.assignments.reversalMode.tropical).toBe(false);
    mirrorOversightSettings.tempMode.tropical = 'day';
    runAdvancedOversightAssignments();
    expect(mirrorOversightSettings.assignments.reversalMode.tropical).toBe(true);
  });

  test('prioritizes water focusing and uses lanterns when needed', () => {
    mirrorOversightSettings.priority = { tropical: 2, temperate: 3, polar: 4, focus: 1 };
    mirrorOversightSettings.targets = { tropical: 230, temperate: 0, polar: 0, water: 0.001 };
    mirrorOversightSettings.applyToLantern = true;
    buildings.spaceMirror.active = 1;
    buildings.hyperionLantern.active = 5;

    runAdvancedOversightAssignments();

    expect(mirrorOversightSettings.assignments.mirrors.focus).toBe(1);
    expect(mirrorOversightSettings.assignments.lanterns.focus).toBe(1);
    // Remaining mirrors go to tropical but are insufficient to reach target fully
    expect(mirrorOversightSettings.assignments.mirrors.tropical).toBe(0);
  });
  afterAll(() => {
    delete global.Project;
    delete global.projectElements;
  });
});
