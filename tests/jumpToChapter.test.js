const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('StoryManager jumpToChapter', () => {
  test('activates specified chapter and completes previous ones', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress.js'), 'utf8');
    const context = {
      console,
      setTimeout: (fn) => fn(),
      clearTimeout: () => {},
      document: {
        addEventListener: () => {},
        removeEventListener: () => {},
        getElementById: () => null
      },
      addEffect: jest.fn(),
      removeEffect: jest.fn(),
      clearJournal: jest.fn(),
      loadJournalEntries: jest.fn(),
      createPopup: () => {},
      createSystemPopup: () => {},
      addJournalEntry: jest.fn(),
      buildings: {},
      colonies: {},
      resources: {},
      terraforming: {},
      projectManager: { projects: {} },
      progressData: {
        chapters: [
          { id: 'c1', type: 'journal', narrative: 'one', reward: [{ target: 'global', type: 'dummy' }] },
          { id: 'c2', type: 'journal', narrative: 'two', reward: [], prerequisites: ['c1'] }
        ]
      }
    };
    vm.createContext(context);
    vm.runInContext(code + '; this.StoryManager = StoryManager;', context);
    const manager = new context.StoryManager(context.progressData);
    context.window = { storyManager: manager };

    manager.jumpToChapter('c2');

    expect(Array.from(manager.completedEventIds)).toEqual(['c1']);
    expect(manager.activeEventIds.has('c2')).toBe(true);
    expect(context.addJournalEntry).toHaveBeenCalledWith('two', 'c2', { type: 'chapter', id: 'c2' });
    expect(context.loadJournalEntries).toHaveBeenCalled();
    expect(context.addEffect).toHaveBeenCalledWith({ target: 'global', type: 'dummy' });
  });

  test('marks project objectives completed when jumping', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress.js'), 'utf8');
    const context = {
      console,
      setTimeout: (fn) => fn(),
      clearTimeout: () => {},
      document: {
        addEventListener: () => {},
        removeEventListener: () => {},
        getElementById: () => null
      },
      addEffect: jest.fn(),
      removeEffect: jest.fn(),
      clearJournal: jest.fn(),
      loadJournalEntries: jest.fn(),
      createPopup: () => {},
      createSystemPopup: () => {},
      addJournalEntry: jest.fn(),
      buildings: {},
      colonies: {},
      resources: {},
      terraforming: {},
      projectManager: { projects: { proj: { repeatCount: 0, unlocked: false, isCompleted: false } } },
      progressData: {
        chapters: [
          {
            id: 'c1',
            type: 'journal',
            narrative: 'one',
            objectives: [{ type: 'project', projectId: 'proj', repeatCount: 2 }]
          },
          { id: 'c2', type: 'journal', narrative: 'two', prerequisites: ['c1'] }
        ]
      }
    };
    vm.createContext(context);
    vm.runInContext(code + '; this.StoryManager = StoryManager;', context);
    const manager = new context.StoryManager(context.progressData);
    context.window = { storyManager: manager };

    manager.jumpToChapter('c2');

    const proj = context.projectManager.projects.proj;
    expect(proj.repeatCount).toBe(2);
    expect(proj.isCompleted).toBe(true);
  });
});
