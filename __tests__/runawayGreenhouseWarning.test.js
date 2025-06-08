const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('runaway greenhouse warning', () => {
  test('only displays when optical depth high and temperature above 40C', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="warning-container"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.resources = { colony: { colonists: { consumptionRate: 0, productionRate: 1 } } };
    ctx.terraforming = { temperature: { opticalDepth: 11, value: 314 } };

    const code = fs.readFileSync(path.join(__dirname, '..', 'warning.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.updateWarnings();
    const container = dom.window.document.getElementById('warning-container');
    expect(container.textContent).toContain('Runaway Greenhouse Effect');

    ctx.terraforming.temperature.value = 300;
    container.innerHTML = '';

    ctx.updateWarnings();
    expect(container.textContent).toBe('');
  });
});
