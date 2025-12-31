const { estimateCoverage, estimateAmountForCoverage } = require('../src/js/terraforming/zones');

describe('coverage inversion', () => {
  test('estimateAmountForCoverage inverts estimateCoverage for liquid water', () => {
    const zoneArea = 5e14;
    const samples = [0, 0.05, 0.15, 0.5, 1];

    samples.forEach((coverage) => {
      const amount = estimateAmountForCoverage(coverage, zoneArea);
      const recovered = estimateCoverage(amount, zoneArea);
      expect(recovered).toBeCloseTo(coverage, 6);
    });
  });
});
