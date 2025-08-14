const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceDisposalProject', () => {
  test('initializes from parameters and calculates disposal', () => {
    const ctx = { console, EffectableEntity, shipEfficiency: 1 };
    vm.createContext(ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const exportBase = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceExportBaseProject.js'), 'utf8');
    vm.runInContext(exportBase + '; this.SpaceExportBaseProject = SpaceExportBaseProject;', ctx);
    const disposalSubclass = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceDisposalProject.js'), 'utf8');
    vm.runInContext(disposalSubclass + '; this.SpaceDisposalProject = SpaceDisposalProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.disposeResources;
    expect(config.type).toBe('SpaceDisposalProject');

    const project = new ctx.SpaceDisposalProject(config, 'disposeResources');
    expect(project.selectedDisposalResource).toBeUndefined();

    project.assignedSpaceships = 200;
    project.selectedDisposalResource = { category: 'surface', resource: 'liquidWater' };
    const disposal = project.calculateSpaceshipTotalDisposal();

    expect(disposal.surface.liquidWater).toBeCloseTo(config.attributes.disposalAmount);
  });
});
