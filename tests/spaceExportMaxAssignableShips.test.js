const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceExportProject max assignable ships', () => {
  function setupContext() {
    const ctx = {
      console,
      EffectableEntity,
      shipEfficiency: 1,
      projectElements: {},
      formatNumber: (value) => value,
      formatBigInteger: (value) => value.toString(),
    };

    ctx.resources = {
      colony: { metal: { displayName: 'Metal', value: 0 } },
      special: { spaceships: { value: 0 } },
    };

    vm.createContext(ctx);

    const projectsPath = path.join(__dirname, '..', 'src/js', 'projects.js');
    const projectsCode = fs.readFileSync(projectsPath, 'utf8');
    vm.runInContext(`${projectsCode}; this.Project = Project;`, ctx);

    const spaceshipPath = path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js');
    const spaceshipCode = fs.readFileSync(spaceshipPath, 'utf8');
    vm.runInContext(`${spaceshipCode}; this.SpaceshipProject = SpaceshipProject;`, ctx);

    const exportBasePath = path.join(__dirname, '..', 'src/js/projects', 'SpaceExportBaseProject.js');
    const exportBaseCode = fs.readFileSync(exportBasePath, 'utf8');
    vm.runInContext(`${exportBaseCode}; this.SpaceExportBaseProject = SpaceExportBaseProject;`, ctx);

    const exportPath = path.join(__dirname, '..', 'src/js/projects', 'SpaceExportProject.js');
    const exportCode = fs.readFileSync(exportPath, 'utf8');
    vm.runInContext(`${exportCode}; this.SpaceExportProject = SpaceExportProject;`, ctx);

    return ctx;
  }

  test('getMaxAssignableShips is independent of current assignment below continuous threshold', () => {
    const ctx = setupContext();
    ctx.resources.special.spaceships.value = 200;

    const config = {
      name: 'export',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: false,
      maxRepeatCount: 1,
      unlocked: true,
      attributes: {
        spaceExport: true,
        disposalAmount: 1000,
        disposable: { colony: ['metal'] },
        defaultDisposal: { category: 'colony', resource: 'metal' },
      },
    };

    const project = new ctx.SpaceExportProject(config, 'export');

    const maxBefore = project.getMaxAssignableShips();
    project.assignSpaceships(50);
    const maxAfter = project.getMaxAssignableShips();

    expect(maxAfter).toBe(maxBefore);
  });
});
