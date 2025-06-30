const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('HOPE tab unlock chapter', () => {
  test('HOPE tab unlock occurs before final chapters', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress-data.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    const chapters = ctx.progressData.chapters;
    const last = chapters[chapters.length - 1];
    expect(last.id).toBe('chapter6.3b');
    const hopeChapter = chapters.find(c => c.id === 'chapter4.9');
    expect(hopeChapter).toBeDefined();
    const effect = hopeChapter.reward.find(r => r.targetId === 'hope-tab' && r.type === 'enable');
    expect(effect).toBeDefined();
    const next = chapters.find(c => c.prerequisites && c.prerequisites.includes('chapter4.9'));
    expect(next && next.id).toBe('chapter4.9b');
  });
});
