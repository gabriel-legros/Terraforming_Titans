const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceDisposalProject temperature disable', () => {
  let ctx;
  beforeEach(() => {
    ctx = { console, EffectableEntity, shipEfficiency: 1 };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const exportBase = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceExportBaseProject.js'), 'utf8');
    vm.runInContext(exportBase + '; this.SpaceExportBaseProject = SpaceExportBaseProject;', ctx);
    const disposalSubclass = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceDisposalProject.js'), 'utf8');
    vm.runInContext(disposalSubclass + '; this.SpaceDisposalProject = SpaceDisposalProject;', ctx);

    ctx.resources = { colony:{}, atmospheric:{}, surface:{}, underground:{}, special: { spaceships: { value: 1 } } };
    ctx.terraforming = { temperature: { value: 300 } };
    global.resources = ctx.resources;
    global.terraforming = ctx.terraforming;
    global.projectManager = { isBooleanFlagSet: () => false };
  });

  test('cannot start when below threshold', () => {
    const config = { name:'Dispose', category:'resources', cost:{}, duration:1, description:'', repeatable:true, maxRepeatCount:Infinity, unlocked:true, attributes:{ spaceExport:true, disposalAmount:1 } };
    const project = new ctx.SpaceDisposalProject(config, 'dispose');
    project.assignedSpaceships = 1;
    project.disableBelowTemperature = true;
    project.disableTemperatureThreshold = 303.15;
    expect(project.canStart()).toBe(false);
  });

  test('can start when above threshold', () => {
    const config = { name:'Dispose', category:'resources', cost:{}, duration:1, description:'', repeatable:true, maxRepeatCount:Infinity, unlocked:true, attributes:{ spaceExport:true, disposalAmount:1 } };
    const project = new ctx.SpaceDisposalProject(config, 'dispose');
    project.assignedSpaceships = 1;
    project.disableBelowTemperature = true;
    project.disableTemperatureThreshold = 295;
    expect(project.canStart()).toBe(true);
  });
});
