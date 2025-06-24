const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('earth probe objective', () => {
  test('checks repeat count and describes progress', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'progress.js'), 'utf8');
    const ctx = {
      console,
      document: { addEventListener: () => {}, removeEventListener: () => {}, getElementById: () => ({ textContent: '' }) },
      clearJournal: () => {},
      createPopup: () => {},
      addJournalEntry: () => {},
      addEffect: () => {},
      removeEffect: () => {},
      resources: {},
      buildings: {},
      colonies: {},
      terraforming: {},
      spaceManager: {},
      projectManager: { projects: { earthProbe: { repeatCount: 5, displayName: 'Earth Recon Probe' } } }
    };
    vm.createContext(ctx);
    vm.runInContext(code + '; this.StoryManager = StoryManager;', ctx);

    const manager = new ctx.StoryManager({ chapters: [] });
    ctx.storyManager = manager;

    const objective = { type: 'project', projectId: 'earthProbe', repeatCount: 10 };
    expect(manager.isObjectiveComplete(objective)).toBe(false);

    ctx.projectManager.projects.earthProbe.repeatCount = 10;
    expect(manager.isObjectiveComplete(objective)).toBe(true);
    expect(manager.describeObjective(objective)).toBe('Earth Recon Probe: 10/10');
  });
});
