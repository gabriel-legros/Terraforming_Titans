const vm = require('vm');
const loadProgress = require('./loadProgress');

describe('Demo ending after chapter6.3b', () => {
  test('chapter6.3b does not enable Callisto and chapter6.3c is a system pop-up', () => {
    const ctx = {};
    loadProgress(ctx);
    const chapters = ctx.progressData.chapters;
    const ch63b = chapters.find(c => c.id === 'chapter6.3b');
    const ch63c = chapters.find(c => c.id === 'chapter6.3c');
    expect(ch63b).toBeDefined();
    expect(ch63c).toBeDefined();
    const reward = ch63b.reward.find(r => r.target === 'spaceManager' && r.targetId === 'callisto' && r.type === 'enable');
    expect(reward).toBeUndefined();
    expect(ch63c.type).toBe('journal');
  });
});
