const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Dyson Swarm card visibility', () => {
  test('shows when collectors exist even without receiver', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.projectElements = {};
    ctx.formatNumber = n => n;
    ctx.console = console;

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'dysonswarmUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);

    const project = {
      name: 'dyson',
      collectors: 0,
      energyPerCollector: 0,
      collectorDuration: 0,
      collectorProgress: 0,
      autoDeployCollectors: false,
      isCompleted: false,
      unlocked: false,
      canStartCollector: () => true,
      startCollector: () => {}
    };

    const container = dom.window.document.getElementById('container');
    ctx.renderDysonSwarmUI(project, container);

    ctx.updateDysonSwarmUI(project);
    const card = ctx.projectElements[project.name].swarmCard;
    expect(card.style.display).toBe('none');

    project.collectors = 5;
    ctx.updateDysonSwarmUI(project);
    expect(card.style.display).toBe('block');
    const els = ctx.projectElements[project.name];
    expect(els.startButton.parentElement.style.display).toBe('');
    expect(els.autoCheckbox.parentElement.style.display).toBe('');
    expect(els.autoCheckbox.disabled).toBe(false);
    expect(els.totalPowerDisplay.parentElement.style.display).toBe('none');

    project.unlocked = true;
    project.isCompleted = true;
    ctx.updateDysonSwarmUI(project);
    expect(els.startButton.parentElement.style.display).toBe('');
  });
});
