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
  const info = document.createElement('span');
  info.classList.add('info-tooltip-icon');
  info.innerHTML = '&#9432;';
  info.addEventListener('click', event => {
    event.stopPropagation();
  });
  header.title.appendChild(info);
  attachDynamicInfoTooltip(
    info,
    getAutomationCardText(
      'scriptAutomationTooltip',
      {},
      'Script Automation runs the selected script when Scripts On is enabled and Run is active.\n\nEach game tick starts at the highlighted line. It can evaluate up to 25 lines, run up to 25 actions, and let one GOTO take effect. These limits keep loops from spending the whole tick in automation.\n\nIF lines test their condition. When true, they run Actions; when false, they run Else Actions. WAIT lines also test a condition, but they stay on that line until the condition becomes true. ACTIONS lines always run once and then move to the next line.\n\nActions apply saved building, project, colony, or research presets and combinations. GOTO jumps to another line, which is useful for loops or shared cleanup steps.\n\nUse Pause to stop without moving the current line, Step Once to test a single line, Reset to return to the first line, and Auto Restart to start again after the script reaches the end.'
    )
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

  const nextTravelRow = document.createElement('div');
  nextTravelRow.classList.add('script-automation-next-travel-row', 'building-automation-next-travel-row');
  const nextTravelLabel = document.createElement('label');
  nextTravelLabel.classList.add('script-automation-next-travel-label', 'building-automation-apply-next-travel-label');
  const nextTravelText = document.createElement('span');
  nextTravelText.textContent = getAutomationCardText('scriptOnNextTravelLabel', {}, 'Script on Next Travel');
  const nextTravelSelect = document.createElement('select');
  nextTravelSelect.classList.add('script-automation-next-travel-select', 'building-automation-next-travel-select');
  const nextTravelPersistToggle = document.createElement('input');
  nextTravelPersistToggle.type = 'checkbox';
  nextTravelPersistToggle.classList.add('script-automation-next-travel-persist-toggle');
  const nextTravelPersistText = document.createElement('span');
  nextTravelPersistText.textContent = getAutomationCardText('allFutureTravelsLabel', {}, 'All future travels');
  nextTravelPersistText.classList.add('script-automation-next-travel-persist-text', 'building-automation-next-travel-persist-text');
  nextTravelLabel.append(nextTravelText, nextTravelSelect, nextTravelPersistToggle, nextTravelPersistText);
  nextTravelRow.appendChild(nextTravelLabel);
  body.appendChild(nextTravelRow);

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

  const newButton = document.createElement('button');
  newButton.classList.add('script-automation-new');
  newButton.textContent = getAutomationCardText('scriptNew', {}, 'New Script');

  const duplicateButton = document.createElement('button');
  duplicateButton.classList.add('script-automation-duplicate');
  duplicateButton.textContent = getAutomationCardText('scriptDuplicate', {}, 'Duplicate');

  const deleteButton = document.createElement('button');
  deleteButton.classList.add('script-automation-delete');
  deleteButton.textContent = getAutomationCardText('scriptDelete', {}, 'Delete');

  scriptRow.append(scriptSelect, scriptName, newButton, duplicateButton, deleteButton);
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
  automationElements.scriptNextTravelSelect = nextTravelSelect;
  automationElements.scriptNextTravelPersistToggle = nextTravelPersistToggle;
  automationElements.scriptStatusLine = statusLine;
  automationElements.scriptSelect = scriptSelect;
  automationElements.scriptNameInput = scriptName;
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

  els.scriptNextTravelSelect.addEventListener('change', event => {
    const automation = getScriptAutomation();
    if (!automation) return;
    const scriptId = event.target.value;
    automation.nextTravelScriptId = scriptId ? Number(scriptId) : null;
    automation.nextTravelPersistent = automation.nextTravelPersistent && !!automation.nextTravelScriptId;
    els.scriptNextTravelPersistToggle.checked = automation.nextTravelPersistent;
    els.scriptNextTravelPersistToggle.disabled = !automation.nextTravelScriptId;
  });

  els.scriptNextTravelPersistToggle.addEventListener('change', event => {
    const automation = getScriptAutomation();
    if (!automation) return;
    automation.nextTravelPersistent = event.target.checked && !!automation.nextTravelScriptId;
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

  automationElements.scriptPanelBody.style.display = automation.collapsed ? 'none' : 'flex';
  automationElements.scriptCollapseButton.textContent = automation.collapsed ? '▶' : '▼';
  setAutomationToggleState(automationElements.scriptMasterToggle, automation.enabled);
  setAutomationToggleState(automationElements.scriptAutoRestartToggle, automation.autoRestartOnCompletion);

  const script = automation.getSelectedScript();
  const nextTravelScriptId = automation.nextTravelScriptId;
  const nextTravelScript = nextTravelScriptId ? automation.scripts.find(item => item.id === Number(nextTravelScriptId)) : null;
  if (nextTravelScriptId && !nextTravelScript) {
    automation.nextTravelScriptId = null;
    automation.nextTravelPersistent = false;
  }
  automation.nextTravelPersistent = automation.nextTravelPersistent && !!automation.nextTravelScriptId;

  if (document.activeElement !== automationElements.scriptNextTravelSelect) {
    automationElements.scriptNextTravelSelect.textContent = '';
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = getAutomationCardText('noneOption', {}, 'None');
    automationElements.scriptNextTravelSelect.appendChild(noneOption);
    automation.scripts.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name || `Script ${item.id}`;
      automationElements.scriptNextTravelSelect.appendChild(option);
    });
    automationElements.scriptNextTravelSelect.value = automation.nextTravelScriptId
      ? String(automation.nextTravelScriptId)
      : '';
  }
  automationElements.scriptNextTravelPersistToggle.checked = automation.nextTravelPersistent;
  automationElements.scriptNextTravelPersistToggle.disabled = !automation.nextTravelScriptId;

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
  automationElements.scriptDeleteButton.disabled = automation.scripts.length <= 1;
  automationElements.scriptRunButton.disabled = !automation.enabled || !script;
  automationElements.scriptPauseButton.disabled = !automation.running;
  automationElements.scriptStepButton.disabled = !automation.enabled || !script;
  automationElements.scriptResetButton.disabled = !script;

  const displayLineId = automation.getDisplayLineId ? automation.getDisplayLineId() : automation.pcLineId;
  const currentLine = script?.lines.find(line => line.id === displayLineId);
  const statusParts = [automation.lastStatus || 'Idle'];
  if (currentLine) statusParts.push(`Line: ${automation.getLineLabel(script, currentLine)}`);
  if (automation.lastActionSummary) statusParts.push(`Last action: ${automation.lastActionSummary}`);
  automationElements.scriptStatusLine.textContent = statusParts.join(' | ');

  const signature = getScriptLinesSignature(automation, script);
  const activeElement = document.activeElement;
  const editingControl = activeElement
    && automationElements.scriptLinesContainer.contains(activeElement)
    && (activeElement.tagName === 'SELECT'
      || activeElement.tagName === 'TEXTAREA'
      || activeElement.tagName === 'BUTTON'
      || activeElement.tagName === 'INPUT');
  if (forceScriptAutomationRefresh || (signature !== scriptAutomationLinesSignature && !editingControl)) {
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
    displayLineId: automation.getDisplayLineId ? automation.getDisplayLineId() : automation.pcLineId,
    lines: script.lines,
    values: collectScriptReferenceValueSignature(automation, script),
    presets: collectScriptActionOptionsSignature()
  });
}

