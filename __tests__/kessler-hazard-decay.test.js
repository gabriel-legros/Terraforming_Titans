jest.mock('../src/js/terraforming/atmospheric-density.js', () => ({
  getAtmosphericDensityModel: () => ({
    getDensity: () => 1e-12,
    getDensities: (altitudes = []) => altitudes.map((_, index) => (index ? 5e-13 : 1e-12))
  })
}));

const path = require('path');
const { KesslerHazard } = require(path.join('..', 'src/js/terraforming/hazards/kesslerHazard.js'));

describe('Kessler hazard decay', () => {
  test('uses the max since zero below the drag line', () => {
    global.resources = {
      special: {
        orbitalDebris: {
          value: 10,
          initialValue: 10,
          unlocked: true,
          modifyRate: jest.fn()
        }
      }
    };

    const hazard = new KesslerHazard({ parameters: { kessler: {} } });
    hazard.periapsisDistribution = [
      { periapsisMeters: 0, massTons: 5, maxSinceZero: 10 },
      { periapsisMeters: 200000, massTons: 5, maxSinceZero: 10 }
    ];
    hazard.periapsisBaseline = [
      { periapsisMeters: 0, massTons: 5 },
      { periapsisMeters: 200000, massTons: 5 }
    ];

    const terraforming = {
      exosphereHeightMeters: 0,
      updateLuminosity: jest.fn(),
      _updateExosphereHeightCache: jest.fn()
    };

    const baseRate = 1 / 3600;
    const lowerDecayFraction = 1 - Math.exp(-baseRate * 1000);
    const upperDensityFactor = Math.log10(5e-13 / 1e-12) + 1;
    const upperDecayFraction = 1 - Math.exp(-(baseRate * upperDensityFactor) * 1000);

    hazard.update(1000, terraforming, { orbitalDebrisPerLand: 100 });

    const lowerRemoved = 5 - hazard.periapsisDistribution[0].massTons;
    const upperRemoved = 5 - hazard.periapsisDistribution[1].massTons;

    expect(lowerRemoved).toBeCloseTo(10 * lowerDecayFraction, 6);
    expect(upperRemoved).toBeCloseTo(5 * upperDecayFraction, 6);
  });
});
