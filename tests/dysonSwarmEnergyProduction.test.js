const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Dyson Swarm energy production', () => {
  test('completed project adds energy rate based on collectors', () => {
    const ctx = {
      console,
      EffectableEntity,
      resources: {
        colony: {
          energy: { value: 0, modifyRate: jest.fn(), updateStorageCap: () => {} },
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
    const dysonCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'dysonswarm.js'), 'utf8');
    vm.runInContext(dysonCode + '; this.DysonSwarmReceiverProject = DysonSwarmReceiverProject;', ctx);

    const params = { name: 'Dyson', category: 'mega', cost: {}, duration: 0, description: '', repeatable: false, unlocked: true, attributes: {} };
    const project = new ctx.DysonSwarmReceiverProject(params, 'dyson');
    project.isCompleted = true;
    project.collectors = 3;
    project.energyPerCollector = 50;

    project.estimateCostAndGain();

    expect(ctx.resources.colony.energy.modifyRate).toHaveBeenCalledWith(150, 'Dyson Swarm', 'project');
  });
});
