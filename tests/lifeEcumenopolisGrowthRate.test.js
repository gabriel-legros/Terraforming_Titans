const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
const physics = require('../src/js/physics.js');
const numbers = require('../src/js/numbers.js');

function setup(ecoFraction) {
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
      carbonDioxide: { value: 1 },
      oxygen: { value: 0 },
      atmosphericWater: { value: 0 }
    },
    colony: { research: { value: 0 }, funding: { value: 0 }, androids: { value: 0 }, components: { value: 0 }, electronics: { value: 0 } }
  };
  ctx.terraforming = {
    temperature: { zones: { tropical: { day: 293.15 }, temperate: { day: 293.15 }, polar: { day: 293.15 } } },
    zonalSurface: { tropical: { biomass: 0.01 }, temperate: { biomass: 0 }, polar: { biomass: 0 } },
    zonalWater: { tropical: { liquid: 1 }, temperate: { liquid: 0 }, polar: { liquid: 0 } },
    getMagnetosphereStatus: () => true,
    calculateSolarPanelMultiplier: () => 1,
    calculateZonalSolarPanelMultiplier: () => 1,
    celestialParameters: { surfaceArea: 1, gravity: 1, radius: 1 },
    initialLand: 1
  };

  const zonesCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'zones.js'), 'utf8');
  vm.runInContext(zonesCode, ctx);
  const lifeCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'life.js'), 'utf8');
  vm.runInContext(lifeCode + '; this.LifeDesigner = LifeDesigner; this.BASE_MAX_BIOMASS_DENSITY = BASE_MAX_BIOMASS_DENSITY;', ctx);
  const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'lifeUI.js'), 'utf8');
  vm.runInContext(uiCode + '; this.initializeLifeTerraformingDesignerUI = initializeLifeTerraformingDesignerUI; this.updateLifeUI = updateLifeUI; this.PHOTOSYNTHESIS_RATE_PER_POINT = PHOTOSYNTHESIS_RATE_PER_POINT;', ctx);
  ctx.getEcumenopolisLandFraction = () => ecoFraction;

  ctx.colonies = { t7_colony: { active: 0.5, requiresLand: 1 } };

  ctx.lifeDesigner = new ctx.LifeDesigner();
  ctx.lifeDesigner.enable();
  ctx.lifeDesigner.createNewDesign(0,0,100,0,0,0,0,0);

  ctx.initializeLifeTerraformingDesignerUI();
  ctx.updateLifeUI();

  const valueSpan = dom.window.document.getElementById('growth-rate-tropical-value');
  const tooltip = dom.window.document.getElementById('growth-rate-tropical-tooltip');

  const zonePerc = ctx.getZonePercentage('tropical');
  const landMult = 1 - ctx.getEcumenopolisLandFraction(ctx.terraforming);
  const zoneArea = ctx.terraforming.celestialParameters.surfaceArea * zonePerc * landMult;
  const maxBiomass = zoneArea * ctx.BASE_MAX_BIOMASS_DENSITY;
  const capacityMult = maxBiomass > 0 ? Math.max(0, 1 - ctx.terraforming.zonalSurface.tropical.biomass / maxBiomass) : 0;
  const baseRate = 100 * ctx.PHOTOSYNTHESIS_RATE_PER_POINT;
  const expected = baseRate * capacityMult;

  return { dom, valueSpan, tooltip, expected };
}

describe('life growth rate with ecumenopolis', () => {
  test('shows Ecumenopolis reduction and adjusted growth rate', () => {
    const { valueSpan, tooltip, expected } = setup(0.5);
    expect(valueSpan.textContent).toBe(numbers.formatNumber(expected * 100, false, 2));
    expect(tooltip.title).toContain('Ecumenopolis: x0.50');
    expect(tooltip.title).toContain('-50.00%');
  });

  test('hides Ecumenopolis line when no land reduction', () => {
    const { tooltip } = setup(0);
    expect(tooltip.title).not.toContain('Ecumenopolis');
  });
});

