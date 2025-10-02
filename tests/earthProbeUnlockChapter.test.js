const vm = require('vm');
const loadProgress = require('./loadProgress');

describe('earth probe unlock chapter', () => {
  test('chapter4.12 unlocks the earthProbe project at 100 colonists', () => {
    const ctx = {};
    loadProgress(ctx);
    const chapters = ctx.progressData.chapters;
    const ch411 = chapters.find(c => c.id === 'chapter4.11');
    const ch412 = chapters.find(c => c.id === 'chapter4.12');
    const ch413 = chapters.find(c => c.id === 'chapter4.13');
    expect(ch412.prerequisites).toContain('chapter4.11');
    expect(ch412).toBeDefined();
    const obj = ch411.objectives && ch411.objectives[0];
    expect(obj).toEqual({
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 100
    });
    const reward = ch412.reward.find(r => r.target === 'project' && r.targetId === 'earthProbe' && r.type === 'enable');
    const subtabEffect = ch412.reward.find(r => r.target === 'projectManager' && r.type === 'activateSubtab' && r.targetId === 'story-projects');
    expect(reward).toBeDefined();
    expect(subtabEffect).toBeDefined();
    expect(ch413.prerequisites).toContain('chapter4.12b');
    expect(ch413).toBeDefined();
  });
});
