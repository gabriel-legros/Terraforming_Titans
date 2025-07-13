const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('Dyson Swarm collector cost display', () => {
  test('shows formatted collector cost', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};
    ctx.resources = { colony: { glass: { displayName: 'Glass' }, electronics: { displayName: 'Electronics' }, components: { displayName: 'Components' } } };

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'dysonswarmUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);

    const project = {
      name: 'dyson',
      collectorCost: { colony: { glass: 1000, electronics: 1000, components: 1000 } },
      collectors: 0,
      energyPerCollector: 0,
      collectorDuration: 0,
      collectorProgress: 0,
      autoDeployCollectors: false,
      isCompleted: true,
      canStartCollector: () => true,
      startCollector: () => {}
    };

    const container = dom.window.document.getElementById('container');
    ctx.renderDysonSwarmUI(project, container);
    ctx.updateDysonSwarmUI(project);

    const costText = ctx.projectElements[project.name].costDisplay.textContent;
    expect(costText).toContain(numbers.formatNumber(1000, true));
  });
});
