const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('life luminosity table', () => {
  test('photosynthesis multipliers populate correctly', () => {
    const dom = new JSDOM('<!DOCTYPE html><div class="row"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.ZONES = ['tropical', 'temperate', 'polar'];
    ctx.getZonePercentage = require('../src/js/zones.js').getZonePercentage;
    ctx.calculateAverageCoverage = () => 0.25;
    ctx.calculateZonalCoverage = () => 0; // not needed
    ctx.terraforming = {
      life: { target: 0.5 },
      zonalSurface: { tropical:{}, temperate:{}, polar:{} },
      celestialParameters: { surfaceArea: 1 },
      calculateZonalSolarPanelMultiplier: zone => {
        switch(zone){
          case 'tropical': return 1.2;
          case 'temperate': return 1.0;
          case 'polar': return 0.8;
          default: return 1;
        }
      }
    };
    ctx.projectManager = { isBooleanFlagSet: () => false };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const row = dom.window.document.querySelector('.row');
    ctx.createLifeBox(row);
    ctx.updateLifeBox();

    expect(dom.window.document.getElementById('life-photo-tropical').textContent).toBe('120.00');
    expect(dom.window.document.getElementById('life-photo-temperate').textContent).toBe('100.00');
    expect(dom.window.document.getElementById('life-photo-polar').textContent).toBe('80.00');
  });
});
