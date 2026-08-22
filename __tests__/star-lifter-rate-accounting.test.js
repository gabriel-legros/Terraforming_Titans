const path = require('path');
const { loadClassicScript } = require('./helpers/classic-script-loader');

function createStellarMassResource() {
  return {
    consumptionRate: 0,
    consumptionRateByType: {},
    productionRate: 0,
    productionRateByType: {},
    modifyRate(rate, source, rateType) {
      if (rate < 0) {
        const consumption = -rate;
        this.consumptionRate += consumption;
        this.consumptionRateByType[rateType] ||= {};
        this.consumptionRateByType[rateType][source] =
          (this.consumptionRateByType[rateType][source] || 0) + consumption;
      } else if (rate > 0) {
        this.productionRate += rate;
        this.productionRateByType[rateType] ||= {};
        this.productionRateByType[rateType][source] =
          (this.productionRateByType[rateType][source] || 0) + rate;
      }
    }
  };
}

describe('Star Lifter rate accounting', () => {
  const originalGlobals = {};

  beforeEach(() => {
    for (const name of [
      'Building',
      'disposeDynamicWorldStellarLiftableMass',
      'registerBuildingConstructor',
      'resources',
      'terraforming'
    ]) {
      originalGlobals[name] = global[name];
    }
  });

  afterEach(() => {
    for (const name in originalGlobals) {
      if (originalGlobals[name] === undefined) {
        delete global[name];
      } else {
        global[name] = originalGlobals[name];
      }
    }
  });

  test('reports only mass actually removed as consumption', () => {
    const source = 'building:starLifter';
    const stellarMass = createStellarMassResource();
    global.resources = { underground: { stellarMass } };
    global.terraforming = {};
    global.disposeDynamicWorldStellarLiftableMass = () => 40;
    global.registerBuildingConstructor = () => {};
    global.Building = class {
      constructor(config, name) {
        this.requestedMass = config.requestedMass;
        this.name = name;
      }

      consume(accumulatedChanges, deltaTime) {
        this.currentConsumption = {
          underground: { stellarMass: this.requestedMass }
        };
        accumulatedChanges.underground.stellarMass -= this.requestedMass;
        stellarMass.modifyRate(
          -this.requestedMass * (1000 / deltaTime),
          this.getRateSource(),
          'building'
        );
      }

      getRateSource() {
        return source;
      }
    };

    const { StarLifter } = loadClassicScript(
      path.resolve(__dirname, '../src/js/buildings/StarLifter.js'),
      ['StarLifter']
    );
    const lifter = new StarLifter({ requestedMass: 100 }, 'starLifter');
    const accumulatedChanges = { underground: { stellarMass: 0 } };

    lifter.consume(accumulatedChanges, 1000, {});

    expect(accumulatedChanges.underground.stellarMass).toBe(0);
    expect(lifter.currentConsumption.underground.stellarMass).toBe(40);
    expect(stellarMass.consumptionRate).toBe(40);
    expect(stellarMass.consumptionRateByType.building[source]).toBe(40);
    expect(stellarMass.productionRate).toBe(0);
    expect(stellarMass.productionRateByType).toEqual({});
  });
});
