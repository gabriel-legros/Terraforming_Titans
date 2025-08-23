const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
const physics = require('../src/js/physics.js');
const zones = require('../src/js/zones.js');

describe('life temperature tooltip units', () => {
  test('uses display unit based on setting', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="life-terraforming"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.gameSettings = { useCelsius: true };
    ctx.EffectableEntity = EffectableEntity;
    ctx.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
    ctx.getZonePercentage = zones.getZonePercentage;

    const numbersCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'numbers.js'), 'utf8');
    vm.runInContext(numbersCode + '; this.formatNumber = formatNumber; this.toDisplayTemperature = toDisplayTemperature; this.getTemperatureUnit = getTemperatureUnit;', ctx);

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
          tropical: { day: 400, night: 100 },
          temperate: { day: 400, night: 100 },
          polar: { day: 400, night: 100 }
        }
      },
      zonalSurface: { tropical: { biomass: 0 }, temperate: { biomass: 0 }, polar: { biomass: 0 } },
      zonalWater: { tropical: { liquid: 0 }, temperate: { liquid: 0 }, polar: { liquid: 0 } },
      getMagnetosphereStatus: () => true,
      radiationPenalty: 0,
      calculateSolarPanelMultiplier: () => 1,
      calculateZonalSolarPanelMultiplier: () => 1,
      celestialParameters: { surfaceArea: 1, gravity: 1, radius: 1 }
    };

    const lifeCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'life.js'), 'utf8');
    vm.runInContext(lifeCode + '; this.LifeDesigner = LifeDesigner;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'lifeUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.initializeLifeTerraformingDesignerUI = initializeLifeTerraformingDesignerUI; this.updateLifeUI = updateLifeUI;', ctx);

    ctx.lifeDesigner = new ctx.LifeDesigner();
    ctx.lifeDesigner.enable();
    ctx.lifeDesigner.createNewDesign(0,0,0,0,0,0,0,0);

    ctx.initializeLifeTerraformingDesignerUI();
    ctx.updateLifeUI();

    const tooltip = dom.window.document
      .getElementById('day-temp-tropical')
      .querySelector('.temp-status')
      .getAttribute('title');

    expect(tooltip).toContain('\u00B0C');
    expect(tooltip).not.toContain('K');
  });
});

