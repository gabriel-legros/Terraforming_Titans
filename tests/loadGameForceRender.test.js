const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('loadGame render', () => {
  test('forces a render once after loading', () => {
    const dom = new JSDOM('<!DOCTYPE html>', { url: 'https://example.com', runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.console = console;
    ctx.initializeGameState = () => {};
    ctx.tabParameters = {};
    ctx.tabManager = { resetVisibility: () => {}, activateTab: () => {} };
    ctx.buildings = {};
    ctx.colonies = {};
    ctx.createBuildingButtons = () => {};
    ctx.createColonyButtons = () => {};
    ctx.recalculateLandUsage = () => {};
    const calls = [];
    ctx.updateRender = flag => calls.push(flag);

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'save.js'), 'utf8');
    vm.runInContext(code + '; this.loadGame = loadGame;', ctx);
    ctx.recalculateLandUsage = () => {};

    ctx.loadGame('{}');
    expect(calls).toEqual([true]);
  });
});
