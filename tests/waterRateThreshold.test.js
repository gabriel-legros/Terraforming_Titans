const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('updateWaterBox thresholds', () => {
  test('values below 1e-4 show as 0', () => {
    const dom = new JSDOM('<!DOCTYPE html><div class="row"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.formatNumber = numbers.formatNumber;
    ctx.calculateAverageCoverage = () => 0;
    ctx.ZONES = [];
    ctx.terraforming = {
      waterTarget: 0,
      totalEvaporationRate: 5e-5,
      totalWaterSublimationRate: 2e-5,
      totalRainfallRate: 3e-5,
      totalSnowfallRate: 4e-5,
      totalMeltRate: 5e-5,
      totalFreezeRate: 6e-5,
      celestialParameters: { surfaceArea: 1e6 }
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const row = dom.window.document.querySelector('.row');
    ctx.createWaterBox(row);
    ctx.updateWaterBox();

    const evap = dom.window.document.getElementById('evaporation-rate').textContent;
    const subl = dom.window.document.getElementById('sublimation-rate').textContent;
    const rainfall = dom.window.document.getElementById('rainfall-rate').textContent;
    const evapKg = dom.window.document.getElementById('evaporation-rate-kg').textContent;

    expect(evap).toBe('0');
    expect(subl).toBe('0');
    expect(rainfall).toBe('0');
    expect(evapKg).toBe('0');
  });
});
