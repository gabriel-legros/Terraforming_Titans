const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const numbers = require('../numbers.js');

describe('colony growth rate display', () => {
  test('creates growth rate element with tooltip', () => {
    const html = `<!DOCTYPE html>
      <div class="container colonies-container">
        <div class="header-container"></div>
        <div id="colony-controls-container">
          <div id="colony-sliders-container"></div>
          <div id="right-controls-container"></div>
        </div>
      </div>
      <button id="unhide-obsolete-button"></button>`;
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.formatNumber = numbers.formatNumber;
    ctx.populationModule = {
      getCurrentGrowthPercent: () => 0.05,
      growthRate: 0.001,
      populationResource: { value: 100, cap: 200 },
      getEffectiveGrowthMultiplier: () => 1
    };
    ctx.colonies = {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'colonyUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    ctx.updateGrowthRateDisplay();

    const cap = dom.window.document.getElementById('growth-capacity-value');
    expect(cap.textContent).toBe('50.0%');
    const base = dom.window.document.getElementById('growth-base-value');
    expect(base.textContent).toBe('+0.100%/s');
    const other = dom.window.document.getElementById('growth-other-value');
    expect(other.textContent).toBe('100.0%');
    const value = dom.window.document.getElementById('growth-rate-value');
    expect(value.textContent).toBe('+0.050%/s');
    const icons = dom.window.document.querySelectorAll('#growth-rate-container .info-tooltip-icon');
    expect(icons.length).toBe(4);
  });
});
