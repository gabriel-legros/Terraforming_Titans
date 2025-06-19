const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('HOPE tab unlock chapter', () => {
  test('final chapter enables hope tab', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'progress-data.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    const chapters = ctx.progressData.chapters;
    const last = chapters[chapters.length - 1];
    expect(last.id).toBe('chapter4.9');
    const effect = last.reward.find(r => r.targetId === 'hope-tab' && r.type === 'enable');
    expect(effect).toBeDefined();
    const prev = chapters[chapters.length - 2];
    expect(prev.nextChapter).toBe('chapter4.9');
  });
});
