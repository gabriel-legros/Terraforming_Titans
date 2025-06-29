const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EffectableEntity = require('../src/js/effectable-entity.js');

describe('space project subclasses', () => {
  test('manager creates correct subclass instances', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager; this.Project = Project;', ctx);
    const spaceship = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceship + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const exportBase = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceExportBaseProject.js'), 'utf8');
    vm.runInContext(exportBase + '; this.SpaceExportBaseProject = SpaceExportBaseProject;', ctx);
    const exportSubclass = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceExportProject.js'), 'utf8');
    vm.runInContext(exportSubclass + '; this.SpaceExportProject = SpaceExportProject;', ctx);
    const disposalSubclass = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceDisposalProject.js'), 'utf8');
    vm.runInContext(disposalSubclass + '; this.SpaceDisposalProject = SpaceDisposalProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.resources = { colony: { metal: { value: 0, updateStorageCap: () => {} } }, special: { spaceships: { value: 0 } } };
    ctx.buildings = {};
    ctx.colonies = {};
    ctx.projectManager = new ctx.ProjectManager();
    ctx.projectManager.initializeProjects({
      exportResources: ctx.projectParameters.exportResources,
      disposeResources: ctx.projectParameters.disposeResources
    });

    expect(ctx.projectManager.projects.exportResources instanceof ctx.SpaceExportProject).toBe(true);
    expect(ctx.projectManager.projects.disposeResources instanceof ctx.SpaceDisposalProject).toBe(true);
  });
});
