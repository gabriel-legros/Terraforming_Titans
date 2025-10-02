const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Resource } = require('../src/js/resource.js');
const { NanotechManager } = require('../src/js/nanotech.js');

describe('nanotech energy usage limit', () => {
  test('swarm consumption capped by energy percent', () => {
    const energy = new Resource({ name: 'energy', category: 'colony', initialValue: 1000, hasCap: true, baseCap: 1e9 });
    const silicon = new Resource({ name: 'silicon', category: 'colony', initialValue: 0 });
    const glass = new Resource({ name: 'glass', category: 'colony', initialValue: 0 });
    energy.modifyRate(1000, 'Generator', 'building');
    global.resources = { colony: { energy, silicon, glass } };
    global.structures = {};
    const nm = new NanotechManager();
    nm.enabled = true;
    nm.nanobots = 1e15; // requires 1000 W
    nm.maxEnergyPercent = 10; // 10%
    nm.growthSlider = 10;
    const acc = { colony: { energy: 0, silicon: 0, glass: 0 } };
    nm.produceResources(1000, acc);
    expect(nm.currentEnergyConsumption).toBeCloseTo(100, 5);
    expect(acc.colony.energy).toBeCloseTo(-100);
    expect(energy.consumptionRate).toBeCloseTo(100);
  });

  test('swarm consumption capped by absolute limit', () => {
    const energy = new Resource({ name: 'energy', category: 'colony', initialValue: 1000, hasCap: true, baseCap: 1e9 });
    const silicon = new Resource({ name: 'silicon', category: 'colony', initialValue: 0 });
    const glass = new Resource({ name: 'glass', category: 'colony', initialValue: 0 });
    energy.modifyRate(1000, 'Generator', 'building');
    global.resources = { colony: { energy, silicon, glass } };
    global.structures = {};
    const nm = new NanotechManager();
    nm.enabled = true;
    nm.nanobots = 1e15; // requires 1000 W
    nm.energyLimitMode = 'absolute';
    nm.maxEnergyAbsolute = 200; // 200 W cap
    nm.growthSlider = 10;
    const acc = { colony: { energy: 0, silicon: 0, glass: 0 } };
    nm.produceResources(1000, acc);
    expect(nm.currentEnergyConsumption).toBeCloseTo(200, 5);
    expect(acc.colony.energy).toBeCloseTo(-200);
    expect(energy.consumptionRate).toBeCloseTo(200);
  });

  test('absolute energy limit input uses MW', () => {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><div id="colony-structures-section"><div id="colony-buildings-buttons"></div></div><div id="colony-controls-section"></div>');
    global.document = dom.window.document;
    global.window = dom.window;
    global.Event = dom.window.Event;
    const energy = new Resource({ name: 'energy', category: 'colony', initialValue: 0 });
    global.resources = { colony: { energy }, surface: { land: new Resource({ name: 'land', category: 'surface', initialValue: 1, hasCap: true, baseCap: 1 }) } };
    global.structures = {};
    global.colonies = {};
    global.buildings = {};
    global.addEffect = jest.fn();
    global.removeEffect = jest.fn();
    global.formatNumber = (n) => n;
    const nm = new NanotechManager();
    nm.enable();
    nm.energyLimitMode = 'absolute';
    nm.updateUI();
    const modeSelect = document.getElementById('nanotech-energy-limit-mode');
    const absOption = modeSelect.querySelector('option[value="absolute"]');
    expect(absOption.textContent).toBe('absolute (MW)');
    const input = document.getElementById('nanotech-energy-limit');
    input.value = '5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(nm.maxEnergyAbsolute).toBeCloseTo(5e6);
    nm.updateUI();
    expect(input.value).toBe('5');
  });

  test('absolute energy limit accepts scientific notation', () => {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><div id="colony-structures-section"><div id="colony-buildings-buttons"></div></div><div id="colony-controls-section"></div>');
    global.document = dom.window.document;
    global.window = dom.window;
    global.Event = dom.window.Event;
    const energy = new Resource({ name: 'energy', category: 'colony', initialValue: 0 });
    global.resources = { colony: { energy }, surface: { land: new Resource({ name: 'land', category: 'surface', initialValue: 1, hasCap: true, baseCap: 1 }) } };
    global.structures = {};
    global.colonies = {};
    global.buildings = {};
    global.addEffect = jest.fn();
    global.removeEffect = jest.fn();
    global.formatNumber = (n) => n;
    const nm = new NanotechManager();
    nm.enable();
    nm.energyLimitMode = 'absolute';
    nm.updateUI();
    const input = document.getElementById('nanotech-energy-limit');
    input.value = '1e3';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(nm.maxEnergyAbsolute).toBeCloseTo(1e9);
    nm.updateUI();
    expect(input.value).toBe('1000');
  });
});
