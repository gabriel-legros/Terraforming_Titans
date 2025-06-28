const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Milestones ready to claim contribute to happiness bonus', () => {
  test('getHappinessBonus counts ready milestones', () => {
    const dom = new JSDOM(`<!DOCTYPE html>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.addEffect = () => {};
    ctx.removeEffect = () => {};
    const code = fs.readFileSync(path.join(__dirname, '..', 'milestones.js'), 'utf8');
    vm.runInContext(`${code}; this.MilestonesManager = MilestonesManager;`, ctx);

    const manager = new ctx.MilestonesManager();
    const total = manager.milestones.length;

    expect(manager.getHappinessBonus()).toBe(0);

    manager.milestones[0].canBeCompleted = true;
    expect(manager.getHappinessBonus()).toBeCloseTo(10 / total);

    manager.milestones[0].isCompleted = true;
    manager.milestones[0].canBeCompleted = false;
    expect(manager.getHappinessBonus()).toBeCloseTo(10 / total);
  });
});
