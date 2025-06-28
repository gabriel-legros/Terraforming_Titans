const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../numbers.js');

describe('current objective UI', () => {
  test('updates element with progress text', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="current-objective"></div>`, {
      runScripts: 'outside-only'
    });
    const ctx = dom.getInternalVMContext();

    ctx.console = console;
    ctx.document = dom.window.document;
    ctx.formatNumber = numbers.formatNumber;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;
    ctx.addJournalEntry = () => {};
    ctx.createPopup = () => {};
    ctx.clearJournal = () => {};
    ctx.addEffect = () => {};
    ctx.removeEffect = () => {};

    ctx.resources = { colony: { metal: { value: 50, displayName: 'Metal' } } };
    ctx.buildings = {};
    ctx.colonies = {};
    ctx.terraforming = {};
    ctx.spaceManager = {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'progress.js'), 'utf8');
    vm.runInContext(`${code}; this.StoryManager = StoryManager;`, ctx);

    const progressData = { chapters: [ { id: 'c1', type: 'journal', narrative: '', objectives: [ { type: 'collection', resourceType: 'colony', resource: 'metal', quantity: 100 } ] } ] };
    const manager = new ctx.StoryManager(progressData);
    ctx.storyManager = manager;

    const event = manager.findEventById('c1');
    manager.activateEvent(event);
    manager.update();

    const text = dom.window.document.getElementById('current-objective').textContent;
    expect(text).toBe('Objective: Metal: 50/100');
  });

  test('uses building display name', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="current-objective"></div>`, {
      runScripts: 'outside-only'
    });
    const ctx = dom.getInternalVMContext();

    ctx.console = console;
    ctx.document = dom.window.document;
    ctx.formatNumber = numbers.formatNumber;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;
    ctx.addJournalEntry = () => {};
    ctx.createPopup = () => {};
    ctx.clearJournal = () => {};
    ctx.addEffect = () => {};
    ctx.removeEffect = () => {};

    ctx.resources = { colony: {} };
    ctx.buildings = { oreMine: { count: 1, displayName: 'Ore Mine' } };
    ctx.colonies = {};
    ctx.terraforming = {};
    ctx.spaceManager = {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'progress.js'), 'utf8');
    vm.runInContext(`${code}; this.StoryManager = StoryManager;`, ctx);

    const progressData = { chapters: [ { id: 'c1', type: 'journal', narrative: '', objectives: [ { type: 'building', buildingName: 'oreMine', quantity: 2 } ] } ] };
    const manager = new ctx.StoryManager(progressData);
    ctx.storyManager = manager;

    const event = manager.findEventById('c1');
    manager.activateEvent(event);
    manager.update();

    const text = dom.window.document.getElementById('current-objective').textContent;
    expect(text).toBe('Objective: Ore Mine: 1/2');
  });

  test('describes terraforming objective with friendly text', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="current-objective"></div>`, {
      runScripts: 'outside-only'
    });
    const ctx = dom.getInternalVMContext();

    ctx.console = console;
    ctx.document = dom.window.document;
    ctx.formatNumber = numbers.formatNumber;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;
    ctx.addJournalEntry = () => {};
    ctx.createPopup = () => {};
    ctx.clearJournal = () => {};
    ctx.addEffect = () => {};
    ctx.removeEffect = () => {};

    ctx.resources = { colony: {} };
    ctx.buildings = {};
    ctx.colonies = {};
    ctx.terraforming = {
      temperature: { zones: { tropical: { value: 220, night: 210, day: 230 } } },
      calculateTotalPressure: () => 15
    };
    ctx.spaceManager = {};
    ctx.gameSettings = { useCelsius: false };
    global.gameSettings = ctx.gameSettings;

    const code = fs.readFileSync(path.join(__dirname, '..', 'progress.js'), 'utf8');
    vm.runInContext(`${code}; this.StoryManager = StoryManager;`, ctx);

    const progressData = { chapters: [ { id: 'c1', type: 'journal', narrative: '', objectives: [ { type: 'terraforming', terraformingParameter: 'tropicalTemperature', value: 238 } ] } ] };
    const manager = new ctx.StoryManager(progressData);
    ctx.storyManager = manager;

    const event = manager.findEventById('c1');
    manager.activateEvent(event);
    manager.update();

    const text = dom.window.document.getElementById('current-objective').textContent;
    expect(text).toBe('Objective: Equatorial Temp: 220.00K/238.00K');
  });

  test('describes terraforming objective using Celsius when enabled', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="current-objective"></div>`, {
      runScripts: 'outside-only'
    });
    const ctx = dom.getInternalVMContext();

    ctx.console = console;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;
    ctx.document = dom.window.document;
    ctx.formatNumber = numbers.formatNumber;
    ctx.addJournalEntry = () => {};
    ctx.createPopup = () => {};
    ctx.clearJournal = () => {};
    ctx.addEffect = () => {};
    ctx.removeEffect = () => {};

    ctx.resources = { colony: {} };
    ctx.buildings = {};
    ctx.colonies = {};
    ctx.terraforming = {
      temperature: { zones: { tropical: { value: 220, night: 210, day: 230 } } },
      calculateTotalPressure: () => 15
    };
    ctx.spaceManager = {};
    ctx.gameSettings = { useCelsius: true };
    global.gameSettings = ctx.gameSettings;

    const code = fs.readFileSync(path.join(__dirname, '..', 'progress.js'), 'utf8');
    vm.runInContext(`${code}; this.StoryManager = StoryManager;`, ctx);

    const progressData = { chapters: [ { id: 'c1', type: 'journal', narrative: '', objectives: [ { type: 'terraforming', terraformingParameter: 'tropicalTemperature', value: 238 } ] } ] };
    const manager = new ctx.StoryManager(progressData);
    ctx.storyManager = manager;

    const event = manager.findEventById('c1');
    manager.activateEvent(event);
    manager.update();

    const text = dom.window.document.getElementById('current-objective').textContent;
    expect(text).toBe('Objective: Equatorial Temp: -53.15°C/-35.15°C');
  });
});
