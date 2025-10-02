const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('pause button', () => {
  test('toggles scene and button text', () => {
    const dom = new JSDOM('<!DOCTYPE html><button id="pause-button">Pause</button>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    const calls = [];
    ctx.game = { scene: { pause: () => calls.push('pause'), resume: () => calls.push('resume') } };
    ctx.gameSpeed = 1;
    ctx.setGameSpeed = (s) => { ctx.gameSpeed = s; };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'pause.js'), 'utf8');
    vm.runInContext(code + '; this.togglePause = togglePause; this.isGamePaused = isGamePaused;', ctx);

    const btn = dom.window.document.getElementById('pause-button');

    ctx.togglePause();
    expect(calls[0]).toBe('pause');
    expect(btn.textContent).toBe('Resume');
    expect(ctx.isGamePaused()).toBe(true);
    expect(ctx.gameSpeed).toBe(0);

    ctx.togglePause();
    expect(calls[1]).toBe('resume');
    expect(btn.textContent).toBe('Pause');
    expect(ctx.isGamePaused()).toBe(false);
    expect(ctx.gameSpeed).toBe(1);
  });
});
