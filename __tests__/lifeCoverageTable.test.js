const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

// Test that updateLifeBox populates coverage values for each region

describe('life coverage table', () => {
  test('coverage percentages populate correctly', () => {
    const dom = new JSDOM('<!DOCTYPE html><div class="row"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.ZONES = ['tropical', 'temperate', 'polar'];
    ctx.calculateAverageCoverage = () => 0.25;
    ctx.calculateZonalCoverage = (tf, zone) => {
      switch(zone){
        case 'polar': return 0.1;
        case 'temperate': return 0.2;
        case 'tropical': return 0.3;
        default: return 0;
      }
    };
    ctx.terraforming = {
      life: { target: 0.5 },
      calculateSolarPanelMultiplier: () => 1,
      zonalSurface: { tropical:{}, temperate:{}, polar:{} },
      celestialParameters: { surfaceArea: 1 }
    };
    ctx.projectManager = { isBooleanFlagSet: () => false };

    const code = fs.readFileSync(path.join(__dirname, '..', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const row = dom.window.document.querySelector('.row');
    ctx.createLifeBox(row);
    ctx.updateLifeBox();

    expect(dom.window.document.getElementById('life-coverage-overall').textContent).toBe('25.00');
    expect(dom.window.document.getElementById('life-coverage-polar').textContent).toBe('10.00');
    expect(dom.window.document.getElementById('life-coverage-temperate').textContent).toBe('20.00');
    expect(dom.window.document.getElementById('life-coverage-tropical').textContent).toBe('30.00');
  });
});
