jest.mock('../src/js/terraforming/hydrology.js', () => ({
  simulateSurfaceHydrocarbonFlow: jest.fn(),
}));

global.C_P_AIR = 1004;
global.EPSILON = 0.622;

const { MethaneCycle } = require('../src/js/terraforming/hydrocarbon-cycle.js');

test('methane processZone converts forbidden melt to rapid sublimation', () => {
  const mc = new MethaneCycle();
  mc.evaporationRate = () => 0;
  mc.sublimationRate = () => 0;
  mc.condensationRateFactor = () => ({ liquidRate: 0, iceRate: 0 });
  mc.meltingFreezingRates = () => ({ meltingRate: 2, freezingRate: 0 });
  const result = mc.processZone({
    zoneArea: 1,
    hydrocarbonIceCoverage: 1,
    liquidMethaneCoverage: 0,
    zoneTemperature: 95,
    atmPressure: 50000,
    vaporPressure: 0,
    availableIce: 5,
    availableBuriedIce: 0,
    availableLiquid: 0,
    durationSeconds: 1,
  });
  expect(result.rapidSublimationAmount).toBeCloseTo(2);
  expect(result.atmosphere.methane).toBeCloseTo(2);
  expect(result.methane.ice).toBeCloseTo(-2);
});

test('methane updateResourceRates handles rapid sublimation mapping', () => {
  const mc = new MethaneCycle();
  const resources = {
    atmospheric: { atmosphericMethane: { modifyRate: jest.fn() } },
    surface: { hydrocarbonIce: { modifyRate: jest.fn() } },
  };
  const tf = { resources };
  mc.updateResourceRates(tf, { rapidSublimation: 1 }, 1);
  expect(resources.atmospheric.atmosphericMethane.modifyRate).toHaveBeenCalledWith(
    86400,
    'Rapid Sublimation',
    'terraforming'
  );
  expect(resources.surface.hydrocarbonIce.modifyRate).toHaveBeenCalledWith(
    -86400,
    'Rapid Sublimation',
    'terraforming'
  );
  expect(tf.totalMethaneRapidSublimationRate).toBeCloseTo(86400);
});