function collectScriptReferenceValueSignature(automation, script) {
  const refs = [];
  script.lines.forEach(line => {
    const clauses = Array.isArray(line.condition?.clauses) ? line.condition.clauses : [];
    clauses.forEach(clause => {
      collectExpressionRefs(clause.left, refs);
      collectExpressionRefs(clause.right, refs);
    });
  });
  return refs.map(ref => automation.registry.resolveValue(ref)).join(',');
}

function collectExpressionRefs(expression, refs) {
  const terms = Array.isArray(expression?.terms) ? expression.terms : [];
  terms.forEach(term => {
    if (term.ref) refs.push(term.ref);
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
    if (line.enabled === false) card.classList.add('script-line-disabled');
    const displayLineId = automation.getDisplayLineId ? automation.getDisplayLineId() : automation.pcLineId;
    if (line.id === displayLineId) card.classList.add('script-line-current');

    const header = document.createElement('div');
    header.classList.add('script-line-header');

    if (line.enabled !== false) line.enabled = true;
    const enabledToggle = document.createElement('input');
    enabledToggle.type = 'checkbox';
    enabledToggle.checked = line.enabled !== false;
    enabledToggle.classList.add('script-line-enabled-toggle');
    enabledToggle.title = getAutomationCardText('scriptLineEnabled', {}, 'Line enabled');
    enabledToggle.addEventListener('change', event => {
      line.enabled = event.target.checked;
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });

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
    header.append(enabledToggle, expand, summary, controls);
    card.appendChild(header);

    if (line.expanded !== false) {
      const editor = document.createElement('div');
      editor.classList.add('script-line-editor');
      renderLineBasics(automation, script, line, editor);
      if (line.kind !== 'actions') renderConditionEditor(automation, line, editor);
      renderActionsEditor(automation, script, line, editor, line.actions, getAutomationCardText('scriptActions', {}, 'Actions'));
      if (line.kind === 'if') {
        if (!Array.isArray(line.elseActions)) line.elseActions = [];
        renderActionsEditor(automation, script, line, editor, line.elseActions, getAutomationCardText('scriptElseActions', {}, 'Else Actions'));
      }
      card.appendChild(editor);
    }

    container.appendChild(card);
  });
}

