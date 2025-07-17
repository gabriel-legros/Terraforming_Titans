const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceDisposalProject temperature settings persistence', () => {
  test('saveState and loadState preserve fields', () => {
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

    const config = { name:'Dispose', category:'resources', cost:{}, duration:1, description:'', repeatable:true, maxRepeatCount:Infinity, unlocked:true, attributes:{ spaceExport:true, disposalAmount:1 } };
    const project = new ctx.SpaceDisposalProject(config, 'dispose');
    project.disableBelowTemperature = true;
    project.disableTemperatureThreshold = 290;

    const saved = project.saveState();
    const loaded = new ctx.SpaceDisposalProject(config, 'dispose');
    loaded.loadState(saved);

    expect(loaded.disableBelowTemperature).toBe(true);
    expect(loaded.disableTemperatureThreshold).toBe(290);
  });
});
