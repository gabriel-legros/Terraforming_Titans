const fs = require('fs');
const path = require('path');
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('space storage assignment multiplier persistence', () => {
  test('assignment multiplier persists through save and load', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: { special: { spaceships: { value: 0 } } },
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      spaceManager: {
        getTerraformedPlanetCount: () => 1,
        getTerraformedPlanetCountIncludingCurrent: () => 1,
      },
      projectManager: { getDurationMultiplier: () => 1 },
      formatNumber: numbers.formatNumber,
    };
    vm.createContext(ctx);
    vm.runInContext(
      'function capitalizeFirstLetter(s){ return s.charAt(0).toUpperCase() + s.slice(1); }',
      ctx
    );
    const projectsCode = fs.readFileSync(
      path.join(__dirname, '..', 'src/js', 'projects.js'),
      'utf8'
    );
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const shipCode = fs.readFileSync(
      path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'),
      'utf8'
    );
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const storageCode = fs.readFileSync(
      path.join(__dirname, '..', 'src/js/projects', 'SpaceStorageProject.js'),
      'utf8'
    );
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', ctx);

    const params = {
      name: 'spaceStorage',
      category: 'mega',
      cost: {},
      duration: 300000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        costPerShip: { colony: { energy: 1 } },
        transportPerShip: 1,
      },
    };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');
    project.assignmentMultiplier = 1000;
    const saved = project.saveState();
    const loaded = new ctx.SpaceStorageProject(params, 'spaceStorage');
    loaded.loadState(saved);
    expect(loaded.assignmentMultiplier).toBe(1000);
  });
});

