let scriptAutomationLinesSignature = '';
let forceScriptAutomationRefresh = false;

function getScriptAutomation() {
  return automationManager ? automationManager.scriptAutomation : null;
}

function buildScriptAutomationUI() {
  const card = automationElements.scriptAutomation || document.getElementById('automation-scripts');
  if (!card) return;

  const header = createAutomationCardHeader(
    card,
    getAutomationCardText('scriptAutomationTitle', {}, 'Script Automation'),
    () => {
      const automation = getScriptAutomation();
      if (!automation) return;
      automation.setCollapsed(!automation.collapsed);
      queueAutomationUIRefresh();
    }
  );

  const body = document.createElement('div');
  body.classList.add('automation-body', 'script-automation-body');
  card.appendChild(body);

  const controls = document.createElement('div');
  controls.classList.add('script-automation-controls');

  const masterToggle = createAutomationToggle(
    getAutomationCardText('scriptMasterOn', {}, 'Scripts On'),
    getAutomationCardText('scriptMasterOff', {}, 'Scripts Off')
  );
  masterToggle.classList.add('script-automation-master-toggle');

  const runButton = document.createElement('button');
  runButton.classList.add('script-automation-run');
  runButton.textContent = getAutomationCardText('scriptRun', {}, 'Run');

  const pauseButton = document.createElement('button');
  pauseButton.classList.add('script-automation-pause');
  pauseButton.textContent = getAutomationCardText('scriptPause', {}, 'Pause');

  const stepButton = document.createElement('button');
  stepButton.classList.add('script-automation-step-once');
  stepButton.textContent = getAutomationCardText('scriptStepOnce', {}, 'Step Once');

  const resetButton = document.createElement('button');
  resetButton.classList.add('script-automation-reset');
  resetButton.textContent = getAutomationCardText('scriptReset', {}, 'Reset');

  const autoRestartToggle = createAutomationToggle(
    getAutomationCardText('scriptAutoRestartOn', {}, 'Auto Restart On'),
    getAutomationCardText('scriptAutoRestartOff', {}, 'Auto Restart Off')
  );
  autoRestartToggle.classList.add('script-automation-auto-restart-toggle');

  controls.append(masterToggle, runButton, pauseButton, stepButton, resetButton, autoRestartToggle);
  body.appendChild(controls);

  const statusLine = document.createElement('div');
  statusLine.classList.add('script-automation-status-line');
  body.appendChild(statusLine);

  const scriptRow = document.createElement('div');
  scriptRow.classList.add('script-automation-script-row');

  const scriptSelect = document.createElement('select');
  scriptSelect.classList.add('script-automation-select');

  const scriptName = document.createElement('input');
  scriptName.type = 'text';
  scriptName.placeholder = getAutomationCardText('scriptNamePlaceholder', {}, 'Script name');
  scriptName.classList.add('script-automation-name');

  const scriptToggle = createAutomationToggle(
    getAutomationCardText('scriptEnabledOn', {}, 'Script On'),
    getAutomationCardText('scriptEnabledOff', {}, 'Script Off')
  );
  scriptToggle.classList.add('script-automation-script-toggle');

  const newButton = document.createElement('button');
  newButton.classList.add('script-automation-new');
  newButton.textContent = getAutomationCardText('scriptNew', {}, 'New Script');

  const duplicateButton = document.createElement('button');
  duplicateButton.classList.add('script-automation-duplicate');
  duplicateButton.textContent = getAutomationCardText('scriptDuplicate', {}, 'Duplicate');

  const deleteButton = document.createElement('button');
  deleteButton.classList.add('script-automation-delete');
  deleteButton.textContent = getAutomationCardText('scriptDelete', {}, 'Delete');

  scriptRow.append(scriptSelect, scriptName, scriptToggle, newButton, duplicateButton, deleteButton);
  body.appendChild(scriptRow);

  const linesContainer = document.createElement('div');
  linesContainer.classList.add('script-automation-lines');
  body.appendChild(linesContainer);

  const addLineButton = document.createElement('button');
  addLineButton.classList.add('script-automation-add-line');
  addLineButton.textContent = getAutomationCardText('scriptAddLine', {}, '+ Line');
  body.appendChild(addLineButton);

  automationElements.scriptCollapseButton = header.collapse;
  automationElements.scriptPanelBody = body;
  automationElements.scriptMasterToggle = masterToggle;
  automationElements.scriptRunButton = runButton;
  automationElements.scriptPauseButton = pauseButton;
  automationElements.scriptStepButton = stepButton;
  automationElements.scriptResetButton = resetButton;
  automationElements.scriptAutoRestartToggle = autoRestartToggle;
  automationElements.scriptStatusLine = statusLine;
  automationElements.scriptSelect = scriptSelect;
  automationElements.scriptNameInput = scriptName;
  automationElements.scriptEnabledToggle = scriptToggle;
  automationElements.scriptNewButton = newButton;
  automationElements.scriptDuplicateButton = duplicateButton;
  automationElements.scriptDeleteButton = deleteButton;
  automationElements.scriptLinesContainer = linesContainer;
  automationElements.scriptAddLineButton = addLineButton;

  wireScriptAutomationEvents();
}

