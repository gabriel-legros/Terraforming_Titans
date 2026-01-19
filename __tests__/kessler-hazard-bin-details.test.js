const path = require('path');

const {
  buildKesslerBinDetailText
} = require(path.join('..', 'src/js/terraforming/hazards/kesslerHazardUI.js'));

describe('Kessler hazard bin detail text', () => {
  test('includes decay rate and density on the bin detail line', () => {
    const text = buildKesslerBinDetailText({
      altitudeKm: 250,
      current: 12.5,
      baseline: 20,
      decayRate: 0.01234,
      density: 1e-12
    });

    expect(text).toContain('Bin @ 250.0 km');
    expect(text).toContain('12.50 / 20.00 t');
    expect(text).toContain('0.0123 t/s');
    expect(text).toContain('kg/m^3');
  });
});
