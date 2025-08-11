const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('golden asteroid repeated load', () => {
  test('replaces existing countdown element on subsequent loads', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="gold-asteroid-container"></div><div id="game-container"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.document = dom.window.document;
    ctx.addEffect = () => {};
    ctx.removeEffect = () => {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'gold-asteroid.js'), 'utf8');
    vm.runInContext(`${code}; this.GoldenAsteroid = GoldenAsteroid;`, ctx);

    const asteroid1 = new ctx.GoldenAsteroid();
    asteroid1.startCountdown(1000);
    const saved = asteroid1.saveState();

    const asteroid2 = new ctx.GoldenAsteroid();
    asteroid2.loadState(saved);

    const container = dom.window.document.getElementById('gold-asteroid-container');
    expect(container.children.length).toBe(1);
  });
});
