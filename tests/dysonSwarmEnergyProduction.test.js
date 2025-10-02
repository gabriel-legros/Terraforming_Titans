const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Dyson Swarm energy production', () => {
  test('completed project no longer adds energy', () => {
    const ctx = {
      console,
      EffectableEntity,
      resources: {
        colony: {
          energy: {
            value: 0,
            modifyRate: jest.fn(),
            updateStorageCap: () => {},
            increase(amount) { this.value += amount; }
          },
          glass: { value: 2000, decrease: () => {}, updateStorageCap: () => {} },
          electronics: { value: 2000, decrease: () => {}, updateStorageCap: () => {} },
          components: { value: 2000, decrease: () => {}, updateStorageCap: () => {} }
        }
      },
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const baseCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'TerraformingDurationProject.js'), 'utf8');
    vm.runInContext(baseCode + '; this.TerraformingDurationProject = TerraformingDurationProject;', ctx);
    const dysonCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'dysonswarm.js'), 'utf8');
    vm.runInContext(dysonCode + '; this.DysonSwarmReceiverProject = DysonSwarmReceiverProject;', ctx);

    const params = { name: 'Dyson', category: 'mega', cost: {}, duration: 0, description: '', repeatable: false, unlocked: true, attributes: {} };
    const project = new ctx.DysonSwarmReceiverProject(params, 'dyson');
    project.isCompleted = true;
    project.collectors = 3;
    project.energyPerCollector = 50;

    project.estimateCostAndGain();
    const changes = { colony: { energy: 0 } };
    project.applyCostAndGain(1000, changes);
    ctx.resources.colony.energy.value += changes.colony.energy;

    expect(ctx.resources.colony.energy.modifyRate).not.toHaveBeenCalled();
    expect(ctx.resources.colony.energy.value).toBe(0);
  });
});
