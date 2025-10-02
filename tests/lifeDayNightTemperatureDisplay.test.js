const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
const physics = require('../src/js/physics.js');
const numbers = require('../src/js/numbers.js');

describe('life day/night temperature rows', () => {
  test('temperatures populate for all zones', () => {
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
          tropical: { day: 300, night: 280 },
          temperate: { day: 290, night: 270 },
          polar: { day: 260, night: 240 }
        }
      },
      zonalSurface: { tropical: { biomass: 0 }, temperate: { biomass: 0 }, polar: { biomass: 0 } },
      zonalWater: { tropical: { liquid: 1 }, temperate: { liquid: 1 }, polar: { liquid: 1 } },
      getMagnetosphereStatus: () => true,
      calculateSolarPanelMultiplier: () => 1,
      calculateZonalSolarPanelMultiplier: () => 1,
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
    ctx.lifeDesigner.createNewDesign(0,0,100,0,0,0,0,0);

    ctx.initializeLifeTerraformingDesignerUI();
    ctx.updateLifeUI();

    const getText = id => dom.window.document.getElementById(id).textContent;
    expect(getText('day-temp-tropical')).toBe('300.00 ✅');
    expect(getText('night-temp-temperate')).toBe('270.00 ❌');

    expect(getText('day-temp-global')).toBe('✅');
    expect(getText('night-temp-global')).toBe('✅');
    expect(dom.window.document.getElementById('survival-temp-global-status')).toBeNull();
  });
});

