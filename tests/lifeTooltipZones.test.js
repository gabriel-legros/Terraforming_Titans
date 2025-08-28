const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const zones = require('../src/js/zones.js');

describe('life tooltip zone percentages', () => {
  test('tooltip includes surface distribution percentages', () => {
    const dom = new JSDOM('<!DOCTYPE html><div class="row"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.getZonePercentage = zones.getZonePercentage;
    ctx.calculateAverageCoverage = () => 0;
    ctx.calculateZonalCoverage = () => 0;
    ctx.DEFAULT_SURFACE_ALBEDO = require('../src/js/physics.js').DEFAULT_SURFACE_ALBEDO;
    ctx.terraforming = {
      zonalCoverageCache: {
        polar: { biomass: 0 },
        temperate: { biomass: 0 },
        tropical: { biomass: 0 }
      },
      life: { target: 0.5 },
      zonalSurface: { tropical:{}, temperate:{}, polar:{} },
      celestialParameters: { surfaceArea: 1 },
      calculateZonalSolarPanelMultiplier: () => 1
    };
    ctx.projectManager = { isBooleanFlagSet: () => false };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const row = dom.window.document.querySelector('.row');
    ctx.createLifeBox(row);

    const icon = row.querySelector('.info-tooltip-icon');
    const title = icon.getAttribute('title');
    const t = (zones.getZonePercentage('tropical') * 100).toFixed(1);
    const m = (zones.getZonePercentage('temperate') * 100).toFixed(1);
    const p = (zones.getZonePercentage('polar') * 100).toFixed(1);

    expect(title).toContain('Tropical: ' + t + '%');
    expect(title).toContain('Temperate: ' + m + '%');
    expect(title).toContain('Polar: ' + p + '%');
  });
});
