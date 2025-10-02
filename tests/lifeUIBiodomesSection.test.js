const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
const physics = require('../src/js/physics.js');
const numbers = require('../src/js/numbers.js');

describe('lifeUI biodomes section', () => {
  test('shows biodome points', () => {
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
      temperature: { zones: { tropical: { day: 280, night: 280 }, temperate: { day: 280, night: 280 }, polar: { day: 280, night: 280 } } },
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

    ctx.initializeLifeTerraformingDesignerUI();

    const section = dom.window.document.getElementById('life-biodomes-section');
    expect(section).not.toBeNull();
    expect(section.querySelector('h4').textContent).toBe('Biodomes');
    const points = dom.window.document.getElementById('life-biodome-points');
    expect(points.textContent).toBe('0');
    const max = dom.window.document.getElementById('life-biodome-max');
    expect(max).toBeNull();
    const rate = dom.window.document.getElementById('life-biodome-rate');
    expect(rate.textContent).toBe('+0/hour');
    ctx.lifeDesigner.biodomePoints = 1.5;
    ctx.updateLifeUI();
    expect(points.textContent).toBe('1.50');
    const tooltip = dom.window.document.getElementById('life-biodome-tooltip');
    expect(tooltip).not.toBeNull();
    expect(tooltip.classList.contains('info-tooltip-icon')).toBe(true);
    const title = tooltip.getAttribute('title');
    expect(title).toMatch(/log10/);
    expect(title).toMatch(/Only whole points/);
  });
});

