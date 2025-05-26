const { getPlanetParameters } = require('../planet-parameters.js');
const { getZoneRatio, getZonePercentage } = require('../zones.js');
const EffectableEntity = require('../effectable-entity.js');
const lifeParameters = require('../life-parameters.js');
const physics = require('../physics.js');
const { calculateAverageCoverage } = require('../terraforming-utils.js');

// Expose globals expected by terraforming module
global.getZoneRatio = getZoneRatio;
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;
global.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
global.calculateEmissivity = physics.calculateEmissivity;
global.dayNightTemperaturesModel = physics.dayNightTemperaturesModel;
global.effectiveTemp = physics.effectiveTemp;
global.surfaceAlbedoMix = physics.surfaceAlbedoMix;

const Terraforming = require('../terraforming.js');

function createResources(config) {
  const res = {};
  for (const cat in config) {
    res[cat] = {};
    for (const name in config[cat]) {
      const val = config[cat][name].initialValue || 0;
      res[cat][name] = { value: val };
    }
  }
  return res;
}

function expectedTemperature(terra, params, resources) {
  const AU_METER = 149597870700;
  const distanceMeters = params.celestialParameters.distanceFromSun * AU_METER;
  const modifiedFlux = terra.calculateModifiedSolarFlux(distanceMeters);
  const groundAlbedo = terra.calculateEffectiveAlbedo();
  const rotation = params.celestialParameters.rotationPeriod || 24;
  const g = params.celestialParameters.gravity;

  let co2 = 0, h2o = 0, ch4 = 0, ghg = 0, inert = 0;
  for (const gas in resources.atmospheric) {
    const massKg = (resources.atmospheric[gas].value || 0) * 1000;
    if (gas === 'carbonDioxide') co2 += massKg;
    else if (gas === 'atmosphericWater') h2o += massKg;
    else if (gas === 'methane') ch4 += massKg;
    else if (gas === 'greenhouseGas') ghg += massKg;
    else inert += massKg;
  }
  const total = co2 + h2o + ch4 + ghg + inert;
  const pressurePa = physics.calculateAtmosphericPressure(total / 1000, g, params.celestialParameters.radius);
  const pressureBar = pressurePa / 100000;
  const composition = {};
  if (total > 0) {
    if (co2 > 0) composition.co2 = co2 / total;
    if (h2o > 0) composition.h2o = h2o / total;
    if (ch4 > 0) composition.ch4 = ch4 / total;
    if (ghg > 0) composition.greenhouseGas = ghg / total;
  }

  const surfaceFractions = {
    ocean: calculateAverageCoverage(terra, 'liquidWater'),
    ice: calculateAverageCoverage(terra, 'ice')
  };

  const temps = physics.dayNightTemperaturesModel({
    groundAlbedo,
    flux: modifiedFlux,
    rotationPeriodH: rotation,
    surfacePressureBar: pressureBar,
    composition,
    surfaceFractions,
    gSurface: g
  });
  return temps.mean;
}

describe('initial planetary temperatures', () => {
  test.each(['mars', 'titan'])('initial temperature for %s', planet => {
    const params = getPlanetParameters(planet);
    global.currentPlanetParameters = params;
    global.buildings = { spaceMirror: { surfaceArea: 0, active: 0 } };
    const res = createResources(params.resources);
    global.resources = res;
    const terra = new Terraforming(res, params.celestialParameters);
    terra.calculateInitialValues();
    const expected = expectedTemperature(terra, params, res);
    expect(terra.temperature.value).toBeCloseTo(expected, 5);
  });
});
