const fs = require('fs');
const path = require('path');
const vm = require('vm');
const loadProgress = require('./loadProgress');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Interrogate Alien story steps', () => {
  test('final step only printed once', () => {
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const projectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');

    const ctx = {
      console,
      EffectableEntity,
      addJournalEntry: jest.fn(),
      addEffect: () => {},
      removeEffect: () => {},
      resources: {},
      buildings: {},
      colonies: {}
    };
    vm.createContext(ctx);
    vm.runInContext(paramsCode + projectCode, ctx);
    loadProgress(ctx);
    vm.runInContext('; this.Project = Project; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.interrogate_alien;
    const project = new ctx.Project(config, 'interrogate_alien');

    for (let i = 0; i < 3; i++) {
      project.isActive = true;
      project.remainingTime = 0;
      project.complete();
    }

    // Call complete again without increasing repeatCount
    project.complete();

    expect(ctx.addJournalEntry).toHaveBeenCalledTimes(3);
    expect(ctx.addJournalEntry.mock.calls[2][0]).toContain('Translation uplink complete');
  });
});