function wireScriptAutomationEvents() {
  const els = automationElements;
  els.scriptMasterToggle.addEventListener('click', () => {
    const automation = getScriptAutomation();
    if (!automation) return;
    if (automation.enabled) automation.disable();
    else {
      automation.enable();
      automationManager.setFeature('automationScripts', true);
    }
    queueAutomationUIRefresh();
  });

  els.scriptRunButton.addEventListener('click', () => {
    const automation = getScriptAutomation();
    const script = automation?.getSelectedScript();
    if (!automation || !script) return;
    automation.runScript(script.id);
    queueAutomationUIRefresh();
  });

  els.scriptPauseButton.addEventListener('click', () => {
    const automation = getScriptAutomation();
    if (!automation) return;
    automation.pause();
    queueAutomationUIRefresh();
  });

  els.scriptStepButton.addEventListener('click', () => {
    const automation = getScriptAutomation();
    if (!automation) return;
    automation.stepOnce();
    queueAutomationUIRefresh();
  });

  els.scriptResetButton.addEventListener('click', () => {
    const automation = getScriptAutomation();
    if (!automation) return;
    automation.reset();
    queueAutomationUIRefresh();
  });

  els.scriptAutoRestartToggle.addEventListener('click', () => {
    const automation = getScriptAutomation();
    if (!automation) return;
    automation.autoRestartOnCompletion = !automation.autoRestartOnCompletion;
    queueAutomationUIRefresh();
  });

  els.scriptSelect.addEventListener('change', event => {
    const automation = getScriptAutomation();
    if (!automation) return;
    automation.setSelectedScriptId(Number(event.target.value));
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });

  els.scriptNameInput.addEventListener('input', event => {
    const automation = getScriptAutomation();
    const script = automation?.getSelectedScript();
    if (!automation || !script) return;
    automation.renameScript(script.id, event.target.value);
    queueAutomationUIRefresh();
  });

  els.scriptEnabledToggle.addEventListener('click', () => {
    const automation = getScriptAutomation();
    const script = automation?.getSelectedScript();
    if (!automation || !script) return;
    automation.setScriptEnabled(script.id, !script.enabled);
    queueAutomationUIRefresh();
  });

  els.scriptNewButton.addEventListener('click', () => {
    const automation = getScriptAutomation();
    if (!automation) return;
    automation.addScript('');
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });

  els.scriptDuplicateButton.addEventListener('click', () => {
    const automation = getScriptAutomation();
    const script = automation?.getSelectedScript();
    if (!automation || !script) return;
    automation.duplicateScript(script.id);
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });

  els.scriptDeleteButton.addEventListener('click', () => {
    const automation = getScriptAutomation();
    const script = automation?.getSelectedScript();
    if (!automation || !script) return;
    automation.deleteScript(script.id);
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });

  els.scriptAddLineButton.addEventListener('click', () => {
    const automation = getScriptAutomation();
    const script = automation?.getSelectedScript();
    if (!automation || !script) return;
    automation.addLine(script.id, 'if');
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });
}

