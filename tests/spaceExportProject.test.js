const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceExportProject', () => {
  test('initializes with default disposal and calculates cost', () => {
    const ctx = { console, EffectableEntity, shipEfficiency: 1 };
    vm.createContext(ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const exportBase = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceExportBaseProject.js'), 'utf8');
    vm.runInContext(exportBase + '; this.SpaceExportBaseProject = SpaceExportBaseProject;', ctx);
    const exportSubclass = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceExportProject.js'), 'utf8');
    vm.runInContext(exportSubclass + '; this.SpaceExportProject = SpaceExportProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.exportResources;
    expect(config.type).toBe('SpaceExportProject');

    const project = new ctx.SpaceExportProject(config, 'exportResources');
    expect(project.selectedDisposalResource).toEqual(config.attributes.defaultDisposal);

    project.assignedSpaceships = 200;
    const totalCost = project.calculateSpaceshipTotalCost();

    expect(totalCost.colony.metal).toBeCloseTo(2 * config.attributes.costPerShip.colony.metal);
    expect(totalCost.colony.energy).toBeCloseTo(2 * config.attributes.costPerShip.colony.energy);
  });
});
