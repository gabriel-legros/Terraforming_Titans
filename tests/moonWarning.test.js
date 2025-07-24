const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');

describe('moon distance warning', () => {
  test('shows message when current body is a moon', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="warning-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.resources = { colony: { colonists: { consumptionRate: 0, productionRate: 1 } } };
    ctx.terraforming = { temperature: { opticalDepth: 0, value: 0 }, celestialParameters: { parentBody: { name: 'Jupiter' } } };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'warning.js'), 'utf8');
    vm.runInContext(code + '; this.updateWarnings = updateWarnings;', ctx);

    ctx.updateWarnings();

    const box = dom.window.document.getElementById('warning-container');
    expect(box.textContent).toBe("Moons must first their parent's gravity well before distance to the sun can be changed");
  });
});
