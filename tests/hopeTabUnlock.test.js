const vm = require('vm');
const loadProgress = require('./loadProgress');

describe('HOPE tab unlock chapter', () => {
  test('HOPE tab unlock occurs before final chapters', () => {
    const ctx = {};
    loadProgress(ctx);
    const chapters = ctx.progressData.chapters;
    const hopeChapter = chapters.find(c => c.id === 'chapter4.9');
    expect(hopeChapter).toBeDefined();
    const effect = hopeChapter.reward.find(r => r.targetId === 'hope-tab' && r.type === 'enable');
    expect(effect).toBeDefined();
    const next = chapters.find(c => c.prerequisites && c.prerequisites.includes('chapter4.9'));
    expect(next && next.id).toBe('chapter4.9b');
  });
});
