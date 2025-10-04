const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
const physics = require('../src/js/physics.js');
const numbers = require('../src/js/numbers.js');

describe('lifeUI controls disable during deployment', () => {
  test('modify buttons are disabled when deploying', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="life-terraforming"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.EffectableEntity = EffectableEntity;
    ctx.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
    ctx.formatNumber = numbers.formatNumber;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;

    ctx.resources = {
      surface: { biomass: { value: 10 }, liquidWater: {} },
      atmospheric: {
        carbonDioxide: { value: 10 },
        oxygen: { value: 0 },
        atmosphericWater: { value: 10 }
      },
      colony: { research: { value: 0 }, funding: { value: 0 }, androids: { value: 0 }, components: { value: 0 }, electronics: { value: 0 } }
    };
    ctx.terraforming = {
      temperature: { zones: { tropical: { day: 300, night: 300 }, temperate: { day: 300, night: 300 }, polar: { day: 300, night: 300 } } },
      zonalSurface: { tropical: { biomass: 10 }, temperate: { biomass: 10 }, polar: { biomass: 10 } },
      zonalWater: { tropical: { liquid: 1 }, temperate: { liquid: 1 }, polar: { liquid: 1 } },
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

    ctx.initializeLifeTerraformingDesignerUI();
    ctx.updateLifeUI();

    let modifyBtn = dom.window.document.querySelector('.life-tentative-btn');
    expect(modifyBtn.disabled).toBe(false);

    ctx.lifeDesigner.confirmDesign();
    ctx.updateLifeUI();

    modifyBtn = dom.window.document.querySelector('.life-tentative-btn');
    const createBtn = dom.window.document.getElementById('life-new-design-btn');
    const revertBtn = dom.window.document.getElementById('life-revert-btn');
    expect(modifyBtn.disabled).toBe(true);
    expect(createBtn.disabled).toBe(true);
    // Revert/cancel button should remain enabled to allow cancelling
    expect(revertBtn.disabled).toBe(false);
  });
});
