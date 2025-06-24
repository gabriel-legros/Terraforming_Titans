const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('water pump unlock chapter', () => {
  test('water pump is unlocked at liquid water milestone chapter', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'progress-data.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    const chapters = ctx.progressData.chapters;
    const ch1_17 = chapters.find(c => c.id === 'chapter1.17');
    const ch3_2 = chapters.find(c => c.id === 'chapter3.2');
    expect(ch1_17.reward.find(r => r.targetId === 'waterPump')).toBeUndefined();
    const reward = ch3_2.reward.find(r => r.target === 'building' && r.targetId === 'waterPump' && r.type === 'enable');
    expect(reward).toBeDefined();
  });
});
