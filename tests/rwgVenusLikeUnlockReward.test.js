const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Chapter20.17 reward unlocks venus-like type', () => {
  test('addEffect reward unlocks venus-like type', () => {
    const ctx = {
      console,
      fundingModule: {},
      populationModule: {},
      projectManager: {},
      tabManager: {},
      globalEffects: {},
      terraforming: {},
      lifeDesigner: {},
      lifeManager: {},
      oreScanner: {},
      researchManager: {},
      solisManager: {},
      spaceManager: {},
      warpGateCommand: {}
    };
    vm.createContext(ctx);
    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    const rwgCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwg.js'), 'utf8');
    vm.runInContext(`${effectCode}\n${rwgCode}`, ctx);
    expect(vm.runInContext('rwgManager.isTypeLocked("venus-like");', ctx)).toBe(true);
    vm.runInContext('addEffect({ target: "rwgManager", type: "unlockType", targetId: "venus-like" });', ctx);
    expect(vm.runInContext('rwgManager.isTypeLocked("venus-like");', ctx)).toBe(false);
  });

  test('story chapter20.17 includes unlockType reward', () => {
    const direct = require('../src/js/story/venus.js');
    let chapters = Array.isArray(direct.chapters) ? direct.chapters : undefined;
    if (!chapters || chapters.length === 0) {
      const storyCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/story', 'venus.js'), 'utf8');
      const ctx = { console };
      ctx.globalThis = ctx;
      vm.createContext(ctx);
      vm.runInContext(storyCode, ctx);
      chapters = ctx.progressVenus.chapters;
    }
    const chapter = chapters.find(ch => ch.id === 'chapter20.17');
    const hasReward = chapter.reward.some(r => r.target === 'rwgManager' && r.type === 'unlockType' && r.targetId === 'venus-like');
    expect(hasReward).toBe(true);
  });
});
