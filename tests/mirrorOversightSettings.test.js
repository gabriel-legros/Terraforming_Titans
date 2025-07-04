const {
  setMirrorFocusZone,
  setMirrorFocusPercentage,
  resetMirrorOversightSettings,
  mirrorOversightSettings
} = require('../src/js/mirrorOversight.js');

describe('mirror oversight settings', () => {
  test('setters modify settings', () => {
    setMirrorFocusZone('temperate');
    setMirrorFocusPercentage(50);
    expect(mirrorOversightSettings.zone).toBe('temperate');
    expect(mirrorOversightSettings.percentage).toBeCloseTo(0.5);
  });

  test('reset restores defaults', () => {
    mirrorOversightSettings.zone = 'polar';
    mirrorOversightSettings.percentage = 0.8;
    resetMirrorOversightSettings();
    expect(mirrorOversightSettings.zone).toBe('tropical');
    expect(mirrorOversightSettings.percentage).toBe(0);
  });
});
