const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');

describe('Deeper mining effect updates with depth', () => {
  test('ore mine multipliers adjust when average depth changes', () => {
    global.maintenanceFraction = 0.1;
    const oreConfig = {
      name: 'Ore Mine',
      category: 'resource',
      cost: { colony: { metal: 50, components: 10 } },
      consumption: { colony: { energy: 1 } },
      production: { colony: { metal: 1 } },
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: true,
      maintenanceFactor: 1,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: true
    };
    const oreMine = new Building(oreConfig, 'oreMine');
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
    let consume = oreMine.activeEffects.find(e => e.effectId === 'deeper_mining_consumption');
    expect(consume.value).toBe(2);
    let maintMetal = oreMine.activeEffects.find(e => e.effectId === 'deeper_mining_maintenance_metal');
    expect(maintMetal.value).toBe(2);
    let maintComp = oreMine.activeEffects.find(e => e.effectId === 'deeper_mining_maintenance_components');
    expect(maintComp.value).toBe(2);

    oreMine.count = 3;
    project.registerMine();
    effect = oreMine.activeEffects.find(e => e.effectId === 'deeper_mining');
    expect(effect.value).toBeCloseTo(project.averageDepth);
    consume = oreMine.activeEffects.find(e => e.effectId === 'deeper_mining_consumption');
    expect(consume.value).toBeCloseTo(project.averageDepth);
    maintMetal = oreMine.activeEffects.find(e => e.effectId === 'deeper_mining_maintenance_metal');
    expect(maintMetal.value).toBeCloseTo(project.averageDepth);
    maintComp = oreMine.activeEffects.find(e => e.effectId === 'deeper_mining_maintenance_components');
    expect(maintComp.value).toBeCloseTo(project.averageDepth);
  });
});
