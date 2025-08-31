const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('golden asteroid interaction', () => {
  function setup() {
    const dom = new JSDOM(`<!DOCTYPE html><div id="game-container"></div><div id="gold-asteroid-container"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.addEffect = jest.fn();
    ctx.removeEffect = jest.fn();
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'gold-asteroid.js'), 'utf8');
    vm.runInContext(`${code}; this.GoldenAsteroid = GoldenAsteroid;`, ctx);
    return { dom, ctx };
  }

  test('mousedown triggers asteroid immediately', () => {
    const { dom, ctx } = setup();
    const asteroid = new ctx.GoldenAsteroid();
    asteroid.spawn(1000);
    const el = asteroid.element;
    el.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true }));
    expect(ctx.addEffect).toHaveBeenCalled();
    expect(asteroid.active).toBe(false);
  });

  test('dragstart also triggers asteroid', () => {
    const { dom, ctx } = setup();
    const asteroid = new ctx.GoldenAsteroid();
    asteroid.spawn(1000);
    const el = asteroid.element;
    el.dispatchEvent(new dom.window.Event('dragstart', { bubbles: true }));
    expect(ctx.addEffect).toHaveBeenCalled();
    expect(asteroid.active).toBe(false);
  });
});
