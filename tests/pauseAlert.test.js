const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('pause alert message', () => {
  test('appears and disappears with pause state', () => {
    const dom = new JSDOM('<!DOCTYPE html><button id="pause-button">Pause</button><div id="pause-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.game = { scene: { pause: () => {}, resume: () => {} } };
    ctx.gameSpeed = 1;
    ctx.setGameSpeed = s => { ctx.gameSpeed = s; };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'pause.js'), 'utf8');
    vm.runInContext(code + '; this.togglePause = togglePause;', ctx);

    const box = dom.window.document.getElementById('pause-container');

    ctx.togglePause();
    expect(box.textContent).toBe('PAUSED');

    ctx.togglePause();
    expect(box.textContent).toBe('');
  });
});
