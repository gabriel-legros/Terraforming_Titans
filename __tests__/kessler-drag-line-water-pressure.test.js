const { KesslerHazard } = require('../src/js/terraforming/hazards/kesslerHazard.js');

const SOLAR_FLUX_W_M2 = 1100;
const SURFACE_GRAVITY_M_S2 = 7;
const PLANET_RADIUS_M = 6_371_000;
const ORBITAL_DEBRIS_TONS = 1000;

function createTerraformingForWaterPressurePa(waterPressurePa, options = {}) {
  const useTerraformingPressureSource = options.useTerraformingPressureSource === true;
  const surfaceAreaM2 = 4 * Math.PI * PLANET_RADIUS_M * PLANET_RADIUS_M;
  const atmosphericMassKg = (waterPressurePa * surfaceAreaM2) / SURFACE_GRAVITY_M_S2;
  const atmosphericWaterTons = atmosphericMassKg / 1000;

  const resources = {
    atmospheric: {
      atmosphericWater: { value: atmosphericWaterTons }
    },
    special: {
      orbitalDebris: {
        value: ORBITAL_DEBRIS_TONS,
        initialValue: ORBITAL_DEBRIS_TONS,
        modifyRate() {}
      }
    }
  };

  const terraforming = {
    resources,
    celestialParameters: {
      gravity: SURFACE_GRAVITY_M_S2,
      radius: PLANET_RADIUS_M / 1000
    },
    luminosity: {
      modifiedSolarFluxUnpenalized: SOLAR_FLUX_W_M2
    },
    temperature: {
      value: 220
    },
    exosphereHeightMeters: 0
  };

  if (useTerraformingPressureSource) {
    terraforming.calculateTotalPressure = () => waterPressurePa / 1000;
  }

  return terraforming;
}

function measureDragLineAltitudeMeters(waterPressurePa, options = {}) {
  const terraforming = createTerraformingForWaterPressurePa(waterPressurePa, options);
  global.resources = terraforming.resources;

  const hazard = new KesslerHazard({
    parameters: {
      kessler: {}
    }
  });

  hazard.update(1, terraforming, {});
  return hazard.getDecaySummary().dragThresholdHeightMeters;
}

describe('Kessler drag line altitude for low-pressure water-only atmospheres', () => {
  const originalResources = global.resources;

  afterEach(() => {
    global.resources = originalResources;
  });

  it('matches the current drag-line altitude profile for 1-4 Pa water at 1.1 kW/m^2, 7 m/s^2 gravity, and 220 K', () => {
    const pressuresPa = [1, 2, 3, 4];
    const dragLineAltitudes = pressuresPa.map(measureDragLineAltitudeMeters);

    dragLineAltitudes.forEach((altitude) => {
      expect(Number.isFinite(altitude)).toBe(true);
      expect(altitude).toBeGreaterThan(0);
    });

    for (let i = 1; i < dragLineAltitudes.length; i += 1) {
      expect(dragLineAltitudes[i]).toBeGreaterThanOrEqual(dragLineAltitudes[i - 1]);
    }

    expect(dragLineAltitudes).toEqual([
      65450.37031173706,
      65650.04587173462,
      66448.74811172485,
      67149.1026878357
    ]);
  });

  it('keeps drag-line behavior consistent when pressure comes from terraforming.calculateTotalPressure()', () => {
    const pressuresPa = [1, 2, 3, 4, 5, 10, 20, 50, 100];
    const dragLineAltitudesFromCalcPressure = pressuresPa.map((pressurePa) => measureDragLineAltitudeMeters(
      pressurePa,
      { useTerraformingPressureSource: true }
    ));
    const dragLineAltitudesFromMassPressure = pressuresPa.map((pressurePa) => measureDragLineAltitudeMeters(
      pressurePa
    ));

    dragLineAltitudesFromCalcPressure.forEach((altitude) => {
      expect(Number.isFinite(altitude)).toBe(true);
      expect(altitude).toBeGreaterThan(0);
    });

    expect(dragLineAltitudesFromCalcPressure).toEqual([
      65450.37031173706,
      65650.04587173462,
      66448.74811172485,
      67149.1026878357,
      67551.43404006958,
      69050.49085617065,
      70549.54767227173,
      69250.16641616821,
      69250.16641616821
    ]);
    expect(dragLineAltitudesFromCalcPressure).toEqual(dragLineAltitudesFromMassPressure);
  });
});