function buildScriptLineSummary(automation, script, line, index) {
  const nameText = line.name ? `${line.name}: ` : '';
  if (line.description) {
    return `#${index + 1} ${getScriptLineKindLabel(line.kind)} ${nameText}${line.description}`;
  }
  const conditionText = line.kind === 'actions' ? 'Always' : automation.describeCondition(line.condition);
  const actionText = describeScriptLineActions(automation, script, line);
  const elseText = line.kind === 'if' ? describeScriptActions(automation, script, line.elseActions) : '';
  const actionSuffix = actionText ? ` → ${actionText}` : ' → No actions';
  const elseSuffix = elseText ? ` ELSE → ${elseText}` : '';
  return `#${index + 1} ${getScriptLineKindLabel(line.kind)} ${nameText}${conditionText}${actionSuffix}${elseSuffix}`;
}

function describeScriptLineActions(automation, script, line) {
  return describeScriptActions(automation, script, line.actions);
}

function describeScriptActions(automation, script, actions) {
  const actionList = Array.isArray(actions) ? actions : [];
  if (actionList.length === 0) return '';
  return actionList.map(action => {
    if (action.kind === 'goto') {
      const target = script.lines.find(targetLine => targetLine.id === Number(action.targetLineId));
      return target ? `GOTO ${automation.getLineLabel(script, target)}` : 'GOTO ?';
    }
    return automation.describeAction(action);
  }).join('; ');
}

function getScriptLineKindLabel(kind) {
  if (kind === 'actions') return 'ACTIONS';
  return String(kind || 'if').toUpperCase();
}

function getScriptRefCurrentText(automation, ref) {
  const value = automation.registry.resolveValue(ref);
  const text = automation.registry.formatResolvedValue
    ? automation.registry.formatResolvedValue(ref, value)
    : formatNumber(value);
  return `= ${text}`;
}

