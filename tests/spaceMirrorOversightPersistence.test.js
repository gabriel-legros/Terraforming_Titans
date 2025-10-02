const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceMirrorFacilityProject oversight save/load', () => {
  test('saveState preserves settings and loadState handles missing data', () => {
    const ctx = {
      console,
      EffectableEntity,
      projectElements: {},
      buildings: {},
      terraforming: { calculateMirrorEffect: () => ({ interceptedPower: 0, powerPerUnitArea: 0 }) },
      formatNumber: () => '',
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const mirrorCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceMirrorFacilityProject.js'), 'utf8');
    vm.runInContext(mirrorCode + '; this.SpaceMirrorFacilityProject = SpaceMirrorFacilityProject;', ctx);

    const config = { name: 'Mirror', category: 'structures', cost: {}, duration: 0, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true };
    const project = new ctx.SpaceMirrorFacilityProject(config, 'spaceMirrorFacility');
    ctx.mirrorOversightSettings = project.mirrorOversightSettings;

    ctx.mirrorOversightSettings.distribution.tropical = 0.5;
    ctx.mirrorOversightSettings.applyToLantern = true;
    ctx.mirrorOversightSettings.assignmentStep.mirrors = 5;
    ctx.mirrorOversightSettings.assignmentStep.lanterns = 2;
    ctx.mirrorOversightSettings.targets.tropical = 300;
    ctx.mirrorOversightSettings.tempMode.polar = 'night';
    ctx.mirrorOversightSettings.priority.focus = 3;
    ctx.mirrorOversightSettings.autoAssign.tropical = true;
    ctx.mirrorOversightSettings.assignments.mirrors.tropical = 2;

    const saved = project.saveState();
    const oldSave = { ...saved };
    delete oldSave.mirrorOversightSettings;

    ctx.resetMirrorOversightSettings();

    const loaded = new ctx.SpaceMirrorFacilityProject(config, 'spaceMirrorFacility');
    ctx.mirrorOversightSettings = loaded.mirrorOversightSettings;
    loaded.loadState(saved);

    expect(ctx.mirrorOversightSettings.distribution.tropical).toBe(0.5);
    expect(ctx.mirrorOversightSettings.applyToLantern).toBe(true);
    expect(ctx.mirrorOversightSettings.assignmentStep.mirrors).toBe(5);
    expect(ctx.mirrorOversightSettings.assignmentStep.lanterns).toBe(2);
    expect(ctx.mirrorOversightSettings.targets.tropical).toBe(300);
    expect(ctx.mirrorOversightSettings.tempMode.polar).toBe('night');
    expect(ctx.mirrorOversightSettings.priority.focus).toBe(3);
    expect(ctx.mirrorOversightSettings.autoAssign.tropical).toBe(true);
    expect(ctx.mirrorOversightSettings.assignments.mirrors.tropical).toBe(2);

    ctx.resetMirrorOversightSettings();
    const loadedOld = new ctx.SpaceMirrorFacilityProject(config, 'spaceMirrorFacility');
    ctx.mirrorOversightSettings = loadedOld.mirrorOversightSettings;
    loadedOld.loadState(oldSave);

    expect(ctx.mirrorOversightSettings.applyToLantern).toBe(false);
    expect(ctx.mirrorOversightSettings.distribution.tropical).toBe(0);
  });
});
