const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('MilestonesManager festival stacking', () => {
  test('additional festivals extend countdown duration', () => {
    const dom = new JSDOM(`<!DOCTYPE html>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.addEffect = () => {};
    ctx.removeEffect = () => {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'milestones.js'), 'utf8');
    vm.runInContext(`${code}; this.MilestonesManager = MilestonesManager;`, ctx);

    const manager = new ctx.MilestonesManager();
    manager.startCountdown(1000);
    expect(manager.countdownRemainingTime).toBe(1000);
    manager.startCountdown(500);
    expect(manager.countdownRemainingTime).toBe(1500);
    expect(manager.countdownActive).toBe(true);
  });
});