function appendScriptSelectWithValue(row, select, valueText) {
  const wrap = document.createElement('span');
  wrap.classList.add('script-select-value-wrap');
  const value = document.createElement('span');
  value.classList.add('script-current-value');
  value.textContent = valueText;
  wrap.append(select, value);
  row.appendChild(wrap);
}

function createScriptAction() {
  return { kind: 'applyPreset', automationType: 'buildings', presetId: null };
}

function createLineKindSelect(selectedKind) {
  return createSelect([
    { id: 'if', label: 'IF' },
    { id: 'wait', label: 'WAIT' },
    { id: 'actions', label: 'ACTIONS' }
  ], selectedKind || 'if');
}

function ensureLineKindState(automation, line) {
  if (!['if', 'wait', 'actions'].includes(line.kind)) line.kind = 'if';
  if (line.enabled !== false) line.enabled = true;
  if (!line.description) line.description = '';
  if (!line.condition) line.condition = automation.createDefaultCondition();
  if (!Array.isArray(line.actions)) line.actions = [];
  if (!Array.isArray(line.elseActions)) line.elseActions = [];
}

function createLineTargetOptions(script) {
  return script.lines.map((targetLine, targetIndex) => ({ id: targetLine.id, label: `#${targetIndex + 1} ${targetLine.name || getScriptLineKindLabel(targetLine.kind)}` }));
}

function getScriptActionKinds() {
  return [
    { id: 'applyPreset', label: getAutomationCardText('scriptApplyPreset', {}, 'Apply Preset') },
    { id: 'applyCombination', label: getAutomationCardText('scriptApplyCombination', {}, 'Apply Combination') },
    { id: 'goto', label: 'GOTO' },
    { id: 'sleep', label: getAutomationCardText('scriptSleep', {}, 'Sleep') }
  ];
}

