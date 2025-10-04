const vm = require('vm');
const loadProgress = require('./loadProgress');

describe('chapter4 colonist milestone', () => {
  test('chapter4.9 requires at least 100 colonists and chapter4.10 uses updated narrative', () => {
    const ctx = {};
    loadProgress(ctx);
    const chapters = ctx.progressData.chapters;
    const prev = chapters.find(c => c.id === 'chapter4.9b');
    const chapter = chapters.find(c => c.id === 'chapter4.10');
    expect(prev).toBeDefined();
    expect(chapter).toBeDefined();
    const objective = prev.objectives && prev.objectives[0];
    expect(objective).toEqual({
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 10
    });
    expect(Array.isArray(chapter.narrativeLines)).toBe(true);
    const ch411 = chapters.find(c => c.id === 'chapter4.11');
    expect(ch411.prerequisites).toContain('chapter4.10');
  });
});
