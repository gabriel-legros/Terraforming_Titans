const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
const numbers = require('../src/js/numbers.js');
const physics = require('../src/js/physics.js');

describe('biomass decay without oxygen', () => {
  test('biomass is deleted without resource gain', () => {
    const ctx = { console };
    vm.createContext(ctx);
    ctx.EffectableEntity = EffectableEntity;
    ctx.formatNumber = numbers.formatNumber;
    ctx.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
    ctx.getZonePercentage = () => 1;
    ctx.calculateZonalCoverage = () => 0;
    ctx.terraforming = {
      zonalCoverageCache: {
        tropical: { liquidWater: 0.1, ice: 0 },
        temperate: { liquidWater: 0.1, ice: 0 },
        polar: { liquidWater: 0.1, ice: 0 }
      },
      temperature: { zones: {
        tropical: { day: 200, night: 200 },
        temperate: { day: 200, night: 200 },
        polar: { day: 200, night: 200 }
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
      celestialParameters: { surfaceArea: 1, gravity: 1, radius: 1 },
      calculateZonalSolarPanelMultiplier: () => 1
    };
    ctx.resources = {
      surface: { biomass: { value: 0, modifyRate: jest.fn() } },
      atmospheric: {
        carbonDioxide: { value: 50, modifyRate: jest.fn() },
        oxygen: { value: 0, modifyRate: jest.fn() },
        atmosphericWater: { value: 0, modifyRate: jest.fn() }
      },
      colony: {}
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'life.js'), 'utf8');
    vm.runInContext(code + '; this.LifeDesigner = LifeDesigner; this.LifeManager = LifeManager;', ctx);

    ctx.lifeDesigner = new ctx.LifeDesigner();
    ctx.lifeDesigner.enable();
    ctx.lifeManager = new ctx.LifeManager();

    ctx.lifeManager.updateLife(1000);

    expect(ctx.terraforming.zonalSurface.tropical.biomass).toBe(99);
    expect(ctx.resources.atmospheric.carbonDioxide.value).toBe(50);
    expect(ctx.resources.atmospheric.atmosphericWater.value).toBe(0);
    expect(ctx.resources.atmospheric.oxygen.value).toBe(0);
  });
});
