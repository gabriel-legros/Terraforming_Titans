const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
const physics = require('../src/js/physics.js');
const numbers = require('../src/js/numbers.js');

describe('lifeUI optimal growth temperature spending', () => {
  test('cannot exceed available points', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="life-terraforming"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
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
      colony: { research: { value: 0 }, funding: { value: 0 }, androids: { value: 0 }, components: { value: 0 }, electronics: { value: 0 } }
    };
    ctx.terraforming = {
      temperature: {
        zones: {
          tropical: { day: 280, night: 280 },
          temperate: { day: 280, night: 280 },
          polar: { day: 280, night: 280 }
        }
      },
      zonalSurface: { tropical: { biomass: 0 }, temperate: { biomass: 0 }, polar: { biomass: 0 } },
      zonalWater: { tropical: { liquid: 0 }, temperate: { liquid: 0 }, polar: { liquid: 0 } },
      getMagnetosphereStatus: () => true,
      celestialParameters: { surfaceArea: 1, gravity: 1, radius: 1 }
    };

    const zonesCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'zones.js'), 'utf8');
    vm.runInContext(zonesCode, ctx);
    const lifeCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'life.js'), 'utf8');
    vm.runInContext(lifeCode + '; this.LifeDesigner = LifeDesigner;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'lifeUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.initializeLifeTerraformingDesignerUI = initializeLifeTerraformingDesignerUI; this.updateLifeUI = updateLifeUI;', ctx);

    ctx.lifeDesigner = new ctx.LifeDesigner();
    ctx.lifeDesigner.enable();
    ctx.lifeDesigner.createNewDesign(0,0,0,0,0,0,0,0);
    ctx.lifeDesigner.tentativeDesign.copyFrom(ctx.lifeDesigner.currentDesign);
    ctx.lifeDesigner.addAndReplace({ type: 'lifeDesignPointBonus', value: 10, effectId: 'test', sourceId: 'test' });

    ctx.initializeLifeTerraformingDesignerUI();
    ctx.updateLifeUI();

    const plus10 = dom.window.document.querySelector('button[data-attribute="optimalGrowthTemperature"][data-change="10"]');
    plus10.dispatchEvent(new dom.window.Event('click'));

    const plus1 = dom.window.document.querySelector('button[data-attribute="optimalGrowthTemperature"][data-change="1"]');
    plus1.dispatchEvent(new dom.window.Event('click'));

    const value = ctx.lifeDesigner.tentativeDesign.optimalGrowthTemperature.value;
    const remaining = parseInt(dom.window.document.getElementById('life-points-remaining').textContent, 10);

    expect(value).toBeLessThanOrEqual(10);
    expect(remaining).toBeGreaterThanOrEqual(0);
  });
});
