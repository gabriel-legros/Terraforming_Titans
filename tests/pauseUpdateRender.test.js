const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('pause button render', () => {
  test('calls updateRender once when pausing', () => {
    const dom = new JSDOM('<!DOCTYPE html><button id="pause-button">Pause</button><div id="pause-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.game = { scene: { pause: () => {}, resume: () => {} } };
    ctx.setGameSpeed = () => {};
    const calls = [];
    ctx.updateRender = (flag) => calls.push(flag);
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'pause.js'), 'utf8');
    vm.runInContext(code + '; this.togglePause = togglePause;', ctx);

    ctx.togglePause();
    expect(calls).toEqual([true]);

    ctx.togglePause();
    expect(calls).toEqual([true]);
  });
});