function updateScriptAutomationUI() {
  const automation = getScriptAutomation();
  const card = automationElements.scriptAutomation;
  if (!card || !automation) return;

  const visible = automationManager.hasFeature('automationScripts') || automation.enabled;
  card.classList.toggle('hidden', !visible);
  if (!visible) return;

  automationElements.scriptAutomationDescription.textContent = automation.enabled
    ? getAutomationCardText('scriptAutomationDescriptionUnlocked', {}, 'Run structured automation scripts built from dropdown conditions and preset actions.')
    : getAutomationCardText('scriptAutomationDescriptionLocked', {}, 'Script automation is disabled. Enable it manually when you are ready to use experimental scripts.');

  automationElements.scriptPanelBody.style.display = automation.collapsed ? 'none' : 'flex';
  automationElements.scriptCollapseButton.textContent = automation.collapsed ? '▶' : '▼';
  setAutomationToggleState(automationElements.scriptMasterToggle, automation.enabled);
  setAutomationToggleState(automationElements.scriptAutoRestartToggle, automation.autoRestartOnCompletion);

  const script = automation.getSelectedScript();
  if (document.activeElement !== automationElements.scriptSelect) {
    automationElements.scriptSelect.textContent = '';
    automation.scripts.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name || `Script ${item.id}`;
      option.selected = script && item.id === script.id;
      automationElements.scriptSelect.appendChild(option);
    });
  }

  if (script && document.activeElement !== automationElements.scriptNameInput) {
    automationElements.scriptNameInput.value = script.name || '';
  }
  setAutomationToggleState(automationElements.scriptEnabledToggle, !!script?.enabled);
  automationElements.scriptDeleteButton.disabled = automation.scripts.length <= 1;
  automationElements.scriptRunButton.disabled = !automation.enabled || !script || !script.enabled;
  automationElements.scriptPauseButton.disabled = !automation.running;
  automationElements.scriptStepButton.disabled = !automation.enabled || !script || !script.enabled;
  automationElements.scriptResetButton.disabled = !script;

  const currentLine = script?.lines.find(line => line.id === automation.pcLineId);
  const statusParts = [automation.lastStatus || 'Idle'];
  if (currentLine) statusParts.push(`Line: ${automation.getLineLabel(script, currentLine)}`);
  if (automation.lastActionSummary) statusParts.push(`Last action: ${automation.lastActionSummary}`);
  automationElements.scriptStatusLine.textContent = statusParts.join(' | ');

  const signature = getScriptLinesSignature(automation, script);
  const activeElement = document.activeElement;
  const editingText = activeElement
    && automationElements.scriptLinesContainer.contains(activeElement)
    && activeElement.tagName === 'INPUT'
    && (activeElement.type === 'text' || activeElement.type === 'number');
  if (forceScriptAutomationRefresh || (signature !== scriptAutomationLinesSignature && !editingText)) {
    automationElements.scriptLinesContainer.textContent = '';
    if (script) renderScriptLines(automation, script, automationElements.scriptLinesContainer);
    scriptAutomationLinesSignature = getScriptLinesSignature(automation, script);
    forceScriptAutomationRefresh = false;
  }
}

function getScriptLinesSignature(automation, script) {
  if (!script) return '';
  return JSON.stringify({
    selectedScriptId: script.id,
    pcLineId: automation.pcLineId,
    lines: script.lines,
    presets: collectScriptActionOptionsSignature()
  });
}

function collectScriptActionOptionsSignature() {
  return ['buildings', 'projects', 'colony', 'research'].map(type => {
    const target = getScriptActionAutomationTarget(type);
    return `${type}:${(target?.presets || []).map(item => `${item.id}:${item.name}`).join(',')}:${(target?.combinations || []).map(item => `${item.id}:${item.name}`).join(',')}`;
  }).join('|');
}

