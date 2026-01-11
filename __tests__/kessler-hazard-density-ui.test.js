const path = require('path');

const {
  buildDensityGradient
} = require(path.join('..', 'src/js/terraforming/hazards/kesslerHazardUI.js'));

describe('Kessler hazard density gradient UI', () => {
  test('builds a gradient string from density bins', () => {
    const gradient = buildDensityGradient([1e-16, 1e-12, 1e-9], 3);
    expect(gradient).toContain('linear-gradient(90deg');
    expect(gradient).toContain('rgb(');
  });
});
