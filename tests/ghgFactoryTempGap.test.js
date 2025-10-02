const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const ghgFactorySettings = {
  autoDisableAboveTemp: false,
  disableTempThreshold: 283.15,
  reverseTempThreshold: 283.15,
};
function enforceGhgFactoryTempGap(changed) {
  const minGap = 1;
  const A = ghgFactorySettings.disableTempThreshold;
  let B = ghgFactorySettings.reverseTempThreshold;
  if (B === undefined || isNaN(B)) {
    B = A + minGap;
  }
  if (B - A < minGap) {
    if (changed === 'B') {
      ghgFactorySettings.disableTempThreshold = B - minGap;
    } else {
      B = A + minGap;
    }
  }
  ghgFactorySettings.reverseTempThreshold = B;
}

describe('GHG automation threshold gap enforcement', () => {
  beforeEach(() => {
    ghgFactorySettings.disableTempThreshold = 280;
    ghgFactorySettings.reverseTempThreshold = 281;
  });

  test('raises upper threshold when lower increases too close', () => {
    ghgFactorySettings.disableTempThreshold = 285;
    enforceGhgFactoryTempGap('A');
    expect(ghgFactorySettings.reverseTempThreshold).toBeCloseTo(286, 5);
  });

  test('lowers lower threshold when upper decreases too close', () => {
    ghgFactorySettings.reverseTempThreshold = 280;
    enforceGhgFactoryTempGap('B');
    expect(ghgFactorySettings.disableTempThreshold).toBeCloseTo(279, 5);
  });

  test('ensures minimum gap when called without parameter', () => {
    ghgFactorySettings.disableTempThreshold = 283;
    ghgFactorySettings.reverseTempThreshold = 283.2;
    enforceGhgFactoryTempGap();
    expect(
      ghgFactorySettings.reverseTempThreshold - ghgFactorySettings.disableTempThreshold
    ).toBeGreaterThanOrEqual(1);
  });
});
