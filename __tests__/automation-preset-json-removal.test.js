const { removeAutomationPresetValueAtPath } = require('../src/js/automation/automationUI.js');

describe('Automation preset JSON field removal', () => {
  it('prunes emptied Space Storage selection containers from a teleporter-rate preset', () => {
    const preset = {
      projects: {
        spaceStorageOperations: {
          operations: {
            selectedResources: [{
              category: 'surface',
              resource: 'liquidWater'
            }],
            resourceTransferModes: {
              liquidWater: 'withdraw'
            },
            teleporterTransferRate: 1000
          }
        }
      }
    };

    removeAutomationPresetValueAtPath(
      preset,
      ['projects', 'spaceStorageOperations', 'operations', 'selectedResources', 0, 'category']
    );
    removeAutomationPresetValueAtPath(
      preset,
      ['projects', 'spaceStorageOperations', 'operations', 'selectedResources', 0, 'resource']
    );
    removeAutomationPresetValueAtPath(
      preset,
      ['projects', 'spaceStorageOperations', 'operations', 'resourceTransferModes', 'liquidWater']
    );

    expect(preset.projects.spaceStorageOperations.operations).toEqual({
      teleporterTransferRate: 1000
    });
  });
});
