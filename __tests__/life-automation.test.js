require('../src/js/effectable-entity.js');
const { LifeAutomation } = require('../src/js/automation/life-automation.js');
const { LifeDesign } = require('../src/js/life.js');

describe('LifeAutomation', () => {
  beforeEach(() => {
    global.lifeShopCategories = [
      { name: 'research' },
      { name: 'funding' }
    ];
    global.lifeDesigner = {
      getTotalPointCost: jest.fn(),
      canAfford: jest.fn(),
      buyPoint: jest.fn()
    };
    global.resources = {
      colony: {
        research: { value: 0 },
        funding: { value: 0 }
      }
    };
  });

  test('auto purchase respects threshold and max cost', () => {
    const automation = new LifeAutomation();
    const preset = automation.getActivePreset();
    preset.enabled = true;
    automation.setPurchaseEnabled(preset.id, 'research', true);
    automation.setPurchaseThreshold(preset.id, 'research', 50);

    global.resources.colony.research.value = 200;
    global.lifeDesigner.getTotalPointCost.mockReturnValue(100);
    global.lifeDesigner.canAfford.mockReturnValue(true);

    automation.applyAutoPurchases(preset);
    expect(global.lifeDesigner.buyPoint).toHaveBeenCalledWith('research', 1);

    global.lifeDesigner.buyPoint.mockClear();
    automation.setPurchaseMaxCost(preset.id, 'research', 80);
    automation.applyAutoPurchases(preset);
    expect(global.lifeDesigner.buyPoint).not.toHaveBeenCalled();
  });

  test('auto purchase skips when disabled', () => {
    const automation = new LifeAutomation();
    const preset = automation.getActivePreset();
    preset.purchaseEnabled = false;
    automation.setPurchaseEnabled(preset.id, 'research', true);

    global.resources.colony.research.value = 200;
    global.lifeDesigner.getTotalPointCost.mockReturnValue(100);
    global.lifeDesigner.canAfford.mockReturnValue(true);

    automation.applyAutoPurchases(preset);
    expect(global.lifeDesigner.buyPoint).not.toHaveBeenCalled();
  });

  test('buildCandidateDesign allocates remaining points on the last step', () => {
    global.LifeDesign = LifeDesign;
    const automation = new LifeAutomation();
    const preset = automation.getActivePreset();
    preset.designSteps = [
      { id: 1, attribute: 'minTemperatureTolerance', amount: 2, mode: 'fixed' },
      { id: 2, attribute: 'photosynthesisEfficiency', amount: 0, mode: 'remaining' }
    ];
    global.lifeDesigner.currentDesign = new LifeDesign(0, 0, 0, 0, 0, 0, 0, 0, 0);
    global.lifeDesigner.maxLifeDesignPoints = () => 5;

    const candidate = automation.buildCandidateDesign(preset);
    expect(candidate.minTemperatureTolerance.value).toBe(2);
    expect(candidate.photosynthesisEfficiency.value).toBe(3);
  });

  test('buildCandidateDesign supports negative optimal temperature adjustments', () => {
    global.LifeDesign = LifeDesign;
    const automation = new LifeAutomation();
    const preset = automation.getActivePreset();
    preset.designSteps = [
      { id: 1, attribute: 'optimalGrowthTemperature', amount: -3, mode: 'fixed' }
    ];
    global.lifeDesigner.currentDesign = new LifeDesign(0, 0, 0, 0, 0, 0, 0, 0, 0);
    global.lifeDesigner.maxLifeDesignPoints = () => 3;

    const candidate = automation.buildCandidateDesign(preset);
    expect(candidate.optimalGrowthTemperature.value).toBe(-3);
  });

  test('moveDesignStep reorders life automation steps', () => {
    const automation = new LifeAutomation();
    const preset = automation.getActivePreset();
    preset.designSteps = [
      { id: 1, attribute: 'invasiveness', amount: 1, mode: 'fixed' },
      { id: 2, attribute: 'radiationTolerance', amount: 1, mode: 'fixed' },
      { id: 3, attribute: 'spaceEfficiency', amount: 1, mode: 'fixed' }
    ];

    automation.moveDesignStep(preset.id, 2, -1);
    expect(preset.designSteps.map(step => step.id)).toEqual([2, 1, 3]);
  });

  test('insertDesignStep adds a new step above or below', () => {
    const automation = new LifeAutomation();
    const preset = automation.getActivePreset();
    preset.designSteps = [
      { id: 1, attribute: 'invasiveness', amount: 1, mode: 'fixed' },
      { id: 2, attribute: 'radiationTolerance', amount: 1, mode: 'fixed' }
    ];

    automation.insertDesignStep(preset.id, 2, -1);
    expect(preset.designSteps[1].id).not.toBe(2);
    expect(preset.designSteps[2].id).toBe(2);
  });

  test('changing auto design during deployment cancels and redeploys', () => {
    global.LifeDesign = LifeDesign;
    global.automationManager = { enabled: true, hasFeature: () => true };
    const automation = new LifeAutomation();
    const preset = automation.getActivePreset();
    preset.enabled = true;
    automation.addDesignStep(preset.id);
    const step = preset.designSteps[0];

    const originalCanSurvive = LifeDesign.prototype.canSurviveAnywhere;
    LifeDesign.prototype.canSurviveAnywhere = () => true;

    global.lifeDesigner = {
      currentDesign: new LifeDesign(0, 0, 0, 0, 0, 0, 0, 0, 0),
      maxLifeDesignPoints: () => 2,
      replaceDesign: jest.fn(function (design) { this.tentativeDesign = design; }),
      confirmDesign: jest.fn(),
      cancelDeployment: jest.fn(function () { this.isActive = false; }),
      isActive: true
    };
    global.document = { dispatchEvent: jest.fn() };
    global.Event = function () {};
    global.updateLifeUI = jest.fn();

    automation.updateDesignStep(preset.id, step.id, { amount: 1 });

    expect(global.lifeDesigner.cancelDeployment).toHaveBeenCalled();
    expect(global.lifeDesigner.confirmDesign).toHaveBeenCalled();

    LifeDesign.prototype.canSurviveAnywhere = originalCanSurvive;
    delete global.automationManager;
  });

  test('populateDesignStepsFromCurrentDesign builds steps with metabolism last', () => {
    global.LifeDesign = LifeDesign;
    const automation = new LifeAutomation();
    const preset = automation.getActivePreset();
    global.lifeDesigner.currentDesign = new LifeDesign(1, 2, 4, 3, 5, 6, 7, 8, 9);
    global.lifeDesigner.currentDesign.optimalGrowthTemperature.value = -2;

    automation.populateDesignStepsFromCurrentDesign(preset.id);

    expect(preset.designSteps.length).toBeGreaterThan(0);
    const lastStep = preset.designSteps[preset.designSteps.length - 1];
    expect(lastStep.attribute).toBe('photosynthesisEfficiency');
    expect(lastStep.mode).toBe('remaining');
    const optimalStep = preset.designSteps.find(step => step.attribute === 'optimalGrowthTemperature');
    expect(optimalStep.amount).toBe(-2);
  });

  test('auto design deploys only when improvement meets the threshold', () => {
    global.LifeDesign = LifeDesign;
    const automation = new LifeAutomation();
    const preset = automation.getActivePreset();
    preset.enabled = true;
    automation.addDesignStep(preset.id);
    automation.setDeployImprovement(preset.id, 2);

    const originalCanSurvive = LifeDesign.prototype.canSurviveAnywhere;
    LifeDesign.prototype.canSurviveAnywhere = () => true;

    global.lifeDesigner = {
      currentDesign: new LifeDesign(0, 0, 0, 0, 0, 0, 0, 0, 0),
      maxLifeDesignPoints: () => 2,
      replaceDesign: jest.fn(function (design) { this.tentativeDesign = design; }),
      confirmDesign: jest.fn(),
      isActive: false
    };
    global.document = { dispatchEvent: jest.fn() };
    global.Event = function () {};
    global.updateLifeUI = jest.fn();

    automation.applyAutoDesign(preset);
    expect(global.lifeDesigner.confirmDesign).not.toHaveBeenCalled();

    automation.setDeployImprovement(preset.id, 1);
    automation.applyAutoDesign(preset);
    expect(global.lifeDesigner.confirmDesign).toHaveBeenCalled();

    LifeDesign.prototype.canSurviveAnywhere = originalCanSurvive;
  });

  test('auto design skips when disabled', () => {
    global.LifeDesign = LifeDesign;
    const automation = new LifeAutomation();
    const preset = automation.getActivePreset();
    preset.designEnabled = false;
    automation.addDesignStep(preset.id);

    const originalCanSurvive = LifeDesign.prototype.canSurviveAnywhere;
    LifeDesign.prototype.canSurviveAnywhere = () => true;

    global.lifeDesigner = {
      currentDesign: new LifeDesign(0, 0, 0, 0, 0, 0, 0, 0, 0),
      maxLifeDesignPoints: () => 2,
      replaceDesign: jest.fn(function (design) { this.tentativeDesign = design; }),
      confirmDesign: jest.fn(),
      isActive: false
    };
    global.document = { dispatchEvent: jest.fn() };
    global.Event = function () {};
    global.updateLifeUI = jest.fn();

    automation.applyAutoDesign(preset);
    expect(global.lifeDesigner.confirmDesign).not.toHaveBeenCalled();

    LifeDesign.prototype.canSurviveAnywhere = originalCanSurvive;
  });
});
