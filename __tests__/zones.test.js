const { getZonePercentage } = require('../zones.js');

describe('getZonePercentage', () => {
  test('global returns 1', () => {
    expect(getZonePercentage('global')).toBeCloseTo(1, 5);
  });

  test('invalid zone returns 0', () => {
    expect(getZonePercentage('nowhere')).toBe(0);
  });

  test('regional percentages sum to 1', () => {
    const sum = ['tropical','temperate','polar'].reduce((a,z) => a + getZonePercentage(z), 0);
    expect(sum).toBeCloseTo(1, 5);
  });
});