function renderLineBasics(automation, script, line, container) {
  const row = document.createElement('div');
  row.classList.add('script-editor-row');

  ensureLineKindState(automation, line);
  const kind = createLineKindSelect(line.kind);
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

  const description = document.createElement('input');
  description.type = 'text';
  description.placeholder = getAutomationCardText('scriptLineDescriptionPlaceholder', {}, 'Description');
  description.value = line.description || '';
  description.addEventListener('input', event => {
    line.description = event.target.value;
    queueAutomationUIRefresh();
  });

  row.append(
    labeledNode(getAutomationCardText('scriptLineKind', {}, 'Line Type'), kind),
    labeledNode(getAutomationCardText('scriptLineName', {}, 'Name'), name),
    labeledNode(getAutomationCardText('scriptLineDescription', {}, 'Description'), description)
  );
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
  title.textContent = `${titleText} (Current Value: ${formatNumber(automation.evaluateExpression(expression))})`;
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
    input.addEventListener('blur', () => {
      ref.constant = formatNumber(registry.toNumber(ref.constant), true, 3);
      input.value = ref.constant;
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    appendScriptSelectWithValue(row, input, getScriptRefCurrentText(automation, ref));
    return;
  }

  normalizeScriptRef(registry, ref);
  if (ref.source === 'celestial') {
    const attributes = registry.getAttributes(ref.source, ref.category, ref.target);
    const attribute = createSelect(attributes.map(item => ({ id: item.id, label: item.label })), ref.attribute);
    attribute.addEventListener('change', event => {
      ref.attribute = event.target.value;
      normalizeScriptRef(registry, ref);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    const options = registry.getCelestialAttributeOptions ? registry.getCelestialAttributeOptions(ref.attribute) : [];
    if (options.length > 0) {
      row.appendChild(attribute);
      if (!options.find(option => option.id === ref.option)) ref.option = options[0].id;
      const optionSelect = createSelect(options.map(option => ({ id: option.id, label: option.label })), ref.option);
      optionSelect.addEventListener('change', event => {
        ref.option = event.target.value;
        forceScriptAutomationRefresh = true;
        queueAutomationUIRefresh();
      });
      appendScriptSelectWithValue(row, optionSelect, getScriptRefCurrentText(automation, ref));
    } else {
      ref.option = null;
      appendScriptSelectWithValue(row, attribute, getScriptRefCurrentText(automation, ref));
    }
    return;
  }

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

  if (ref.source === 'terraforming') {
    const attributes = registry.getAttributes(ref.source, ref.category, ref.target);
    const attribute = createSelect(attributes.map(item => ({ id: item.id, label: item.label })), ref.attribute);
    attribute.addEventListener('change', event => {
      ref.attribute = event.target.value;
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    appendScriptSelectWithValue(row, attribute, getScriptRefCurrentText(automation, ref));
    return;
  }

  if (ref.source === 'hazards') {
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
    appendScriptSelectWithValue(row, attribute, getScriptRefCurrentText(automation, ref));
    return;
  }

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
  appendScriptSelectWithValue(row, attribute, getScriptRefCurrentText(automation, ref));
}

function normalizeScriptRef(registry, ref) {
  const categories = registry.getCategories(ref.source);
  if (!categories.find(item => item.id === ref.category)) ref.category = categories[0]?.id || null;
  const targets = registry.getTargets(ref.source, ref.category);
  if (!targets.find(item => item.id === ref.target)) ref.target = targets[0]?.id || null;
  const attributes = registry.getAttributes(ref.source, ref.category, ref.target);
  if (!attributes.find(item => item.id === ref.attribute)) ref.attribute = attributes[0]?.id || null;
  const options = ref.source === 'celestial' && registry.getCelestialAttributeOptions
    ? registry.getCelestialAttributeOptions(ref.attribute)
    : [];
  if (options.length > 0) {
    if (!options.find(option => option.id === ref.option)) ref.option = options[0].id;
  } else {
    ref.option = null;
  }
}

function renderActionsEditor(automation, script, line, container, actions, titleText) {
  const section = document.createElement('div');
  section.classList.add('script-editor-section');
  const title = document.createElement('div');
  title.classList.add('script-editor-section-title');
  title.textContent = titleText;
  section.appendChild(title);

  actions.forEach((action, index) => {
    const row = document.createElement('div');
    row.classList.add('script-action-row');

    const kind = createSelect(getScriptActionKinds(), action.kind || 'applyPreset');
    kind.addEventListener('change', event => {
      action.kind = event.target.value;
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    row.appendChild(kind);

    if (action.kind === 'sleep') {
      const duration = document.createElement('input');
      duration.type = 'text';
      duration.value = action.durationMs ?? 1000;
      duration.addEventListener('input', event => {
        action.durationMs = event.target.value;
        queueAutomationUIRefresh();
      });
      duration.addEventListener('blur', () => {
        action.durationMs = formatNumber(automation.registry.toNumber(action.durationMs), true, 3);
        duration.value = action.durationMs;
        forceScriptAutomationRefresh = true;
        queueAutomationUIRefresh();
      });
      const sleepDuration = document.createElement('span');
      sleepDuration.classList.add('script-sleep-duration');
      const sleepUnit = document.createElement('span');
      sleepUnit.classList.add('script-sleep-unit');
      sleepUnit.textContent = getAutomationCardText('scriptSleepMs', {}, 'Milliseconds');
      sleepDuration.append(duration, sleepUnit);
      row.appendChild(sleepDuration);
    } else if (action.kind === 'goto') {
      const lineSelect = createSelect(createLineTargetOptions(script), action.targetLineId || script.lines[0].id);
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
      actions.splice(index, 1);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    row.appendChild(remove);
    section.appendChild(row);
  });

  const addAction = document.createElement('button');
  addAction.textContent = getAutomationCardText('scriptAddAction', {}, '+ Action');
  addAction.addEventListener('click', () => {
    actions.push(createScriptAction());
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
