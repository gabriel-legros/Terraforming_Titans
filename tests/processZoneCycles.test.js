global.C_P_AIR = 1004;
global.EPSILON = 0.622;

const water = require('../src/js/terraforming/water-cycle.js');
const hydro = require('../src/js/terraforming/hydrocarbon-cycle.js');
const dryIce = require('../src/js/terraforming/dry-ice-cycle.js');

const { waterCycle } = water;
const { methaneCycle } = hydro;
const { co2Cycle } = dryIce;

describe('water cycle processZone', () => {
  test('conserves mass under evaporation', () => {
    const changes = waterCycle.processZone({
      zoneArea: 1,
      liquidWaterCoverage: 1,
      iceCoverage: 0,
      dayTemperature: 300,
      nightTemperature: 290,
      zoneTemperature: 295,
      atmPressure: 100000,
      vaporPressure: 1000,
      availableLiquid: 10,
      availableIce: 0,
      availableBuriedIce: 0,
      zonalSolarFlux: 200,
      durationSeconds: 1,
      gravity: 3.7,
    });
    expect(changes.atmosphere.water).toBeGreaterThan(0);
    const total = changes.atmosphere.water + changes.water.liquid + changes.water.ice + changes.water.buriedIce;
    expect(total).toBeCloseTo(0, 6);
  });

  test('records precipitation potential without altering water stores', () => {
    const changes = waterCycle.processZone({
      zoneArea: 1,
      liquidWaterCoverage: 0,
      iceCoverage: 0,
      dayTemperature: 260,
      nightTemperature: 250,
      zoneTemperature: 255,
      atmPressure: 100000,
      vaporPressure: 1000,
      availableLiquid: 0,
      availableIce: 0,
      availableBuriedIce: 0,
      zonalSolarFlux: 0,
      durationSeconds: 1,
      gravity: 3.7,
    });
    expect(changes.precipitation.potentialSnow).toBeGreaterThan(0);
    expect(changes.water.liquid).toBeCloseTo(0, 6);
    expect(changes.water.ice).toBeCloseTo(0, 6);
  });
});

describe('methane cycle processZone', () => {
  test('conserves mass under evaporation', () => {
    const changes = methaneCycle.processZone({
      zoneArea: 1,
      liquidMethaneCoverage: 1,
      hydrocarbonIceCoverage: 0,
      dayTemperature: 110,
      nightTemperature: 100,
      zoneTemperature: 105,
      atmPressure: 100000,
      vaporPressure: 1000,
      availableLiquid: 10,
      availableIce: 0,
      availableBuriedIce: 0,
      zonalSolarFlux: 200,
      durationSeconds: 1,
      gravity: 1,
    });
    expect(changes.atmosphere.methane).toBeGreaterThan(0);
    const total = changes.atmosphere.methane + changes.methane.liquid + changes.methane.ice + changes.methane.buriedIce;
    expect(total).toBeCloseTo(0, 6);
  });

  test('returns process amounts', () => {
    const changes = methaneCycle.processZone({
      zoneArea: 1,
      liquidMethaneCoverage: 0.5,
      hydrocarbonIceCoverage: 0.5,
      dayTemperature: 110,
      nightTemperature: 90,
      zoneTemperature: 100,
      atmPressure: 100000,
      vaporPressure: 1000,
      availableLiquid: 5,
      availableIce: 5,
      availableBuriedIce: 0,
      zonalSolarFlux: 200,
      durationSeconds: 1,
      gravity: 1,
    });
    expect(changes).toHaveProperty('evaporationAmount');
    expect(changes).toHaveProperty('sublimationAmount');
    expect(changes).toHaveProperty('meltAmount');
    expect(changes).toHaveProperty('freezeAmount');
  });

  test('records condensation potential without altering methane stores', () => {
    const changes = methaneCycle.processZone({
      zoneArea: 1,
      liquidMethaneCoverage: 0,
      hydrocarbonIceCoverage: 0,
      dayTemperature: 80,
      nightTemperature: 70,
      zoneTemperature: 75,
      atmPressure: 150000,
      vaporPressure: 100000,
      availableLiquid: 0,
      availableIce: 0,
      availableBuriedIce: 0,
      zonalSolarFlux: 0,
      durationSeconds: 1,
      gravity: 1,
      condensationParameter: 1,
    });
    const potential = changes.precipitation.potentialMethaneRain + changes.precipitation.potentialMethaneSnow;
    expect(potential).toBeGreaterThan(0);
    expect(changes.methane.liquid).toBeCloseTo(0, 6);
    expect(changes.methane.ice).toBeCloseTo(0, 6);
  });
});

describe('CO2 cycle processZone', () => {
  test('conserves mass under sublimation', () => {
    const changes = co2Cycle.processZone({
      zoneArea: 1,
      dryIceCoverage: 1,
      dayTemperature: 210,
      nightTemperature: 200,
      zoneTemperature: 210,
      atmPressure: 100000,
      vaporPressure: 100,
      availableIce: 10,
      zonalSolarFlux: 200,
      durationSeconds: 1,
    });
    expect(changes.atmosphere.co2).toBeGreaterThan(0);
    const total = changes.atmosphere.co2 + (changes.co2.ice || 0);
    expect(total).toBeCloseTo(0, 6);
    expect(changes).toHaveProperty('sublimationAmount');
  });

  test('records condensation potential without altering dry ice', () => {
    const changes = co2Cycle.processZone({
      zoneArea: 1,
      dryIceCoverage: 0,
      dayTemperature: 180,
      nightTemperature: 170,
      zoneTemperature: 175,
      atmPressure: 100000,
      vaporPressure: 100000,
      availableIce: 0,
      zonalSolarFlux: 0,
      durationSeconds: 1,
      condensationParameter: 1,
    });
    expect(changes.potentialCO2Condensation).toBeGreaterThan(0);
    expect(changes.co2.ice).toBeCloseTo(0, 6);
  });
});

