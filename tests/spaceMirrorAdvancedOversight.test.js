global.Project = class {};
global.projectElements = {};
global.terraforming = { calculateMirrorEffect: () => ({ interceptedPower: 0, powerPerUnitArea: 0 }) };
const originalFormatNumber = global.formatNumber;
global.formatNumber = () => '';

const {
  setMirrorDistribution,
  distributeAssignmentsFromSliders,
  mirrorOversightSettings,
  toggleAdvancedOversight,
  resetMirrorOversightSettings,
} = require('../src/js/projects/SpaceMirrorFacilityProject.js');

// cleanup globals injected by module
delete global.Project;
delete global.projectElements;
delete global.terraforming;
if (originalFormatNumber !== undefined) global.formatNumber = originalFormatNumber; else delete global.formatNumber;
delete global.calculateZoneSolarFluxWithFacility;
delete global.mirrorOversightSettings;
delete global.setMirrorDistribution;
delete global.resetMirrorOversightSettings;
delete global.initializeMirrorOversightUI;
delete global.updateMirrorOversightUI;
delete global.updateZonalFluxTable;
delete global.applyFocusedMelt;
delete global.toggleFinerControls;
delete global.updateAssignmentDisplays;
delete global.toggleAdvancedOversight;

describe('advanced mirror oversight', () => {
  beforeEach(() => {
    global.buildings = { spaceMirror: { active: 10 } };
    resetMirrorOversightSettings();
  });

  afterEach(() => {
    delete global.buildings;
  });

  test('any zone assignments cleared when advanced oversight enabled', () => {
    setMirrorDistribution('any', 100);
    distributeAssignmentsFromSliders('mirrors');
    expect(mirrorOversightSettings.assignments.mirrors.any).toBe(10);
    toggleAdvancedOversight(true);
    distributeAssignmentsFromSliders('mirrors');
    expect(mirrorOversightSettings.assignments.mirrors.any).toBe(0);
  });
});
