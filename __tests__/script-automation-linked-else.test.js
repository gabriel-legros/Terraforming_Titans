const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadScriptAutomation() {
  class ScriptVariableRegistry {
    toNumber(value) {
      return Number(value) || 0;
    }

    resolveValue(ref) {
      return Number(ref && ref.constant) || 0;
    }

    describeReference(ref) {
      return String(ref && ref.constant);
    }
  }

  const source = fs.readFileSync(
    path.join(__dirname, '../src/js/automation/script-automation.js'),
    'utf8'
  );
  return vm.runInNewContext(`${source}\nScriptAutomation`, {
    ScriptVariableRegistry,
    automationManager: { enabled: true },
    formatNumber: value => String(value),
  });
}

function createCase(lines, targetName) {
  const ScriptAutomation = loadScriptAutomation();
  const automation = new ScriptAutomation();
  const script = automation.getSelectedScript();
  const byName = {};

  script.lines = lines.map((spec) => {
    const line = automation.createLine(spec.kind || 'if');
    line.name = spec.name;
    byName[spec.name] = line;
    return line;
  });

  lines.forEach((spec) => {
    if (spec.link) {
      byName[spec.name].linkedIfLineId = byName[spec.link].id;
    }
  });

  return automation.getValidLinkedIfOptions(script, byName[targetName]).map(line => line.name);
}

function setConditionResult(line, result) {
  line.condition.clauses[0].left.terms[0].ref.constant = result ? 1 : 0;
  line.condition.clauses[0].right.terms[0].ref.constant = result ? 0 : 1;
}

