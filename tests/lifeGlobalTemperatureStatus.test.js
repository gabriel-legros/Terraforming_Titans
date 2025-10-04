const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
const numbers = require('../src/js/numbers.js');
const physics = require('../src/js/physics.js');

describe('life global temperature aggregate', () => {
  test('global column shows success when any zone succeeds', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="life-terraforming"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.EffectableEntity = EffectableEntity;
    ctx.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
    ctx.formatNumber = numbers.formatNumber;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;
    ctx.getZonePercentage = () => 1/3;

    ctx.resources = {
      surface: { biomass: { value: 0 }, liquidWater: {} },
      atmospheric: {
        carbonDioxide: { value: 0 },
        oxygen: { value: 0 },
        atmosphericWater: { value: 0 }
      },
      colony: { research: { value: 0 }, funding: { value: 0 }, androids: { value: 0 }, components: { value: 0 }, electronics: { value: 0 } }
    };

    ctx.terraforming = {
      temperature: {
        zones: {
          tropical: { day: 293.15, night: 293.15 },
          temperate: { day: 260, night: 260 },
          polar: { day: 260, night: 260 }
        }
      },
      zonalSurface: { tropical: { biomass: 0 }, temperate: { biomass: 0 }, polar: { biomass: 0 } },
      zonalWater: { tropical: { liquid: 1 }, temperate: { liquid: 1 }, polar: { liquid: 1 } },
      getMagnetosphereStatus: () => true,
      calculateSolarPanelMultiplier: () => 1,
      calculateZonalSolarPanelMultiplier: () => 1,
      radiationPenalty: 0,
      celestialParameters: { surfaceArea: 1, gravity: 1, radius: 1 }
    };

    const lifeCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'life.js'), 'utf8');
    vm.runInContext(lifeCode + '; this.LifeDesigner = LifeDesigner;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'lifeUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.initializeLifeTerraformingDesignerUI = initializeLifeTerraformingDesignerUI; this.updateLifeUI = updateLifeUI;', ctx);

    ctx.lifeDesigner = new ctx.LifeDesigner();
    ctx.lifeDesigner.enable();
    ctx.lifeDesigner.createNewDesign(0,0,0,0,0,0,0,20);

    ctx.initializeLifeTerraformingDesignerUI();
    ctx.updateLifeUI();

    const dayGlobal = dom.window.document.getElementById('day-temp-global').textContent;
    const nightGlobal = dom.window.document.getElementById('night-temp-global').textContent;
    expect(dayGlobal).toBe('✅');
    expect(nightGlobal).toBe('✅');
  });
});
