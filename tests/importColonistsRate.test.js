const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Import colonists auto-start rate', () => {
  test('adds colonist rate while active', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projCode + '; this.Project = Project;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.resources = {
      colony: {
        colonists: { value: 0, modifyRate: jest.fn(), decrease(){}, updateStorageCap(){} }
      }
    };
    global.resources = ctx.resources;

    const config = ctx.projectParameters.import_colonists_1;
    const project = new ctx.Project(config, 'import');
    project.unlocked = true;
    project.start(ctx.resources);
    project.autoStart = true;

    project.estimateCostAndGain();

    const expected = (1000 * config.attributes.resourceGain.colony.colonists) / config.duration;
    expect(ctx.resources.colony.colonists.modifyRate).toHaveBeenCalled();
    const call = ctx.resources.colony.colonists.modifyRate.mock.calls[0];
    expect(call[0]).toBeCloseTo(expected);
    expect(call[1]).toBe('Import colonists');
    expect(call[2]).toBe('project');
  });
});
