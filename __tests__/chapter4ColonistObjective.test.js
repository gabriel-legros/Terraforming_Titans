const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('chapter4 colonist milestone', () => {
  test('chapter4.9 requires at least 100 colonists and chapter4.10 uses updated narrative', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'progress-data.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
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
      quantity: 100
    });
    expect(chapter.narrative).toMatch(/two beams of light.*giant asteroid/);
    expect(chapter.nextChapter).toBe('chapter4.11');
  });
});
