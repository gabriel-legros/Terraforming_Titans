global.t = (_key, _vars, fallback) => fallback;
const { waterCycle, boilingPointWater } = require('../src/js/terraforming/water-cycle');
const { getZones, ZONES } = require('../src/js/terraforming/zones');
const { calculateAtmosphericOxidation } = require('../src/js/terraforming/atmospheric-chemistry');

const phases = ['liquidWater', 'ice', 'buriedIce'];
const sum = values => values.reduce((a, b) => a + b, 0);

describe('closed water budgets during competing phase changes', () => {
  test.each([
    ['ice melts on a warm world', 295, 100000, 'meltAmount'],
    ['ice sublimates rapidly below the triple pressure', 295, 300, 'rapidSublimationAmount'],
    ['cold liquid freezes', 235, 100000, 'freezeAmount'],
    ['liquid boils in a thin atmosphere', 320, 2000, 'boilingAmount'],
    ['sunlit liquid evaporates', 278, 100000, 'evaporationAmount'],
    ['exposed ice sublimates in dry air', 260, 100000, 'sublimationAmount']
  ])('%s', (_label, temperature, pressure, activeProcess) => {
    const before = { liquidWater: 1200, ice: 5, buriedIce: 300 };
    const result = waterCycle.processZone({
      zoneArea: 1e5, liquidWaterCoverage: 0.5, iceCoverage: 0.4,
      dayTemperature: temperature + 4, nightTemperature: temperature - 4, zoneTemperature: temperature,
      atmPressure: pressure, boilingPoint: boilingPointWater(pressure), vaporPressure: 0,
      zonalSolarFlux: 315, durationSeconds: 800, phaseChangeHeatEnabled: true,
      availableLiquid: before.liquidWater, availableIce: before.ice, availableBuriedIce: before.buriedIce
    });
    expect(result[activeProcess]).toBeGreaterThan(0);
    const deltas = phases.map(phase => result.water[phase] ?? 0);
    for (const [i, phase] of phases.entries()) {
      expect(before[phase] + deltas[i]).toBeGreaterThanOrEqual(-1e-10);
    }
    expect(sum(deltas) + result.atmosphere.water).toBeCloseTo(0, 9);
    // The heat solver can partially reverse an individual transition. Its
    // per-ton adjustments must independently balance at any accepted fraction.
    expect(result.phaseTransitions.length).toBeGreaterThan(0);
    for (const transition of result.phaseTransitions) {
      expect(sum(transition.adjustments.map(edge => edge.perTon))).toBeCloseTo(0, 12);
    }
  });

  test.each([
    ['dry atmosphere', 0, 0], ['evaporation funds remote snow', 0, 6],
    ['partial rain and snow', 7, 6], ['exactly enough vapor', 14, 6],
    ['excess vapor stays airborne', 50, 6]
  ])('shared precipitation budget — %s', (_label, vapor, evaporated) => {
    const changes = {};
    const rain = [8, 2, 0];
    const snow = [0, 3, 7];
    ZONES.forEach((zone, i) => {
      const localEvaporation = i === 0 ? evaporated : 0;
      changes[zone] = {
        water: { liquidWater: -localEvaporation, ice: 0 },
        atmosphere: { water: localEvaporation - rain[i] - snow[i] },
        precipitation: { potentialRain: rain[i], potentialSnow: snow[i] }
      };
    });
    const { totalAtmosphericChange, totalsByProcess } = waterCycle.finalizeAtmosphere({
      available: vapor, zonalChanges: changes, atmosphereKey: 'water', processes: waterCycle.finalizeProcesses
    });
    const expectedPrecipitation = Math.min(20, vapor + evaporated);
    const fraction = expectedPrecipitation / 20;
    expect(totalsByProcess.rainfall + totalsByProcess.snowfall).toBeCloseTo(expectedPrecipitation, 12);
    expect(vapor + totalAtmosphericChange).toBeCloseTo(vapor + evaporated - expectedPrecipitation, 12);
    ZONES.forEach((zone, i) => {
      const { water, precipitation, atmosphere } = changes[zone];
      expect(precipitation.rain).toBeCloseTo(rain[i] * fraction, 12);
      expect(precipitation.snow).toBeCloseTo(snow[i] * fraction, 12);
      expect(water.liquidWater + water.ice + atmosphere.water).toBeCloseTo(0, 12);
    });
  });
});

