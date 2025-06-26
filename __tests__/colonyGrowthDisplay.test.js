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
        <div id="colony-controls-container"></div>
        <div id="right-controls-container"></div>
      </div>
      <button id="unhide-obsolete-button"></button>`;
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.formatNumber = numbers.formatNumber;
    ctx.populationModule = { getCurrentGrowthPercent: () => 0.5 };
    ctx.colonies = {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'colonyUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    ctx.updateGrowthRateDisplay();

    const value = dom.window.document.getElementById('growth-rate-value');
    expect(value.textContent).toBe('+0.500%/s');
    const icon = dom.window.document.querySelector('#growth-rate-container .info-tooltip-icon');
    expect(icon).not.toBeNull();
  });
});
