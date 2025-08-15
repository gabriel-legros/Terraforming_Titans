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

    expect(totalCost.colony.metal).toBeCloseTo(config.attributes.costPerShip.colony.metal);
    expect(totalCost.colony.energy).toBeCloseTo(config.attributes.costPerShip.colony.energy);
  });

  test('assignSpaceships respects export cap', () => {
    const ctx = { console, EffectableEntity, shipEfficiency: 1 };
    ctx.resources = { special: { spaceships: { value: 100 } }, colony: { metal: {} } };
    ctx.spaceManager = { getTerraformedPlanetCountExcludingCurrent: () => 2 };
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

    global.resources = ctx.resources;
    global.spaceManager = ctx.spaceManager;

    const config = ctx.projectParameters.exportResources;
    const project = new ctx.SpaceExportProject(config, 'exportResources');
    const maxShips = project.getMaxAssignableShips();

    project.assignSpaceships(100);
    expect(project.assignedSpaceships).toBe(Math.min(100, maxShips));
  });

  test('getExportCap excludes current terraformed world', () => {
    const ctx = { console, EffectableEntity, shipEfficiency: 1 };
    ctx.resources = { special: { spaceships: { value: 100 } }, colony: { metal: {} } };
    ctx.spaceManager = {
      getTerraformedPlanetCountExcludingCurrent: () => 1
    };
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

    global.resources = ctx.resources;
    global.spaceManager = ctx.spaceManager;

    const config = ctx.projectParameters.exportResources;
    const project = new ctx.SpaceExportProject(config, 'exportResources');

    // export cap uses the provided terraformed count
    expect(project.getExportCap()).toBe(1000000000);

    // change the count returned by space manager
    ctx.spaceManager.getTerraformedPlanetCountExcludingCurrent = () => 2;
    expect(project.getExportCap()).toBe(2000000000);
  });

  test('funding gain scales with ships in continuous mode', () => {
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
    const project = new ctx.SpaceExportProject(config, 'exportResources');
    project.assignedSpaceships = 150;
    project.selectedDisposalResource = { category: 'colony', resource: 'metal' };

    const duration = project.getEffectiveDuration();
    const gain = project.calculateSpaceshipTotalResourceGain(true);
    const expected =
      config.attributes.disposalAmount * ctx.shipEfficiency * project.assignedSpaceships * (1000 / duration) * config.attributes.fundingGainAmount;
    expect(gain.colony.funding).toBeCloseTo(expected);
  });
});
