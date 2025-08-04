global.Project = class {};
global.projectElements = {};
global.buildings = {};
global.terraforming = { calculateMirrorEffect: () => ({ interceptedPower: 0, powerPerUnitArea: 0 }) };
global.formatNumber = () => '';

const {
  setMirrorDistribution,
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
    setMirrorDistribution('tropical', 40);
    setMirrorDistribution('temperate', 30);
    setMirrorDistribution('focus', 10);
    mirrorOversightSettings.applyToLantern = true;
    expect(mirrorOversightSettings.distribution.tropical).toBeCloseTo(0.4);
    expect(mirrorOversightSettings.distribution.temperate).toBeCloseTo(0.3);
    expect(mirrorOversightSettings.distribution.focus).toBeCloseTo(0.1);
    expect(mirrorOversightSettings.applyToLantern).toBe(true);
  });

  test('reset restores defaults', () => {
    mirrorOversightSettings.distribution.tropical = 0.2;
    mirrorOversightSettings.distribution.temperate = 0.3;
    mirrorOversightSettings.distribution.polar = 0.4;
    mirrorOversightSettings.distribution.focus = 0.1;
    mirrorOversightSettings.applyToLantern = true;
    resetMirrorOversightSettings();
    expect(mirrorOversightSettings.distribution).toEqual({ tropical: 0, temperate: 0, polar: 0, focus: 0 });
    expect(mirrorOversightSettings.applyToLantern).toBe(false);
  });
});
