const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
const numbers = require('../src/js/numbers.js');
const physics = require('../src/js/physics.js');
const zones = require('../src/js/zones.js');

describe('life requirement icon tooltips', () => {
  test('failing icons show explanatory tooltips', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="life-terraforming"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.EffectableEntity = EffectableEntity;
    ctx.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
    ctx.formatNumber = numbers.formatNumber;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;
    ctx.getZonePercentage = zones.getZonePercentage;

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
          tropical: { day: 303.15, night: 303.15 },
          temperate: { day: 303.15, night: 303.15 },
          polar: { day: 303.15, night: 303.15 }
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
    ctx.lifeDesigner.createNewDesign(0, 0, 0, 0, 0, 0, 0, 0);

    ctx.initializeLifeTerraformingDesignerUI();
    ctx.updateLifeUI();

    const moistureCell = dom.window.document.getElementById('moisture-tropical-status');
    const moistureIcon = moistureCell.querySelector('span');
    expect(moistureIcon.getAttribute('title')).toBe('Need liquid water');

    const dayCell = dom.window.document.getElementById('day-temp-global');
    const dayIcon = dayCell.querySelector('span');
    expect(dayIcon.getAttribute('title')).toBe('Survives but cannot grow');
  });
});

