const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
const physics = require('../src/js/physics.js');
const numbers = require('../src/js/numbers.js');

describe('LifeDesigner cancelDeployment', () => {
  test('stops active deployment and retains tentative design', () => {
    const ctx = { console };
    vm.createContext(ctx);
    ctx.EffectableEntity = EffectableEntity;
    ctx.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
    ctx.formatNumber = numbers.formatNumber;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;

    ctx.resources = {
      surface: { biomass: { value: 0 }, liquidWater: {} },
      atmospheric: {
        carbonDioxide: { value: 0 },
        oxygen: { value: 0 },
        atmosphericWater: { value: 0 }
      },
      colony: {
        research: { value: 0 },
        funding: { value: 0 },
        androids: { value: 0 },
        components: { value: 0 },
        electronics: { value: 0 }
      }
    };
    ctx.terraforming = {
      temperature: {
        zones: {
          tropical: { day: 200, night: 200 },
          temperate: { day: 200, night: 200 },
          polar: { day: 200, night: 200 }
        }
      },
      zonalSurface: { tropical: { biomass: 0 }, temperate: { biomass: 0 }, polar: { biomass: 0 } },
      zonalWater: { tropical: { liquid: 0 }, temperate: { liquid: 0 }, polar: { liquid: 0 } },
      getMagnetosphereStatus: () => true,
      celestialParameters: { surfaceArea: 1, gravity: 1, radius: 1 }
    };

    const zonesCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'zones.js'), 'utf8');
    vm.runInContext(zonesCode, ctx);
    const lifeCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'life.js'), 'utf8');
    vm.runInContext(lifeCode + '; this.LifeDesigner = LifeDesigner;', ctx);

    ctx.lifeDesigner = new ctx.LifeDesigner();
    ctx.lifeDesigner.enable();
    ctx.lifeDesigner.createNewDesign(0,0,0,0,0,0,0,0,0);

    ctx.lifeDesigner.confirmDesign();
    expect(ctx.lifeDesigner.isActive).toBe(true);

    ctx.lifeDesigner.cancelDeployment();
    expect(ctx.lifeDesigner.isActive).toBe(false);
    expect(ctx.lifeDesigner.tentativeDesign).not.toBeNull();
    expect(ctx.lifeDesigner.elapsedTime).toBe(0);
  });
});
