const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('golden asteroid onload after despawn', () => {
  test('onload handler does not throw when element removed before load', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="game-container"></div><div id="gold-asteroid-container"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.document = dom.window.document;
    ctx.addEffect = () => {};
    ctx.removeEffect = () => {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'gold-asteroid.js'), 'utf8');
    vm.runInContext(`${code}; this.GoldenAsteroid = GoldenAsteroid;`, ctx);

    const asteroid = new ctx.GoldenAsteroid();
    asteroid.spawn(1000);
    const el = asteroid.element;
    asteroid.despawn();
    expect(() => {
      if (typeof el.onload === 'function') {
        el.onload();
      }
    }).not.toThrow();
  });
});
