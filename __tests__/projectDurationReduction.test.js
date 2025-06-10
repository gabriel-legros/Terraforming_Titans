const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EffectableEntity = require('../effectable-entity.js');

describe('projectDurationReduction effect', () => {
  let context;
  beforeEach(() => {
    context = {
      console,
      EffectableEntity,
    };
    vm.createContext(context);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager; this.Project = Project;', context);

    context.resources = {
      colony: { funding: { value: 0, decrease: () => {}, modifyRate: () => {} } },
      special: { spaceships: { value: 0 } }
    };
    context.buildings = {};
    context.colonies = {};
    context.populationModule = {};
    context.tabManager = {};
    context.fundingModule = {};
    context.terraforming = {};
    context.lifeDesigner = {};
    context.lifeManager = {};
    context.oreScanner = {};

    global.resources = context.resources;
    global.buildings = context.buildings;
    global.colonies = context.colonies;
    global.populationModule = context.populationModule;
    global.tabManager = context.tabManager;
    global.fundingModule = context.fundingModule;
    global.terraforming = context.terraforming;
    global.lifeDesigner = context.lifeDesigner;
    global.lifeManager = context.lifeManager;
    global.oreScanner = context.oreScanner;

    context.projectManager = new context.ProjectManager();
    global.projectManager = context.projectManager;
  });

  test('reduces project starting duration', () => {
    const params = { test: { name: 'Test', duration: 100, description: '', cost: {}, category: 'resources', unlocked: true } };
    context.projectManager.initializeProjects(params);
    context.projectManager.addAndReplace({ type: 'projectDurationReduction', value: 0.2, effectId: 'skill', sourceId: 'skill' });
    const project = context.projectManager.projects.test;
    project.start(context.resources);
    expect(project.startingDuration).toBeCloseTo(80);
  });

  test('adjusts ongoing project on effect', () => {
    const params = { test: { name: 'Test', duration: 100, description: '', cost: {}, category: 'resources', unlocked: true } };
    context.projectManager.initializeProjects(params);
    const project = context.projectManager.projects.test;
    project.start(context.resources);
    project.update(50);
    expect(project.remainingTime).toBeCloseTo(50);
    context.projectManager.addAndReplace({ type: 'projectDurationReduction', value: 0.2, effectId: 'skill', sourceId: 'skill' });
    expect(project.startingDuration).toBeCloseTo(80);
    expect(project.remainingTime).toBeCloseTo(40);
  });
});
