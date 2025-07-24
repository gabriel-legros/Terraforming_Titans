const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Deeper mining effect updates with depth', () => {
  test('ore mine multiplier adjusts when average depth changes', () => {
    const oreMine = new EffectableEntity({ description: 'oreMine' });
    oreMine.name = 'oreMine';
    oreMine.count = 2;
    global.buildings = { oreMine };
    global.EffectableEntity = EffectableEntity;
    global.addEffect = (effect) => {
      if (effect.target === 'building' && effect.targetId === 'oreMine') {
        oreMine.addAndReplace(effect);
      }
    };
    const ctx = { console, EffectableEntity, buildings: global.buildings, addEffect: global.addEffect };
    vm.createContext(ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const androidCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'AndroidProject.js'), 'utf8');
    vm.runInContext(androidCode + '; this.AndroidProject = AndroidProject;', ctx);
    const deeperCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'DeeperMiningProject.js'), 'utf8');
    vm.runInContext(deeperCode + '; this.DeeperMiningProject = DeeperMiningProject;', ctx);

    const config = {
      name: 'deeperMining',
      category: 'infrastructure',
      cost: {},
      duration: 1,
      description: '',
      repeatable: true,
      maxDepth: Infinity,
      unlocked: true,
      attributes: {
        effectScaling: true,
        completionEffect: [{
          target: 'building',
          targetId: 'oreMine',
          effectId: 'deeper_mining',
          type: 'productionMultiplier',
          value: 1
        }]
      }
    };

    const project = new ctx.DeeperMiningProject(config, 'deeperMining');
    project.repeatCount = 1;
    project.averageDepth = 2;
    project.applyCompletionEffect();
    let effect = oreMine.activeEffects.find(e => e.effectId === 'deeper_mining');
    expect(effect.value).toBe(2);

    oreMine.count = 3;
    project.registerMine();
    effect = oreMine.activeEffects.find(e => e.effectId === 'deeper_mining');
    expect(effect.value).toBeCloseTo(project.averageDepth);
  });
});
