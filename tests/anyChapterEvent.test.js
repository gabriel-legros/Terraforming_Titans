const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Chapter -1 events do not change current chapter', () => {
  test('activating event keeps currentChapter', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress.js'), 'utf8');
    const dataCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress-data.js'), 'utf8');
    const atmoCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'atmo-collector-trigger.js'), 'utf8');

    const ctx = {
      resources: { surface: { ice: { value: 0 }, liquidWater: { value: 0 } } },
      terraforming: { calculateTotalPressure: () => 1, temperature: { zones: { tropical: { value: 400 } } } },
      boilingPointWater: () => 373,
      addJournalEntry: () => {},
      clearJournal: () => {},
      document: { addEventListener: () => {}, removeEventListener: () => {}, getElementById: () => null },
    };
    vm.createContext(ctx);
    vm.runInContext(atmoCode, ctx);
    vm.runInContext(dataCode, ctx);
    const event = ctx.progressData.chapters.find(c => c.id === 'any.awCollector');
    ctx.progressData = { chapters: [event] };
    vm.runInContext(code + '; this.StoryManager = StoryManager;', ctx);
    const manager = new ctx.StoryManager(ctx.progressData);
    manager.currentChapter = 5;
    manager.update();
    expect(manager.currentChapter).toBe(5);
  });
});
