const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
const numbers = require('../src/js/numbers.js');
const physics = require('../src/js/physics.js');

describe('geological burial slows when CO2 depleted', () => {
  test('burial rate reduced without CO2', () => {
    const ctx = { console };
    vm.createContext(ctx);
    ctx.EffectableEntity = EffectableEntity;
    ctx.formatNumber = numbers.formatNumber;
    ctx.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
    ctx.getZonePercentage = () => 1;
    ctx.getEcumenopolisLandFraction = () => 0;
    ctx.terraforming = {
      zonalCoverageCache: {
        tropical: { liquidWater: 0.1, ice: 0 },
        temperate: { liquidWater: 0.1, ice: 0 },
        polar: { liquidWater: 0.1, ice: 0 }
      },
      temperature: { zones: {
        tropical: { day: 300, night: 300 },
        temperate: { day: 300, night: 300 },
        polar: { day: 300, night: 300 }
      } },
      zonalSurface: {
        tropical: { biomass: 100 },
        temperate: { biomass: 0 },
        polar: { biomass: 0 }
      },
      zonalWater: {
        tropical: { liquid: 1 },
        temperate: { liquid: 1 },
        polar: { liquid: 1 }
      },
      getMagnetosphereStatus: () => true,
      // Give the planet enough surface area so biomass is below the
      // overflow threshold. Otherwise the generic density decay logic
      // removes biomass even when burial is disabled, which obscures
      // the behaviour we want to test.
      celestialParameters: { surfaceArea: 6000, gravity: 1, radius: 1 },
      calculateZonalSolarPanelMultiplier: () => 1,
      getEcumenopolisLandFraction: () => 0,
      getEffectiveLifeFraction: () => 0.5
    };
    ctx.resources = {
      surface: { biomass: { value: 0, modifyRate: jest.fn() } },
      atmospheric: {
        carbonDioxide: { value: 100 },
        oxygen: { value: 0 },
        atmosphericWater: { value: 0 }
      },
      colony: {}
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'life.js'), 'utf8');
    vm.runInContext(code + '; this.LifeDesigner = LifeDesigner; this.LifeManager = LifeManager;', ctx);

    ctx.lifeDesigner = new ctx.LifeDesigner();
    ctx.lifeDesigner.enable();
    ctx.lifeDesigner.currentDesign.geologicalBurial.value = 10;
    ctx.lifeManager = new ctx.LifeManager();

    // With CO2 present
    ctx.lifeManager.updateLife(1000);
    const biomassWithCO2 = ctx.terraforming.zonalSurface.tropical.biomass;

    // Reset and remove CO2
    ctx.terraforming.zonalSurface.tropical.biomass = 100;
    ctx.resources.atmospheric.carbonDioxide.value = 0;
    ctx.lifeManager.updateLife(1000);
    const biomassNoCO2 = ctx.terraforming.zonalSurface.tropical.biomass;

    const buriedWith = 100 - biomassWithCO2;
    const buriedWithout = 100 - biomassNoCO2;
    expect(buriedWith).toBeGreaterThan(0);
    expect(buriedWithout).toBe(0);
  });
});
