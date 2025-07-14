const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Dyson Swarm collector duration UI', () => {
  test('button shows adjusted duration', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};
    ctx.resources = { colony: { glass: { displayName: 'Glass' }, electronics: { displayName: 'Electronics' }, components: { displayName: 'Components' } } };
    ctx.spaceManager = {
      planetStatuses: { mars: { terraformed: false } },
      getTerraformedPlanetCount() {
        return Object.values(this.planetStatuses).filter(p => p.terraformed).length;
      }
    };

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'dysonswarmUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.renderDysonSwarmUI = renderDysonSwarmUI; this.updateDysonSwarmUI = updateDysonSwarmUI; this.projectElements = projectElements;', ctx);

    const project = {
      name: 'dyson',
      collectorCost: { colony: { glass: 1000, electronics: 1000, components: 1000 } },
      collectors: 0,
      energyPerCollector: 0,
      get collectorDuration() {
        const count = ctx.spaceManager.getTerraformedPlanetCount ?
          ctx.spaceManager.getTerraformedPlanetCount() : 0;
        return 60000 / (count + 1);
      },
      collectorProgress: 0,
      autoDeployCollectors: false,
      isCompleted: true,
      canStartCollector: () => true,
      startCollector: () => {},
      renderUI(container) { ctx.renderDysonSwarmUI(this, container); },
      updateUI() { ctx.updateDysonSwarmUI(this); }
    };

    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    ctx.projectElements = vm.runInContext('projectElements', ctx);
    project.updateUI();

    const text = ctx.projectElements.dyson.startButton.textContent;
    expect(text).toBe('Deploy Collector (60s)');

    ctx.spaceManager.planetStatuses = {
      mars: { terraformed: false },
      titan: { terraformed: true },
      europa: { terraformed: true }
    };
    project.updateUI();
    const text2 = ctx.projectElements.dyson.startButton.textContent;
    expect(text2).toBe('Deploy Collector (20s)');
  });
});
