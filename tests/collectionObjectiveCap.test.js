const { StoryManager } = require('../src/js/progress.js');

describe('collection objective checkCap', () => {
  test('uses resource cap when checkCap is true', () => {
    global.resources = { colony: { workers: { value: 0, cap: 100 } } };
    const originalDocument = global.document;
    global.document = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
    const sm = new StoryManager({ chapters: [] });
    const objective = { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 50, checkCap: true };
    expect(sm.isObjectiveComplete(objective)).toBe(true);
    sm.destroy();
    global.document = originalDocument;
  });

  test('describeObjective shows cap progress when checkCap is true', () => {
    global.resources = { colony: { workers: { value: 0, cap: 40, displayName: 'Workers' } } };
    const originalDocument = global.document;
    global.document = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
    const sm = new StoryManager({ chapters: [] });
    const objective = { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 50, checkCap: true };
    expect(sm.describeObjective(objective)).toBe('Workers Cap: 40/50');
    sm.destroy();
    global.document = originalDocument;
  });
});
