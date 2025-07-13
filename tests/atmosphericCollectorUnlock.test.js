const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Atmospheric Water Collector unlock trigger', () => {
  test('story trigger exists with condition objective', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress-data.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    const chapters = ctx.progressData.chapters;
    const ev = chapters.find(c => c.id === 'any.awCollector');
    expect(ev).toBeDefined();
    const obj = ev.objectives[0];
    expect(obj.type).toBe('condition');
    expect(obj.conditionId).toBe('shouldUnlockAtmosphericWaterCollector');
    const reward = ev.reward.find(r => r.targetId === 'atmosphericWaterCollector');
    expect(reward).toBeDefined();
  });
});
