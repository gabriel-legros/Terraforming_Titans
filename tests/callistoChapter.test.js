const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Callisto chapter and unlock', () => {
  test('chapter6.3b enables Callisto and chapter6.4 requires traveling there', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress-data.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    const chapters = ctx.progressData.chapters;
    const ch63b = chapters.find(c => c.id === 'chapter6.3b');
    const ch64 = chapters.find(c => c.id === 'chapter6.4');
    expect(ch63b).toBeDefined();
    expect(ch64).toBeDefined();
    const reward = ch63b.reward.find(r => r.target === 'spaceManager' && r.targetId === 'callisto' && r.type === 'enable');
    expect(reward).toBeDefined();
    expect(ch64.prerequisites).toContain('chapter6.3b');
    const obj = ch64.objectives && ch64.objectives[0];
    expect(obj).toEqual({ type: 'currentPlanet', planetId: 'callisto' });
  });
});
