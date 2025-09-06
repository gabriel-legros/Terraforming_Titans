const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Chapter17.5 reward unlocks hot orbit', () => {
  test('addEffect reward unlocks hot orbit', () => {
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
    expect(vm.runInContext('rwgManager.isOrbitLocked("hot");', ctx)).toBe(true);
    vm.runInContext('addEffect({ target: "rwgManager", type: "unlockOrbit", targetId: "hot" });', ctx);
    expect(vm.runInContext('rwgManager.isOrbitLocked("hot");', ctx)).toBe(false);
  });

  test('story chapter17.5 includes unlockOrbit reward', () => {
    const progressVega2 = require('../src/js/story/vega2.js');
    const chapter = progressVega2.chapters.find(ch => ch.id === 'chapter17.5');
    const hasReward = chapter.reward.some(r => r.target === 'rwgManager' && r.type === 'unlockOrbit' && r.targetId === 'hot');
    expect(hasReward).toBe(true);
  });
});
