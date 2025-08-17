const fs = require('fs');
const path = require('path');
const vm = require('vm');
const numbers = require('../src/js/numbers.js');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('worker resource negative display and rate hiding', () => {
  test('PopulationModule allows negative workers when demand exceeds supply', () => {
    const ctx = { console, EffectableEntity };
    ctx.resources = {
      colony: {
        colonists: {
          value: 5,
          cap: 100,
          modifyRate: () => {},
          increase(v) { this.value += v; },
          decrease(v) { this.value -= v; },
        },
        workers: { value: 0, cap: 0 },
        androids: { value: 0, cap: 0 },
      },
    };
    ctx.buildings = {
      factory: {
        active: 1,
        getTotalWorkerNeed: () => 8,
        getEffectiveWorkerMultiplier: () => 1,
      },
    };
    ctx.colonies = {
      base: { active: 1, storage: { colony: { colonists: 100 } }, happiness: 0.5 },
    };
    ctx.projectManager = {
      getAssignedAndroids: () => 0,
      forceUnassignAndroids: () => {},
    };
    vm.createContext(ctx);
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'population.js'), 'utf8');
    vm.runInContext(code + '; this.PopulationModule = PopulationModule;', ctx);
    const module = new ctx.PopulationModule(ctx.resources, { workerRatio: 1 });
    module.updatePopulation(1000);
    expect(ctx.resources.colony.workers.value).toBe(-3);
  });

  test('worker resource displays negative value without rate', () => {
    const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
    const { JSDOM } = require(jsdomPath);
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatDuration = numbers.formatDuration;
    ctx.populationModule = { getEffectiveWorkerRatio: () => 0.5 };
    ctx.resources = { colony: {} };
    ctx.buildings = {};
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const workers = {
      name: 'workers',
      displayName: 'Workers',
      category: 'colony',
      value: -5,
      cap: 60,
      hasCap: true,
      unlocked: true,
      hideRate: true,
      reserved: 0,
      productionRate: 0,
      consumptionRate: 0,
      productionRateBySource: {},
      consumptionRateBySource: {},
      unit: null,
      isBooleanFlagSet: () => false,
    };

    ctx.createResourceDisplay({ colony: { workers } });
    ctx.updateResourceDisplay({ colony: { workers } });

    const valueEl = dom.window.document.getElementById('workers-resources-container');
    expect(valueEl.textContent.trim().startsWith('-')).toBe(true);
    expect(dom.window.document.getElementById('workers-pps-resources-container')).toBeNull();
  });
});

