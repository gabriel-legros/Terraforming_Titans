const originalT = global.t;
global.t = (path, vars, fallback) => fallback;

const { KesslerHazard } = require('../src/js/terraforming/hazards/kesslerHazard.js');
const { JSDOM } = require('jsdom');

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

function createDynamicRadiusTerraforming() {
  const terraforming = createTerraformingForWaterPressurePa(10);
  terraforming.baseRadius = 5000;
  terraforming.initialCelestialParameters = {
    baseRadius: 5000,
    radius: 6500
  };
  terraforming.celestialParameters.baseRadius = 5000;
  terraforming.celestialParameters.radius = 6500;
  return terraforming;
}

describe('Kessler drag line altitude for low-pressure water-only atmospheres', () => {
  const originalResources = global.resources;

  afterAll(() => {
    global.t = originalT;
  });

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

  it('anchors Kessler debris to the initialized radius on dynamic-radius worlds', () => {
    const terraforming = createDynamicRadiusTerraforming();
    global.resources = terraforming.resources;

    const hazard = new KesslerHazard({
      parameters: {
        kessler: {}
      }
    });

    hazard.update(1, terraforming, {});

    const distribution = hazard.getPeriapsisDistribution();
    const baseline = hazard.getPeriapsisBaseline();
    expect(distribution.length).toBeGreaterThan(0);
    expect(distribution[0].referenceRadiusKm).toBe(6500);
    expect(baseline[0].referenceRadiusKm).toBe(6500);
  });

  it('rebases old base-radius Kessler distributions on dynamic-radius worlds', () => {
    const terraforming = createDynamicRadiusTerraforming();
    global.resources = terraforming.resources;

    const hazard = new KesslerHazard({
      parameters: {
        kessler: {}
      }
    });
    hazard.load({
      periapsisDistribution: [
        {
          periapsisMeters: 10000,
          referenceRadiusKm: 5000,
          massTons: ORBITAL_DEBRIS_TONS,
          maxSinceZero: ORBITAL_DEBRIS_TONS
        }
      ],
      periapsisBaseline: [
        {
          periapsisMeters: 10000,
          referenceRadiusKm: 5000,
          massTons: ORBITAL_DEBRIS_TONS
        }
      ]
    });

    hazard.update(1, terraforming, {});

    expect(hazard.getPeriapsisDistribution()[0].referenceRadiusKm).toBe(6500);
    expect(hazard.getPeriapsisBaseline()[0].referenceRadiusKm).toBe(6500);
  });
});

describe('Kessler decay-rate display', () => {
  const originalGlobals = {
    document: global.document,
    formatNumber: global.formatNumber,
    formatScientific: global.formatScientific,
    hazardManager: global.hazardManager,
    resources: global.resources,
    t: global.t,
    terraforming: global.terraforming,
    window: global.window
  };

  afterEach(() => {
    Object.assign(global, originalGlobals);
  });

  it('sums the rendered bin decay rates to the orbital-debris resource rate', () => {
    const dom = new JSDOM('<div id="hazard-terraforming"></div>');
    const displayedValues = [];
    global.window = dom.window;
    global.document = dom.window.document;
    global.t = (key, vars, fallback) => {
      if (key.endsWith('.chart.binDetail') || key.endsWith('.summary.debrisDecay')) {
        displayedValues.push({ key, vars });
      }
      return fallback.replace(/\{(\w+)\}/g, (match, name) => vars[name]);
    };
    global.formatNumber = value => Number(value).toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
    global.formatScientific = (value, decimals) => Number(value).toExponential(decimals);

    const terraforming = createTerraformingForWaterPressurePa(100);
    let resourceDecayRate = 0;
    terraforming.resources.special.orbitalDebris.modifyRate = (value, source, type) => {
      if (source === 'Debris decay' && type === 'hazard') {
        resourceDecayRate = -value;
      }
    };
    global.resources = terraforming.resources;
    global.terraforming = terraforming;
    global.hazardManager = {
      parameters: {
        kessler: { orbitalDebrisPerLand: 100 }
      }
    };
    global.hazardManager.kesslerHazard = new KesslerHazard(global.hazardManager);
    global.hazardManager.kesslerHazard.update(60, terraforming, global.hazardManager.parameters.kessler);
    expect(global.hazardManager.kesslerHazard.save().periapsisDistribution[0].lastDecayTonsPerSecond).toBeUndefined();

    const { updateKesslerHazardUI } = require('../src/js/terraforming/hazards/kesslerHazardUI.js');
    updateKesslerHazardUI(global.hazardManager.parameters.kessler);
    dom.window.document.querySelectorAll('.kessler-debris-chart__bar').forEach((bar) => {
      bar.dispatchEvent(new dom.window.MouseEvent('mouseenter'));
    });

    const binDecayRate = displayedValues
      .filter(entry => entry.key.endsWith('.chart.binDetail'))
      .reduce((total, entry) => total + Number(entry.vars.decay), 0);
    const summaryDecayRate = Number(
      displayedValues.find(entry => entry.key.endsWith('.summary.debrisDecay')).vars.rate
    );

    expect(binDecayRate).toBeCloseTo(resourceDecayRate, 8);
    expect(summaryDecayRate).toBeCloseTo(resourceDecayRate, 8);
  });
});
