const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Dyson Swarm card visibility', () => {
  test('card hidden until project complete', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.projectElements = {};
    ctx.formatNumber = n => n;
    ctx.console = console;

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'dysonswarmUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);

    const project = {
      name: 'dyson',
      collectors: 0,
      energyPerCollector: 0,
      collectorDuration: 0,
      collectorProgress: 0,
      autoDeployCollectors: false,
      isCompleted: false,
      canStartCollector: () => true,
      startCollector: () => {}
    };

    const container = dom.window.document.getElementById('container');
    ctx.renderDysonSwarmUI(project, container);

    ctx.updateDysonSwarmUI(project);
    const card = ctx.projectElements[project.name].swarmCard;
    expect(card.style.display).toBe('none');

    project.isCompleted = true;
    ctx.updateDysonSwarmUI(project);
    expect(card.style.display).toBe('block');
  });
});
