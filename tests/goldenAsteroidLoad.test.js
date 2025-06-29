const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('golden asteroid countdown load', () => {
  test('creates countdown element when loading active countdown', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="gold-asteroid-container"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.document = dom.window.document;
    ctx.addEffect = () => {};
    ctx.removeEffect = () => {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'gold-asteroid.js'), 'utf8');
    vm.runInContext(`${code}; this.GoldenAsteroid = GoldenAsteroid;`, ctx);

    const asteroid = new ctx.GoldenAsteroid();
    asteroid.startCountdown(1000);
    const saved = asteroid.saveState();

    const asteroid2 = new ctx.GoldenAsteroid();
    asteroid2.loadState(saved);

    expect(asteroid2.countdownElement).not.toBeNull();
    expect(() => asteroid2.update(100)).not.toThrow();
  });
});
