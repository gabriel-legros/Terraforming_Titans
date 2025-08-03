const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');

describe('warning message DOM reuse', () => {
  test('reuses cached element and hides when no warnings', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="warning-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.resources = { colony: { colonists: { consumptionRate: 2, productionRate: 1 } } };
    ctx.terraforming = { temperature: { opticalDepth: 0, value: 0 } };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'warning.js'), 'utf8');
    vm.runInContext(code + '; this.updateWarnings = updateWarnings;', ctx);

    ctx.updateWarnings();
    const box = dom.window.document.getElementById('warning-container');
    const firstNode = box.firstElementChild;
    expect(firstNode.textContent).toBe('Warning: Colonists are dying!');

    ctx.resources.colony.colonists.consumptionRate = 0;
    ctx.terraforming.temperature.opticalDepth = 11;
    ctx.terraforming.temperature.value = 314.15;
    ctx.updateWarnings();
    expect(box.firstElementChild).toBe(firstNode);
    expect(firstNode.textContent).toBe('Warning: Runaway Greenhouse Effect!');

    ctx.terraforming.temperature.opticalDepth = 0;
    ctx.terraforming.temperature.value = 0;
    ctx.updateWarnings();
    expect(box.childElementCount).toBe(0);
  });
});
