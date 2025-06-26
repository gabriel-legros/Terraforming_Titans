const fs = require('fs');
const path = require('path');
const vm = require('vm');
const numbers = require('../numbers.js');

describe('solisPoints objective', () => {
  test('checks solis points and describes progress', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'progress.js'), 'utf8');
    const ctx = {
      console,
      document: { addEventListener: () => {}, removeEventListener: () => {} },
      clearJournal: () => {},
      createPopup: () => {},
      addJournalEntry: () => {},
      addEffect: () => {},
      removeEffect: () => {},
      formatNumber: numbers.formatNumber,
      resources: {},
      buildings: {},
      colonies: {},
      terraforming: {},
      projectManager: {},
      spaceManager: {},
      solisManager: { solisPoints: 0 }
    };
    vm.createContext(ctx);
    vm.runInContext(code + '; this.StoryManager = StoryManager;', ctx);

    const manager = new ctx.StoryManager({ chapters: [] });

    const obj = { type: 'solisPoints', points: 1 };
    expect(manager.isObjectiveComplete(obj)).toBe(false);
    expect(manager.describeObjective(obj)).toBe('Solis Points: 0/1');
    ctx.solisManager.solisPoints = 2;
    expect(manager.isObjectiveComplete(obj)).toBe(true);
    expect(manager.describeObjective(obj)).toBe('Solis Points: 2/1');
  });
});
