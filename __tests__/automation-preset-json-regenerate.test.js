const { JSDOM } = require('jsdom');
const {
  createAutomationPresetJsonDetails,
  updateAutomationPresetJsonDetails
} = require('../src/js/automation/automationUI.js');

describe('Automation preset JSON regeneration', () => {
  let dom;

  beforeEach(() => {
    dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://terraforming-titans.test/'
    });
    global.window = dom.window;
    global.document = dom.window.document;
    global.t = (path, vars, fallback) => fallback;
  });

  afterEach(() => {
    dom.window.close();
    delete global.document;
    delete global.window;
    delete global.t;
  });

  it('validates a regenerated disposal target against the complete draft preset', () => {
    const preset = {
      id: 'dispose-preset',
      projects: {
        disposeResources: {
          operations: {
            disposalTargets: [{
              selectedDisposalResource: {
                category: 'atmospheric',
                resource: 'oxygen'
              }
            }]
          }
        }
      }
    };
    const newTargetPath = ['projects', 'disposeResources', 'operations', 'disposalTargets', 1, 'selectedDisposalResource'];
    const onFieldChange = jest.fn();
    const getFieldOptions = (fieldPath, value, candidatePreset) => {
      if (fieldPath[fieldPath.length - 1] !== 'resource') {
        return null;
      }
      const target = candidatePreset.projects.disposeResources.operations.disposalTargets[fieldPath[4]];
      const selection = target.selectedDisposalResource;
      return {
        selectOptions: [{ value: selection.resource, label: selection.resource }]
      };
    };
    const details = createAutomationPresetJsonDetails('regenerated-disposal-target-test');

    updateAutomationPresetJsonDetails(details, preset, {
      onFieldChange,
      getFieldOptions
    });
    details._jsonDraftMap = {
      category: {
        path: newTargetPath.concat('category'),
        value: 'surface',
        included: true
      },
      resource: {
        path: newTargetPath.concat('resource'),
        value: 'ammoniaIce',
        included: true
      }
    };
    details._saveButton.disabled = false;

    details._saveButton.click();

    expect(onFieldChange).toHaveBeenCalledTimes(2);
    expect(onFieldChange).toHaveBeenCalledWith(newTargetPath.concat('resource'), 'ammoniaIce');
  });
});
