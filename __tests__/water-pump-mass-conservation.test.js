const { createGameDom } = require('./helpers/jsdom-game-harness');

describe('surface water extraction mass conservation', () => {
  let dom;
  let window;

  beforeAll(async () => {
    dom = await createGameDom({ trackEventListeners: false });
    window = dom.window;
  });

  afterAll(() => {
    window.close();
  });

  test('conserves compensated zonal water through extraction and active phase changes', () => {
    const result = window.eval(`(() => {
      for (const name in buildings) {
        buildings[name].count = 0n;
        buildings[name].active = 0n;
        buildings[name].productivity = 0;
        buildings[name].displayProductivity = 0;
      }
      for (const name in colonies) {
        colonies[name].count = 0n;
        colonies[name].active = 0n;
      }

      const pump = buildings.waterPump;
      pump.count = 10n;
      pump.active = 10n;
      pump.snapProductivity = true;

      resources.colony.energy.value = 1e30;
      resources.colony.energy.cap = 1e30;
      resources.colony.energy.availabilityRatio = 1;
      resources.colony.energy.reserved = 0;
      resources.colony.water.value = 0;
      resources.colony.water.cap = 1e30;
      resources.atmospheric.atmosphericWater.value = 1e15;
      for (const name in resources.atmospheric) {
        if (name !== 'atmosphericWater' && name !== 'inertGas') {
          resources.atmospheric[name].value = 0;
        }
      }
      resources.atmospheric.inertGas.value = 1e18;

      const initialLiquidWater = {
        tropical: 1e27,
        temperate: 2e27,
        polar: 3e27,
      };
      const waterKeys = ['liquidWater', 'ice', 'buriedIce'];
      for (const zone of getZones()) {
        for (const key of waterKeys) {
          terraforming.zonalSurface[key][zone] = 0;
          terraforming.zonalSurface[key].setRemainder(zone, 0);
        }
        terraforming.zonalSurface.liquidWater[zone] = initialLiquidWater[zone];
        terraforming.temperature.zones[zone].value = 300;
        terraforming.temperature.zones[zone].day = 305;
        terraforming.temperature.zones[zone].night = 295;
      }
      terraforming.synchronizeGlobalResources();

      const captureWater = () => {
        const state = {
          colony: resources.colony.water.value,
          atmosphere: resources.atmospheric.atmosphericWater.value,
          zones: {},
        };
        for (const zone of getZones()) {
          state.zones[zone] = {};
          for (const key of waterKeys) {
            state.zones[zone][key] = terraforming.zonalSurface[key][zone];
            state.zones[zone][key + 'Remainder'] = terraforming.zonalSurface[key].getRemainder(zone);
          }
        }
        return state;
      };

      const before = captureWater();
      produceResources(20, buildings);
      const after = captureWater();
      let massDelta = after.colony - before.colony
        + after.atmosphere - before.atmosphere;
      let remainderMagnitude = 0;
      for (const zone of getZones()) {
        for (const key of waterKeys) {
          massDelta += after.zones[zone][key] - before.zones[zone][key];
          massDelta += after.zones[zone][key + 'Remainder']
            - before.zones[zone][key + 'Remainder'];
          remainderMagnitude += Math.abs(after.zones[zone][key + 'Remainder']);
        }
      }

      const pumpResult = {
        massDelta,
        remainderMagnitude,
        atmosphericChange: after.atmosphere - before.atmosphere,
        rainRate: terraforming.totalRainRate,
        pumpProduction: pump.currentProduction.colony.water,
        pumpConsumption: pump.currentConsumption.surface.liquidWater,
      };

      resources = createResources(currentPlanetParameters.resources);
      buildings = initializeBuildings(buildingsParameters);
      colonies = initializeColonies(colonyParameters);
      terraforming.resources = resources;

      const harvester = buildings.iceHarvester;
      harvester.count = 10n;
      harvester.active = 10n;
      harvester.snapProductivity = true;
      resources.colony.energy.value = 1e30;
      resources.colony.water.value = 0;
      resources.atmospheric.atmosphericWater.value = 0;
      for (const name in resources.atmospheric) {
        if (name !== 'inertGas') {
          resources.atmospheric[name].value = 0;
        }
      }
      resources.atmospheric.inertGas.value = 1e18;
      for (const zone of getZones()) {
        for (const key of waterKeys) {
          terraforming.zonalSurface[key][zone] = 0;
          terraforming.zonalSurface[key].setRemainder(zone, 0);
        }
        terraforming.temperature.zones[zone].value = 300;
        terraforming.temperature.zones[zone].day = 305;
        terraforming.temperature.zones[zone].night = 295;
      }
      terraforming.zonalSurface.ice.polar = 1.6;
      terraforming.synchronizeGlobalResources();

      const totalWater = () => {
        let total = resources.colony.water.value
          + resources.atmospheric.atmosphericWater.value;
        for (const zone of getZones()) {
          for (const key of waterKeys) {
            total += terraforming.zonalSurface[key][zone];
            total += terraforming.zonalSurface[key].getRemainder(zone);
          }
        }
        return total;
      };
      const harvesterBefore = totalWater();
      produceResources(160, buildings);
      const harvesterAfter = totalWater();

      return {
        pump: pumpResult,
        harvester: {
          massDelta: harvesterAfter - harvesterBefore,
          meltRate: terraforming.totalMeltRate,
          production: harvester.currentProduction.colony.water,
          consumption: harvester.currentConsumption.surface.ice,
          remainingNaturalWater: resources.surface.liquidWater.value
            + resources.surface.ice.value
            + resources.atmospheric.atmosphericWater.value,
        },
      };
    })()`);

    expect(result.pump.pumpProduction).toBeCloseTo(200, 9);
    expect(result.pump.pumpConsumption).toBeCloseTo(result.pump.pumpProduction, 9);
    expect(Math.abs(result.pump.atmosphericChange)).toBeGreaterThan(result.pump.pumpProduction);
    expect(result.pump.rainRate).toBeGreaterThan(0);
    expect(result.pump.remainderMagnitude).toBeGreaterThan(0);
    expect(Math.abs(result.pump.massDelta)).toBeLessThan(1e-6);

    expect(result.harvester.meltRate).toBeGreaterThan(0);
    expect(result.harvester.production).toBeCloseTo(0.2, 12);
    expect(result.harvester.consumption).toBeCloseTo(result.harvester.production, 12);
    expect(result.harvester.remainingNaturalWater).toBeCloseTo(1.4, 12);
    expect(Math.abs(result.harvester.massDelta)).toBeLessThan(1e-12);
  });
});