describe('water produced by atmospheric chemistry', () => {
  beforeAll(() => { global.KG_PER_TON = terraformingParameters.physical.kgPerTon; });
  afterAll(() => { delete global.KG_PER_TON; });

  // Formula-unit quantities use a common mass scale. Water can increase here,
  // so audit the atoms exchanged with the other gases as well as total mass.
  test.each([
    ['hydrogen oxidation', 5, 0, 0, 5],
    ['methane oxidation', 0, 9, 0, 20],
    ['ammonia oxidation', 0, 0, 4, 6],
    ['all three fuels compete for scarce oxygen', 3, 7, 4, 1],
    ['oxygen exhausted', 3, 7, 4, 0]
  ])('%s', (_label, h2, ch4, nh3, o2) => {
    const weights = terraformingParameters.atmosphere.molecularWeightGPerMol;
    const availableByKey = {
      hydrogen: h2 * weights.H2, atmosphericMethane: ch4 * weights.CH4,
      atmosphericAmmonia: nh3 * weights.NH3, oxygen: o2 * weights.O2
    };
    const pressureByKey = { hydrogen: 1000 * h2, atmosphericMethane: 1000 * ch4,
      atmosphericAmmonia: 1000 * nh3, oxygen: 1000 * o2 };
    const { changes } = calculateAtmosphericOxidation({
      availableByKey, pressureByKey, atmosphericPressurePa: sum(Object.values(pressureByKey)),
      surfaceArea: 1e10, durationSeconds: 86400, surfaceTemperatureK: 900, waterCloudActivity: 0
    });
    for (const [gas, initial] of Object.entries(availableByKey)) {
      expect(initial + (changes[gas] ?? 0)).toBeGreaterThanOrEqual(-1e-10);
      if (initial > 0 && o2 > 0) expect(changes[gas]).toBeLessThan(0);
    }
    const water = (changes.atmosphericWater ?? 0) / weights.H2O;
    if (o2 === 0) expect(water).toBe(0);
    else expect(water).toBeGreaterThan(0);
    const hydrogen = (changes.hydrogen ?? 0) / weights.H2;
    const methane = (changes.atmosphericMethane ?? 0) / weights.CH4;
    const ammonia = (changes.atmosphericAmmonia ?? 0) / weights.NH3;
    const oxygen = (changes.oxygen ?? 0) / weights.O2;
    const carbonDioxide = (changes.carbonDioxide ?? 0) / weights.CO2;
    expect(2 * water + 2 * hydrogen + 4 * methane + 3 * ammonia).toBeCloseTo(0, 11);
    expect(water + 2 * oxygen + 2 * carbonDioxide).toBeCloseTo(0, 11);
    expect(sum(Object.values(changes))).toBeCloseTo(0, 9);
    if (o2 < 0.5 * h2 + 2 * ch4 + 0.75 * nh3) expect(o2 + oxygen).toBeCloseTo(0, 10);
  });
});

describe('water moving across climate zones', () => {
  beforeAll(() => {
    global.getZones = getZones;
    global.currentPlanetParameters = {};
    global.isEquilibrating = true;
  });
  afterAll(() => {
    delete global.getZones;
    delete global.currentPlanetParameters;
    delete global.isEquilibrating;
  });

  test.each([
    ['melts to liquid at both glacier margins', 100000, [295, 260, 305], 'flowMelt'],
    ['sublimates at warm glacier margins in thin air', 300, [295, 260, 305], 'rapidSublimation'],
    ['runoff freezes at both cold destinations', 100000, [250, 290, 240], 'freezeOut']
  ])('%s', (_label, pressure, temperatures, expectedProcess) => {
    const surface = {
      liquidWater: { tropical: 0, temperate: 800, polar: 0 },
      ice: { tropical: 0, temperate: 400, polar: 0 },
      buriedIce: { tropical: 25, temperate: 100, polar: 75 }
    };
    const world = {
      zonalSurface: surface,
      celestialParameters: { radius: 0.01, surfaceArea: 4 * Math.PI * 10 ** 2 },
      atmosphericPressureCache: { totalPressure: pressure }
    };
    const temp = Object.fromEntries(ZONES.map((zone, i) => [zone, temperatures[i]]));
    const { changes, totals, phaseTransitions } = waterCycle.surfaceFlowFn(world, 86400, temp);
    expect(totals[expectedProcess]).toBeGreaterThan(0);
    expect(new Set(phaseTransitions.filter(p => p.totalKey === expectedProcess).map(p => p.target)))
      .toEqual(new Set(['tropical', 'polar']));
    let surfaceChange = 0;
    for (const zone of ZONES) {
      for (const phase of phases) {
        expect(surface[phase][zone] + changes[zone][phase]).toBeGreaterThanOrEqual(-1e-10);
        surfaceChange += changes[zone][phase];
      }
      expect(changes[zone].buriedIce).toBe(0);
    }
    expect(surfaceChange + totals.totalAtmosphericChange).toBeCloseTo(0, 9);
  });
});
