global.Project = class {};
global.projectElements = {};
global.buildings = {};
global.terraforming = { calculateMirrorEffect: () => ({ interceptedPower: 0, powerPerUnitArea: 0 }) };
global.formatNumber = () => '';

const {
  setMirrorFocusZone,
  setMirrorFocusPercentage,
  resetMirrorOversightSettings,
  mirrorOversightSettings
} = require('../src/js/projects/SpaceMirrorFacilityProject.js');

delete global.Project;
delete global.projectElements;
delete global.buildings;
delete global.terraforming;
delete global.formatNumber;

describe('mirror oversight settings', () => {
  test('setters modify settings', () => {
    setMirrorFocusZone('temperate');
    setMirrorFocusPercentage(50);
    mirrorOversightSettings.applyToLantern = true;
    expect(mirrorOversightSettings.zone).toBe('temperate');
    expect(mirrorOversightSettings.percentage).toBeCloseTo(0.5);
    expect(mirrorOversightSettings.applyToLantern).toBe(true);
  });

  test('reset restores defaults', () => {
    mirrorOversightSettings.zone = 'polar';
    mirrorOversightSettings.percentage = 0.8;
    mirrorOversightSettings.applyToLantern = true;
    resetMirrorOversightSettings();
    expect(mirrorOversightSettings.zone).toBe('tropical');
    expect(mirrorOversightSettings.percentage).toBe(0);
    expect(mirrorOversightSettings.applyToLantern).toBe(false);
  });
});
