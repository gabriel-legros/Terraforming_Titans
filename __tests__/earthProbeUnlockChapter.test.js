const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('earth probe unlock chapter', () => {
  test('chapter4.12 unlocks the earthProbe project at 100 colonists', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'progress-data.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    const chapters = ctx.progressData.chapters;
    const ch411 = chapters.find(c => c.id === 'chapter4.11');
    const ch412 = chapters.find(c => c.id === 'chapter4.12');
    const ch413 = chapters.find(c => c.id === 'chapter4.13');
    expect(ch411.nextChapter).toBe('chapter4.12');
    expect(ch412).toBeDefined();
    const obj = ch412.objectives && ch412.objectives[0];
    expect(obj).toEqual({
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 100
    });
    const reward = ch412.reward.find(r => r.target === 'project' && r.targetId === 'earthProbe' && r.type === 'enable');
    const subtabEffect = ch412.reward.find(r => r.target === 'projectManager' && r.type === 'activateProjectSubtab' && r.targetId === 'story-projects');
    expect(reward).toBeDefined();
    expect(subtabEffect).toBeDefined();
    expect(ch412.nextChapter).toBe('chapter4.13');
    expect(ch413).toBeDefined();
  });
});