describe('Script automation linked ELSE eligibility', () => {
  test.each([
    {
      name: 'single IF is eligible',
      lines: [{ name: 'IF1' }, { name: 'ELSE', kind: 'else' }],
      target: 'ELSE',
      expected: ['IF1'],
    },
    {
      name: 'nested IFs are both eligible before closure',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'ELSE', kind: 'else' }],
      target: 'ELSE',
      expected: ['IF1', 'IF2'],
    },
    {
      name: 'inner ELSE leaves outer IF eligible',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'ELSE1', kind: 'else', link: 'IF2' }, { name: 'ELSE2', kind: 'else' }],
      target: 'ELSE2',
      expected: ['IF1'],
    },
    {
      name: 'outer ELSE closes nested IF',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'ELSE1', kind: 'else', link: 'IF1' }, { name: 'ELSE2', kind: 'else' }],
      target: 'ELSE2',
      expected: [],
    },
    {
      name: 'ELSE IF continuation is eligible for ELSE',
      lines: [{ name: 'IF1' }, { name: 'ELSEIF1', kind: 'elseIf', link: 'IF1' }, { name: 'ELSE1', kind: 'else' }],
      target: 'ELSE1',
      expected: ['ELSEIF1'],
    },
    {
      name: 'ELSE after ELSE IF closes chain',
      lines: [{ name: 'IF1' }, { name: 'ELSEIF1', kind: 'elseIf', link: 'IF1' }, { name: 'ELSE1', kind: 'else', link: 'ELSEIF1' }, { name: 'ELSE2', kind: 'else' }],
      target: 'ELSE2',
      expected: [],
    },
    {
      name: 'inner ELSE IF leaves outer IF and continuation eligible',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'ELSEIF2', kind: 'elseIf', link: 'IF2' }, { name: 'ELSE1', kind: 'else' }],
      target: 'ELSE1',
      expected: ['IF1', 'ELSEIF2'],
    },
    {
      name: 'outer ELSE IF closes nested IF',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'ELSEIF1', kind: 'elseIf', link: 'IF1' }, { name: 'ELSE1', kind: 'else' }],
      target: 'ELSE1',
      expected: ['ELSEIF1'],
    },
    {
      name: 'inner ELSE IF then ELSE leaves outer IF',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'ELSEIF2', kind: 'elseIf', link: 'IF2' }, { name: 'ELSE2', kind: 'else', link: 'ELSEIF2' }, { name: 'ELSE1', kind: 'else' }],
      target: 'ELSE1',
      expected: ['IF1'],
    },
    {
      name: 'new IF after closed inner branch is eligible with outer IF',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'ELSE2', kind: 'else', link: 'IF2' }, { name: 'IF3' }, { name: 'ELSE1', kind: 'else' }],
      target: 'ELSE1',
      expected: ['IF1', 'IF3'],
    },
    {
      name: 'new IF after closed outer branch is only eligible IF',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'ELSE1', kind: 'else', link: 'IF1' }, { name: 'IF3' }, { name: 'ELSE3', kind: 'else' }],
      target: 'ELSE3',
      expected: ['IF3'],
    },
    {
      name: 'new IF after inner ELSE IF joins outer and continuation',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'ELSEIF2', kind: 'elseIf', link: 'IF2' }, { name: 'IF3' }, { name: 'ELSE', kind: 'else' }],
      target: 'ELSE',
      expected: ['IF1', 'ELSEIF2', 'IF3'],
    },
    {
      name: 'IF nested inside ELSE IF continuation is eligible',
      lines: [{ name: 'IF1' }, { name: 'ELSEIF1', kind: 'elseIf', link: 'IF1' }, { name: 'IF2' }, { name: 'ELSE', kind: 'else' }],
      target: 'ELSE',
      expected: ['ELSEIF1', 'IF2'],
    },
    {
      name: 'closing nested IF inside ELSE IF leaves continuation',
      lines: [{ name: 'IF1' }, { name: 'ELSEIF1', kind: 'elseIf', link: 'IF1' }, { name: 'IF2' }, { name: 'ELSE2', kind: 'else', link: 'IF2' }, { name: 'ELSE1', kind: 'else' }],
      target: 'ELSE1',
      expected: ['ELSEIF1'],
    },
    {
      name: 'closing ELSE IF continuation closes its nested IF',
      lines: [{ name: 'IF1' }, { name: 'ELSEIF1', kind: 'elseIf', link: 'IF1' }, { name: 'IF2' }, { name: 'ELSE1', kind: 'else', link: 'ELSEIF1' }, { name: 'ELSE2', kind: 'else' }],
      target: 'ELSE2',
      expected: [],
    },
    {
      name: 'unlinked ELSE does not close open IFs',
      lines: [{ name: 'IF1' }, { name: 'ELSE1', kind: 'else' }, { name: 'ELSE2', kind: 'else' }],
      target: 'ELSE2',
      expected: ['IF1'],
    },
    {
      name: 'unlinked ELSE IF does not close open IFs',
      lines: [{ name: 'IF1' }, { name: 'ELSEIF1', kind: 'elseIf' }, { name: 'ELSE1', kind: 'else' }],
      target: 'ELSE1',
      expected: ['IF1'],
    },
    {
      name: 'unlinked ELSE IF can still be target line with existing open IF',
      lines: [{ name: 'IF1' }, { name: 'ELSEIF1', kind: 'elseIf' }],
      target: 'ELSEIF1',
      expected: ['IF1'],
    },
    {
      name: 'three nested IFs all eligible',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'IF3' }, { name: 'ELSE', kind: 'else' }],
      target: 'ELSE',
      expected: ['IF1', 'IF2', 'IF3'],
    },
    {
      name: 'closing deepest IF leaves two outers',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'IF3' }, { name: 'ELSE3', kind: 'else', link: 'IF3' }, { name: 'ELSE', kind: 'else' }],
      target: 'ELSE',
      expected: ['IF1', 'IF2'],
    },
    {
      name: 'closing middle IF closes deepest IF too',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'IF3' }, { name: 'ELSE2', kind: 'else', link: 'IF2' }, { name: 'ELSE', kind: 'else' }],
      target: 'ELSE',
      expected: ['IF1'],
    },
    {
      name: 'closing top IF closes all nested IFs',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'IF3' }, { name: 'ELSE1', kind: 'else', link: 'IF1' }, { name: 'ELSE', kind: 'else' }],
      target: 'ELSE',
      expected: [],
    },
    {
      name: 'deep ELSE IF continuation keeps outers',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'IF3' }, { name: 'ELSEIF3', kind: 'elseIf', link: 'IF3' }, { name: 'ELSE', kind: 'else' }],
      target: 'ELSE',
      expected: ['IF1', 'IF2', 'ELSEIF3'],
    },
    {
      name: 'closing deep ELSE IF leaves outers',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'IF3' }, { name: 'ELSEIF3', kind: 'elseIf', link: 'IF3' }, { name: 'ELSE3', kind: 'else', link: 'ELSEIF3' }, { name: 'ELSE', kind: 'else' }],
      target: 'ELSE',
      expected: ['IF1', 'IF2'],
    },
    {
      name: 'two independent IFs after full close are both eligible',
      lines: [{ name: 'IF1' }, { name: 'ELSE1', kind: 'else', link: 'IF1' }, { name: 'IF2' }, { name: 'IF3' }, { name: 'ELSE', kind: 'else' }],
      target: 'ELSE',
      expected: ['IF2', 'IF3'],
    },
    {
      name: 'independent ELSE IF chain and new IF are eligible',
      lines: [{ name: 'IF1' }, { name: 'ELSEIF1', kind: 'elseIf', link: 'IF1' }, { name: 'IF2' }, { name: 'ELSE', kind: 'else' }],
      target: 'ELSE',
      expected: ['ELSEIF1', 'IF2'],
    },
    {
      name: 'closing independent IF leaves prior ELSE IF continuation',
      lines: [{ name: 'IF1' }, { name: 'ELSEIF1', kind: 'elseIf', link: 'IF1' }, { name: 'IF2' }, { name: 'ELSE2', kind: 'else', link: 'IF2' }, { name: 'ELSE', kind: 'else' }],
      target: 'ELSE',
      expected: ['ELSEIF1'],
    },
    {
      name: 'target ELSE IF sees same open branches as ELSE',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'ELSEIF', kind: 'elseIf' }],
      target: 'ELSEIF',
      expected: ['IF1', 'IF2'],
    },
    {
      name: 'target ELSE IF after inner close sees outer only',
      lines: [{ name: 'IF1' }, { name: 'IF2' }, { name: 'ELSE2', kind: 'else', link: 'IF2' }, { name: 'ELSEIF1', kind: 'elseIf' }],
      target: 'ELSEIF1',
      expected: ['IF1'],
    },
    {
      name: 'ACTIONS and WAIT do not affect eligibility',
      lines: [{ name: 'IF1' }, { name: 'ACTIONS1', kind: 'actions' }, { name: 'WAIT1', kind: 'wait' }, { name: 'IF2' }, { name: 'ELSE', kind: 'else' }],
      target: 'ELSE',
      expected: ['IF1', 'IF2'],
    },
  ])('$name', ({ lines, target, expected }) => {
    expect(createCase(lines, target)).toEqual(expected);
  });

  it('reports skipped linked ELSE IF lines when an earlier branch matched', () => {
    const ScriptAutomation = loadScriptAutomation();
    const automation = new ScriptAutomation();
    const script = automation.getSelectedScript();
    const if1 = automation.createLine('if');
    const elif1 = automation.createLine('elseIf');
    const elif2 = automation.createLine('elseIf');

    if1.name = 'IF1';
    elif1.name = 'ELIF1';
    elif2.name = 'ELIF2';
    setConditionResult(if1, false);
    setConditionResult(elif1, true);
    setConditionResult(elif2, true);

    script.lines = [if1, elif1, elif2];
    elif1.linkedIfLineId = if1.id;
    elif2.linkedIfLineId = elif1.id;
    automation.enabled = true;
    automation.activeScriptId = script.id;
    automation.selectedScriptId = script.id;
    automation.pcLineId = if1.id;

    automation.stepOnce();
    expect(automation.haltedReason).toBe('linkedElse');
    expect(automation.lastStatus).toBe('Paused');
    expect(automation.lastLineOutcomeSummary).toBe('GOTO #2 ELIF1');
    expect(automation.lastLineOutcomeLineId).toBe(if1.id);

    automation.stepOnce();
    automation.stepOnce();

    expect(automation.haltedReason).toBe('skippedBranch');
    expect(automation.lastStatus).toBe('Paused');
    expect(automation.lastActionSummary).toBe('');
    expect(automation.lastLineOutcomeSummary).toBe('Skipped (earlier linked branch matched)');
    expect(automation.lastLineOutcomeLineId).toBe(elif2.id);

    automation.update(1000);

    expect(automation.haltedReason).toBe('paused');
    expect(automation.lastStatus).toBe('Paused');
    expect(automation.lastLineOutcomeSummary).toBe('Skipped (earlier linked branch matched)');
  });

  it('clears skipped line outcomes before stepping a different line', () => {
    const ScriptAutomation = loadScriptAutomation();
    const automation = new ScriptAutomation();
    const script = automation.getSelectedScript();
    const if1 = automation.createLine('if');
    const elif1 = automation.createLine('elseIf');
    const elif2 = automation.createLine('elseIf');

    if1.name = 'IF1';
    elif1.name = 'ELIF1';
    elif2.name = 'ELIF2';
    setConditionResult(if1, false);
    setConditionResult(elif1, true);
    setConditionResult(elif2, true);

    script.lines = [if1, elif1, elif2];
    elif1.linkedIfLineId = if1.id;
    elif2.linkedIfLineId = elif1.id;
    automation.enabled = true;
    automation.activeScriptId = script.id;
    automation.selectedScriptId = script.id;
    automation.pcLineId = if1.id;

    automation.stepOnce();
    automation.stepOnce();
    automation.stepOnce();
    expect(automation.lastLineOutcomeSummary).toBe('Skipped (earlier linked branch matched)');

    automation.reset();
    automation.stepOnce();

    expect(automation.manualStepDisplayLineId).toBe(if1.id);
    expect(automation.lastLineOutcomeSummary).toBe('GOTO #2 ELIF1');
    expect(automation.lastLineOutcomeLineId).toBe(if1.id);
  });
});
