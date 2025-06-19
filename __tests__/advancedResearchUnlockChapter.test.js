const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('advanced research unlock chapter', () => {
  test('chapter4.11 unlocks advanced research resource and tab', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'progress-data.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    const chapters = ctx.progressData.chapters;
    const ch4_10 = chapters.find(c => c.id === 'chapter4.10');
    const ch4_11 = chapters.find(c => c.id === 'chapter4.11');
    expect(ch4_10.nextChapter).toBe('chapter4.11');
    expect(ch4_11).toBeDefined();
    const resEffect = ch4_11.reward.find(r => r.target === 'resource' && r.resourceType === 'colony' && r.targetId === 'advancedResearch' && r.type === 'enable');
    const flagEffect = ch4_11.reward.find(r => r.target === 'researchManager' && r.type === 'booleanFlag' && r.flagId === 'advancedResearchUnlocked' && r.value === true);
    expect(resEffect).toBeDefined();
    expect(flagEffect).toBeDefined();
  });
});
