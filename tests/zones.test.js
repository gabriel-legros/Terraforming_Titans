const { getZonePercentage, estimateCoverage } = require('../src/js/zones.js');

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

describe('estimateCoverage', () => {
  test('returns 0 with no amount', () => {
    expect(estimateCoverage(0, 100)).toBe(0);
  });

  test('caps at 1 for high ratio', () => {
    expect(estimateCoverage(1e8, 1)).toBeCloseTo(1, 5);
  });
});