function renderScriptLines(automation, script, container) {
  script.lines.forEach((line, index) => {
    const card = document.createElement('div');
    card.classList.add('script-line-card');
    if (line.id === automation.pcLineId) card.classList.add('script-line-current');

    const header = document.createElement('div');
    header.classList.add('script-line-header');

    const summary = document.createElement('div');
    summary.classList.add('script-line-summary');
    summary.textContent = buildScriptLineSummary(automation, script, line, index);

    const expand = document.createElement('button');
    expand.textContent = line.expanded === false ? '▶' : '▼';
    expand.addEventListener('click', () => {
      line.expanded = line.expanded === false;
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });

    const controls = document.createElement('div');
    controls.classList.add('script-line-header-controls');
    const up = document.createElement('button');
    up.textContent = '↑';
    up.disabled = index === 0;
    up.addEventListener('click', () => {
      automation.moveLine(script.id, line.id, -1);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    const down = document.createElement('button');
    down.textContent = '↓';
    down.disabled = index === script.lines.length - 1;
    down.addEventListener('click', () => {
      automation.moveLine(script.id, line.id, 1);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    const remove = document.createElement('button');
    remove.textContent = '×';
    remove.disabled = script.lines.length <= 1;
    remove.addEventListener('click', () => {
      automation.removeLine(script.id, line.id);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    controls.append(up, down, remove);
    header.append(expand, summary, controls);
    card.appendChild(header);

    if (line.expanded !== false) {
      const editor = document.createElement('div');
      editor.classList.add('script-line-editor');
      renderLineBasics(automation, script, line, editor);
      renderConditionEditor(automation, line, editor);
      renderActionsEditor(automation, script, line, editor);
      card.appendChild(editor);
    }

    container.appendChild(card);
  });
}

function buildScriptLineSummary(automation, script, line, index) {
  const conditionText = automation.describeCondition(line.condition);
  const actionText = describeScriptLineActions(automation, script, line);
  const nameText = line.name ? `${line.name}: ` : '';
  const actionSuffix = actionText ? ` → ${actionText}` : ' → No actions';
  return `#${index + 1} ${line.kind.toUpperCase()} ${nameText}${conditionText}${actionSuffix}`;
}

function describeScriptLineActions(automation, script, line) {
  const actions = Array.isArray(line.actions) ? line.actions : [];
  if (actions.length === 0) return '';
  return actions.map(action => {
    if (action.kind === 'goto') {
      const target = script.lines.find(targetLine => targetLine.id === Number(action.targetLineId));
      return target ? `GOTO ${automation.getLineLabel(script, target)}` : 'GOTO ?';
    }
    return automation.describeAction(action);
  }).join('; ');
}

function renderLineBasics(automation, script, line, container) {
  const row = document.createElement('div');
  row.classList.add('script-editor-row');

  const kind = document.createElement('select');
  ['if', 'while', 'wait'].forEach(kindId => {
    const option = document.createElement('option');
    option.value = kindId;
    option.textContent = kindId.toUpperCase();
    option.selected = line.kind === kindId;
    kind.appendChild(option);
  });
  kind.addEventListener('change', event => {
    line.kind = event.target.value;
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });

  const name = document.createElement('input');
  name.type = 'text';
  name.placeholder = getAutomationCardText('scriptLineNamePlaceholder', {}, 'Line name');
  name.value = line.name || '';
  name.addEventListener('input', event => {
    line.name = event.target.value;
    queueAutomationUIRefresh();
  });

  row.append(labeledNode(getAutomationCardText('scriptLineKind', {}, 'Line Type'), kind), labeledNode(getAutomationCardText('scriptLineName', {}, 'Name'), name));
  container.appendChild(row);
}

function renderConditionEditor(automation, line, container) {
  const section = document.createElement('div');
  section.classList.add('script-editor-section');
  const title = document.createElement('div');
  title.classList.add('script-editor-section-title');
  title.textContent = getAutomationCardText('scriptCondition', {}, 'Condition');
  section.appendChild(title);

  line.condition.clauses.forEach((clause, index) => {
    const clauseCard = document.createElement('div');
    clauseCard.classList.add('script-clause-card');

    if (index > 0) {
      const join = createSelect([
        { id: 'and', label: 'AND' },
        { id: 'or', label: 'OR' }
      ], clause.join || 'and');
      join.addEventListener('change', event => {
        clause.join = event.target.value;
        forceScriptAutomationRefresh = true;
        queueAutomationUIRefresh();
      });
      clauseCard.appendChild(labeledNode(getAutomationCardText('scriptJoin', {}, 'Join'), join));
    }

    const notToggle = createAutomationToggle('NOT', 'NOT Off');
    setAutomationToggleState(notToggle, !!clause.not);
    notToggle.addEventListener('click', () => {
      clause.not = !clause.not;
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    clauseCard.appendChild(notToggle);

    renderExpressionEditor(automation, clause.left, clauseCard, getAutomationCardText('scriptLeftExpression', {}, 'Left'));

    const comparator = createSelect([
      { id: '>', label: '>' },
      { id: '>=', label: '>=' },
      { id: '<', label: '<' },
      { id: '<=', label: '<=' },
      { id: '==', label: '==' },
      { id: '!=', label: '!=' }
    ], clause.comparator || '>');
    comparator.addEventListener('change', event => {
      clause.comparator = event.target.value;
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    clauseCard.appendChild(labeledNode(getAutomationCardText('scriptComparator', {}, 'Compare'), comparator));

    renderExpressionEditor(automation, clause.right, clauseCard, getAutomationCardText('scriptRightExpression', {}, 'Right'));

    const remove = document.createElement('button');
    remove.textContent = getAutomationCardText('scriptRemoveClause', {}, 'Remove Clause');
    remove.disabled = line.condition.clauses.length <= 1;
    remove.addEventListener('click', () => {
      line.condition.clauses.splice(index, 1);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    clauseCard.appendChild(remove);
    section.appendChild(clauseCard);
  });

  const addClause = document.createElement('button');
  addClause.textContent = getAutomationCardText('scriptAddClause', {}, '+ Clause');
  addClause.addEventListener('click', () => {
    line.condition.clauses.push(automation.createDefaultClause());
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });
  section.appendChild(addClause);
  container.appendChild(section);
}

function renderExpressionEditor(automation, expression, container, titleText) {
  const wrap = document.createElement('div');
  wrap.classList.add('script-expression-editor');
  const title = document.createElement('div');
  title.classList.add('script-expression-title');
  title.textContent = titleText;
  wrap.appendChild(title);

  expression.terms.forEach((term, index) => {
    const row = document.createElement('div');
    row.classList.add('script-term-row');
    if (index > 0) {
      const op = createSelect([
        { id: 'add', label: 'ADD' },
        { id: 'subtract', label: 'SUBTRACT' },
        { id: 'multiply', label: 'MULTIPLY' }
      ], term.op || 'add');
      op.addEventListener('change', event => {
        term.op = event.target.value;
        forceScriptAutomationRefresh = true;
        queueAutomationUIRefresh();
      });
      row.appendChild(op);
    }
    renderReferencePicker(automation, term.ref, row);
    const remove = document.createElement('button');
    remove.textContent = '×';
    remove.disabled = expression.terms.length <= 1;
    remove.addEventListener('click', () => {
      expression.terms.splice(index, 1);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    row.appendChild(remove);
    wrap.appendChild(row);
  });

  const addTerm = document.createElement('button');
  addTerm.textContent = getAutomationCardText('scriptAddTerm', {}, '+ Term');
  addTerm.addEventListener('click', () => {
    expression.terms.push({ op: 'add', ref: { source: 'constant', category: 'constant', target: 'constant', attribute: 'value', constant: 0 } });
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });
  wrap.appendChild(addTerm);
  container.appendChild(wrap);
}

function renderReferencePicker(automation, ref, row) {
  const registry = automation.registry;
  const source = createSelect(registry.getSources().map(item => ({ id: item.id, label: item.label })), ref.source || 'constant');
  source.addEventListener('change', event => {
    ref.source = event.target.value;
    normalizeScriptRef(registry, ref);
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });
  row.appendChild(source);

  if (ref.source === 'constant') {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = ref.constant ?? 0;
    input.addEventListener('input', event => {
      ref.constant = event.target.value;
    });
    row.appendChild(input);
    return;
  }

  normalizeScriptRef(registry, ref);
  const categories = registry.getCategories(ref.source);
  const category = createSelect(categories.map(item => ({ id: item.id, label: item.label })), ref.category);
  category.addEventListener('change', event => {
    ref.category = event.target.value;
    ref.target = null;
    ref.attribute = null;
    normalizeScriptRef(registry, ref);
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });
  row.appendChild(category);

  const targets = registry.getTargets(ref.source, ref.category);
  const target = createSelect(targets.map(item => ({ id: item.id, label: item.label })), ref.target);
  target.addEventListener('change', event => {
    ref.target = event.target.value;
    ref.attribute = null;
    normalizeScriptRef(registry, ref);
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });
  row.appendChild(target);

  const attributes = registry.getAttributes(ref.source, ref.category, ref.target);
  const attribute = createSelect(attributes.map(item => ({ id: item.id, label: item.label })), ref.attribute);
  attribute.addEventListener('change', event => {
    ref.attribute = event.target.value;
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });
  row.appendChild(attribute);
}

function normalizeScriptRef(registry, ref) {
  const categories = registry.getCategories(ref.source);
  if (!categories.find(item => item.id === ref.category)) ref.category = categories[0]?.id || null;
  const targets = registry.getTargets(ref.source, ref.category);
  if (!targets.find(item => item.id === ref.target)) ref.target = targets[0]?.id || null;
  const attributes = registry.getAttributes(ref.source, ref.category, ref.target);
  if (!attributes.find(item => item.id === ref.attribute)) ref.attribute = attributes[0]?.id || null;
}

function renderActionsEditor(automation, script, line, container) {
  const section = document.createElement('div');
  section.classList.add('script-editor-section');
  const title = document.createElement('div');
  title.classList.add('script-editor-section-title');
  title.textContent = getAutomationCardText('scriptActions', {}, 'Actions');
  section.appendChild(title);

  line.actions.forEach((action, index) => {
    const row = document.createElement('div');
    row.classList.add('script-action-row');

    const kind = createSelect([
      { id: 'applyPreset', label: getAutomationCardText('scriptApplyPreset', {}, 'Apply Preset') },
      { id: 'applyCombination', label: getAutomationCardText('scriptApplyCombination', {}, 'Apply Combination') },
      { id: 'goto', label: 'GOTO' }
    ], action.kind || 'applyPreset');
    kind.addEventListener('change', event => {
      action.kind = event.target.value;
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    row.appendChild(kind);

    if (action.kind === 'goto') {
      const lineSelect = createSelect(script.lines.map((targetLine, targetIndex) => ({ id: targetLine.id, label: `#${targetIndex + 1} ${targetLine.name || targetLine.kind.toUpperCase()}` })), action.targetLineId || script.lines[0].id);
      action.targetLineId = Number(lineSelect.value);
      lineSelect.addEventListener('change', event => {
        action.targetLineId = Number(event.target.value);
        queueAutomationUIRefresh();
      });
      row.appendChild(lineSelect);
    } else {
      renderActionTargetPicker(action, row);
    }

    const remove = document.createElement('button');
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      line.actions.splice(index, 1);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    row.appendChild(remove);
    section.appendChild(row);
  });

  const addAction = document.createElement('button');
  addAction.textContent = getAutomationCardText('scriptAddAction', {}, '+ Action');
  addAction.addEventListener('click', () => {
    line.actions.push({ kind: 'applyPreset', automationType: 'buildings', presetId: null });
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });
  section.appendChild(addAction);
  container.appendChild(section);
}

function renderActionTargetPicker(action, row) {
  const types = action.kind === 'applyCombination'
    ? ['buildings', 'projects', 'colony']
    : ['buildings', 'projects', 'colony', 'research'];
  if (!types.includes(action.automationType)) action.automationType = types[0];
  const typeSelect = createSelect(types.map(type => ({ id: type, label: type.charAt(0).toUpperCase() + type.slice(1) })), action.automationType);
  typeSelect.addEventListener('change', event => {
    action.automationType = event.target.value;
    action.presetId = null;
    action.combinationId = null;
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });
  row.appendChild(typeSelect);

  const target = getScriptActionAutomationTarget(action.automationType);
  if (action.kind === 'applyCombination') {
    const combinations = target?.getCombinations ? target.getCombinations() : [];
    const comboSelect = createSelect(combinations.map(combo => ({ id: combo.id, label: combo.name || `Combination ${combo.id}` })), action.combinationId || combinations[0]?.id || '');
    action.combinationId = comboSelect.value ? Number(comboSelect.value) : null;
    comboSelect.addEventListener('change', event => {
      action.combinationId = Number(event.target.value);
      queueAutomationUIRefresh();
    });
    row.appendChild(comboSelect);
  } else {
    const presets = target?.presets || [];
    const presetSelect = createSelect(presets.map(preset => ({ id: preset.id, label: preset.name || `Preset ${preset.id}` })), action.presetId || presets[0]?.id || '');
    action.presetId = presetSelect.value ? Number(presetSelect.value) : null;
    presetSelect.addEventListener('change', event => {
      action.presetId = Number(event.target.value);
      queueAutomationUIRefresh();
    });
    row.appendChild(presetSelect);
  }
}

function getScriptActionAutomationTarget(type) {
  if (!automationManager) return null;
  if (type === 'buildings') return automationManager.buildingsAutomation;
  if (type === 'projects') return automationManager.projectsAutomation;
  if (type === 'colony') return automationManager.colonyAutomation;
  if (type === 'research') return automationManager.researchAutomation;
  return null;
}

function createSelect(options, selectedValue) {
  const select = document.createElement('select');
  options.forEach(optionData => {
    const option = document.createElement('option');
    option.value = optionData.id;
    option.textContent = optionData.label;
    option.selected = String(optionData.id) === String(selectedValue);
    select.appendChild(option);
  });
  return select;
}

function labeledNode(labelText, node) {
  const label = document.createElement('label');
  label.classList.add('script-labeled-node');
  const span = document.createElement('span');
  span.textContent = labelText;
  label.append(span, node);
  return label;
}
