const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('advanced research unlock chapter', () => {
  test('chapter4.10 unlocks advanced research resource and tab', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress-data.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    const chapters = ctx.progressData.chapters;
    const ch4_10 = chapters.find(c => c.id === 'chapter4.10');
    const ch4_11 = chapters.find(c => c.id === 'chapter4.11');
    expect(ch4_11.prerequisites).toContain('chapter4.10');
    expect(ch4_10.reward).toBeDefined();
    const resEffect = ch4_10.reward.find(r => r.target === 'resource' && r.resourceType === 'colony' && r.targetId === 'advancedResearch' && r.type === 'enable');
    const flagEffect = ch4_10.reward.find(r => r.target === 'researchManager' && r.type === 'booleanFlag' && r.flagId === 'advancedResearchUnlocked' && r.value === true);
    const tabEffect = ch4_10.reward.find(r => r.target === 'tab' && r.type === 'activateTab' && r.targetId === 'research');
    const subtabEffect = ch4_10.reward.find(r => r.target === 'researchManager' && r.type === 'activateSubtab' && r.targetId === 'advanced-research');
    expect(resEffect).toBeDefined();
    expect(flagEffect).toBeDefined();
    expect(tabEffect).toBeDefined();
    expect(subtabEffect).toBeDefined();
  });
});
