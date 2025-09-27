const loadProgress = require('./loadProgress');

describe('stop hiding regular research chapter', () => {
  test('chapter4.2 sets stopHidingRegular flag', () => {
    const ctx = {};
    loadProgress(ctx);
    const chapters = ctx.progressData.chapters;
    const ch = chapters.find(c => c.id === 'chapter4.2');
    expect(ch.reward).toBeDefined();
    const flagEffect = ch.reward.find(r => r.target === 'researchManager' && r.type === 'booleanFlag' && r.flagId === 'stopHidingRegular' && r.value === true);
    expect(flagEffect).toBeDefined();
  });
});
