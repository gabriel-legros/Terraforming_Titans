const progressVega2 = require('../src/js/story/vega2.js');

describe('chapter 14.3 reversal effect', () => {
  test('applies reversal to space mirror facility project', () => {
    const chapter = progressVega2.chapters.find(c => c.id === 'chapter14.3');
    expect(chapter).toBeDefined();
    expect(chapter.reward).toContainEqual({
      target: 'project',
      targetId: 'spaceMirrorFacility',
      type: 'enableReversal'
    });
    const buildingReward = chapter.reward.find(
      r => r.target === 'building' && r.targetId === 'spaceMirror'
    );
    expect(buildingReward).toBeUndefined();
  });
});

