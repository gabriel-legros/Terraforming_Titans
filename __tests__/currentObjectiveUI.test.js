const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('current objective UI', () => {
  test('updates element with progress text', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="current-objective"></div>`, {
      runScripts: 'outside-only'
    });
    const ctx = dom.getInternalVMContext();

    ctx.console = console;
    ctx.document = dom.window.document;
    ctx.addJournalEntry = () => {};
    ctx.createPopup = () => {};
    ctx.clearJournal = () => {};
    ctx.addEffect = () => {};
    ctx.removeEffect = () => {};

    ctx.resources = { colony: { metal: { value: 50 } } };
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
    expect(text).toBe('Objective: metal: 50/100');
  });
});
