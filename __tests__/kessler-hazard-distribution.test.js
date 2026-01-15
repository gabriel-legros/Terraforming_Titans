jest.mock('../src/js/terraforming/atmospheric-density.js', () => ({
  getAtmosphericDensityModel: () => ({
    getDensity: (altitudeMeters) => {
      const scale = 50000;
      return 1e-9 * Math.exp(-altitudeMeters / scale);
    }
  })
}));

const path = require('path');
const { KesslerHazard } = require(path.join('..', 'src/js/terraforming/hazards/kesslerHazard.js'));

describe('Kessler hazard distribution bins', () => {
  test('spans from 0 to mean + 3 sigma with density-based center', () => {
    global.resources = {
      special: {
        orbitalDebris: {
          value: 0,
          initialValue: 0,
          unlocked: false,
          modifyRate: jest.fn()
        }
      }
    };

    const hazard = new KesslerHazard({ parameters: { kessler: {} } });
    const terraforming = {
      exosphereHeightMeters: 0,
      updateLuminosity: jest.fn(),
      _updateExosphereHeightCache: jest.fn()
    };

    hazard.ensurePeriapsisDistribution(terraforming, {}, 100);
    const distribution = hazard.periapsisDistribution;
    expect(distribution.length).toBe(64);
    expect(distribution[0].periapsisMeters).toBeCloseTo(0, 6);

    const scale = 50000;
    const mean = scale * Math.log(1e-9 / 1e-13);
    const sigma = mean - scale * Math.log(1e-9 / 1e-12);
    const expectedMax = mean + sigma * 3;
    expect(distribution[distribution.length - 1].periapsisMeters).toBeCloseTo(expectedMax, 0);
  });

  test('removes debris from the lowest bins when total mass shrinks', () => {
    global.resources = {
      special: {
        orbitalDebris: {
          value: 15,
          initialValue: 15,
          unlocked: true,
          modifyRate: jest.fn()
        }
      }
    };

    const hazard = new KesslerHazard({ parameters: { kessler: {} } });
    hazard.periapsisDistribution = [
      { periapsisMeters: 0, massTons: 5 },
      { periapsisMeters: 10, massTons: 5 },
      { periapsisMeters: 20, massTons: 5 }
    ];
    hazard.periapsisBaseline = [
      { periapsisMeters: 0, massTons: 5 },
      { periapsisMeters: 10, massTons: 5 },
      { periapsisMeters: 20, massTons: 5 }
    ];

    const terraforming = {
      exosphereHeightMeters: 0,
      updateLuminosity: jest.fn(),
      _updateExosphereHeightCache: jest.fn()
    };

    hazard.syncDistributionToResource(terraforming, {}, 10);

    expect(hazard.periapsisDistribution[0].massTons).toBe(0);
    expect(hazard.periapsisDistribution[1].massTons).toBe(5);
    expect(hazard.periapsisDistribution[2].massTons).toBe(5);
  });
});
