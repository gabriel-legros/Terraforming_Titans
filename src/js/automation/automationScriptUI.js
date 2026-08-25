let scriptAutomationLinesSignature = '';
let forceScriptAutomationRefresh = false;
let scriptNextTravelOptionsSignature = '';
let scriptSelectOptionsSignature = '';
let scriptVariableConfigOpen = false;
let scriptVariableNamesSignature = '';

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
    },
    'scripts'
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
      'Script Automation runs the selected script when Scripts On is enabled and Run is active.\n\nEach game tick starts at the highlighted line. It can evaluate up to 25 lines and start new lines while fewer than 25 actions have run. Once a line starts, all its actions run even if the total goes over 25. One GOTO can take effect per tick. These limits keep loops from spending the whole tick in automation.\n\nIF and ELSE IF lines test their condition. WAIT lines also test a condition, but they stay on that line until the condition becomes true. ELSE IF and ELSE lines use Linked to to choose the prior IF or ELSE IF they belong to; if no valid link exists, they behave like ACTIONS. When a linked IF or ELSE IF is false, script execution jumps to its linked ELSE IF or ELSE for free without using the one-GOTO limit. ACTIONS lines always run once and then move to the next line.\n\nActions apply saved building, project, colony, research, ship, or life presets and combinations, and can toggle scripting, auto-travel, ship automation, or life automation. GOTO jumps to another line, while GOTO Script jumps to row 1 of another script. Both use the same one-GOTO-per-tick limit.\n\nUse Pause to stop without moving the current line, Step Once to execute one action at a time, Reset to return to the first line, and Auto Restart to start again after the script reaches the end.'
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

  const goToRowOneOnTravelToggle = createAutomationToggle(
    getAutomationCardText('scriptGoToRowOneOnTravelOn', {}, 'Go to Row 1 on travel: On'),
    getAutomationCardText('scriptGoToRowOneOnTravelOff', {}, 'Go to Row 1 on travel: Off')
  );
  goToRowOneOnTravelToggle.classList.add('script-automation-go-to-row-one-on-travel-toggle');

  controls.append(masterToggle, runButton, pauseButton, stepButton, resetButton, autoRestartToggle, goToRowOneOnTravelToggle);
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

  const statusLine = document.createElement('details');
  statusLine.classList.add('script-automation-status-line');
  const statusSummary = document.createElement('summary');
  statusSummary.classList.add('script-automation-status-summary');
  const statusCurrent = document.createElement('span');
  statusCurrent.classList.add('script-automation-status-current');
  const statusHistory = document.createElement('div');
  statusHistory.classList.add('script-automation-status-history');
  statusHistory.setAttribute('role', 'log');
  statusHistory.setAttribute('aria-label', getAutomationCardText('scriptConsoleOutputLabel', {}, 'Recent script console output'));
  statusSummary.appendChild(statusCurrent);
  statusLine.append(statusSummary, statusHistory);
  statusLine.addEventListener('toggle', () => {
    if (statusLine.open) statusHistory.scrollTop = statusHistory.scrollHeight;
  });
  body.appendChild(statusLine);

  const scriptRow = document.createElement('div');
  scriptRow.classList.add('script-automation-script-row', 'script-automation-script-toolbar');

  const scriptSelect = document.createElement('select');
  scriptSelect.classList.add('script-automation-select');

  const scriptOrderButtons = document.createElement('div');
  scriptOrderButtons.classList.add('automation-order-buttons');
  const scriptMoveUpButton = document.createElement('button');
  scriptMoveUpButton.textContent = '↑';
  scriptMoveUpButton.title = getAutomationCardText('moveScriptUp', {}, 'Move script up');
  scriptMoveUpButton.classList.add('script-automation-move-up');
  const scriptMoveDownButton = document.createElement('button');
  scriptMoveDownButton.textContent = '↓';
  scriptMoveDownButton.title = getAutomationCardText('moveScriptDown', {}, 'Move script down');
  scriptMoveDownButton.classList.add('script-automation-move-down');
  scriptOrderButtons.append(scriptMoveUpButton, scriptMoveDownButton);

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

  const scriptTransferButtons = createAutomationPresetTransferButtons('script-automation-script');
  const variableConfigButton = document.createElement('button');
  variableConfigButton.classList.add('script-variable-config-button');
  variableConfigButton.innerHTML = '&#9881;';
  variableConfigButton.title = getAutomationCardText('scriptVariableConfigButton');
  variableConfigButton.setAttribute('aria-label', getAutomationCardText('scriptVariableConfigButton'));
  variableConfigButton.setAttribute('aria-expanded', 'false');

  scriptRow.append(scriptSelect, scriptOrderButtons, scriptName, newButton, duplicateButton, deleteButton, scriptTransferButtons.importButton, scriptTransferButtons.exportButton, variableConfigButton);
  body.appendChild(scriptRow);

  const variableConfigPanel = buildScriptVariableConfigPanel();
  document.body.appendChild(variableConfigPanel);

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
  automationElements.scriptGoToRowOneOnTravelToggle = goToRowOneOnTravelToggle;
  automationElements.scriptNextTravelSelect = nextTravelSelect;
  automationElements.scriptNextTravelPersistToggle = nextTravelPersistToggle;
  automationElements.scriptStatusLine = statusLine;
  automationElements.scriptStatusSummary = statusSummary;
  automationElements.scriptStatusCurrent = statusCurrent;
  automationElements.scriptStatusHistory = statusHistory;
  automationElements.scriptSelect = scriptSelect;
  automationElements.scriptMoveUpButton = scriptMoveUpButton;
  automationElements.scriptMoveDownButton = scriptMoveDownButton;
  automationElements.scriptNameInput = scriptName;
  automationElements.scriptNewButton = newButton;
  automationElements.scriptDuplicateButton = duplicateButton;
  automationElements.scriptDeleteButton = deleteButton;
  automationElements.scriptLinesContainer = linesContainer;
  automationElements.scriptAddLineButton = addLineButton;
  automationElements.scriptImportButton = scriptTransferButtons.importButton;
  automationElements.scriptExportButton = scriptTransferButtons.exportButton;
  automationElements.scriptVariableConfigButton = variableConfigButton;
  automationElements.scriptVariableConfigPanel = variableConfigPanel;

  wireScriptAutomationEvents();
}

function buildScriptVariableConfigPanel() {
  const panel = document.createElement('div');
  panel.classList.add('space-storage-settings-overlay', 'script-variable-config-overlay');
  const windowElement = document.createElement('section');
  windowElement.classList.add('space-storage-settings-window', 'script-variable-config-window');

  const header = document.createElement('div');
  header.classList.add('space-storage-settings-header');
  const heading = document.createElement('div');
  heading.classList.add('space-storage-settings-title');
  heading.textContent = getAutomationCardText('scriptVariableConfigTitle');
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.classList.add('space-storage-settings-close');
  closeButton.textContent = getAutomationCardText('scriptVariableConfigCloseIcon');
  closeButton.setAttribute('aria-label', getAutomationCardText('scriptVariableConfigClose'));
  header.append(heading, closeButton);
  const description = document.createElement('p');
  description.classList.add('script-variable-config-description');
  description.textContent = getAutomationCardText('scriptVariableConfigDescription');
  windowElement.append(header, description);

  const sections = document.createElement('div');
  sections.classList.add('script-variable-config-sections');
  panel._variableControls = {};
  ['number', 'script'].forEach(variableType => {
    const section = document.createElement('section');
    section.classList.add('script-variable-name-section');
    const title = document.createElement('h5');
    title.textContent = getAutomationCardText(
      variableType === 'script' ? 'scriptVariableNamesScriptTitle' : 'scriptVariableNamesNumberTitle'
    );
    section.appendChild(title);

    const controls = document.createElement('div');
    controls.classList.add('script-variable-name-controls');
    const variableSelect = document.createElement('select');
    variableSelect.classList.add('space-storage-settings-select');
    for (let index = 0; index < 26; index += 1) {
      const variableId = String.fromCharCode(65 + index);
      const option = document.createElement('option');
      option.value = variableId;
      option.textContent = variableId;
      variableSelect.appendChild(option);
    }
    variableSelect.addEventListener('change', () => {
      scriptVariableNamesSignature = '';
      updateScriptVariableConfigUI(getScriptAutomation(), getScriptAutomation().getSelectedScript());
    });
    controls.appendChild(labeledNode(getAutomationCardText('scriptVariableSelectorLabel'), variableSelect));

    const inputs = {};
    ['global', 'script'].forEach(scope => {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 64;
      input.classList.add('space-storage-settings-input');
      input.dataset.variableType = variableType;
      input.dataset.variableScope = scope;
      input.addEventListener('input', event => {
        const automation = getScriptAutomation();
        const selectedScript = automation?.getSelectedScript();
        if (!automation || !selectedScript) return;
        automation.setVariableName(
          event.target.dataset.variableScope,
          event.target.dataset.variableType,
          event.target.dataset.variableId,
          event.target.value,
          selectedScript.id
        );
        forceScriptAutomationRefresh = true;
        scriptVariableNamesSignature = '';
        queueAutomationUIRefresh();
      });
      const label = labeledNode(
        getAutomationCardText(scope === 'global' ? 'scriptVariableGlobalNameHeader' : 'scriptVariableScriptScopeLabel'),
        input
      );
      controls.appendChild(label);
      inputs[scope] = { input, label: label.firstElementChild };
    });
    panel._variableControls[variableType] = { select: variableSelect, inputs, title: title.textContent };
    section.appendChild(controls);
    sections.appendChild(section);
  });
  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.classList.add('space-storage-settings-confirm');
  confirmButton.textContent = getAutomationCardText('scriptVariableConfigClose');
  windowElement.append(sections, confirmButton);
  panel.appendChild(windowElement);
  panel._closeButton = closeButton;
  panel._confirmButton = confirmButton;
  return panel;
}

function setScriptVariableConfigOpen(open) {
  scriptVariableConfigOpen = !!open;
  automationElements.scriptVariableConfigButton.setAttribute('aria-expanded', String(scriptVariableConfigOpen));
  automationElements.scriptVariableConfigPanel.classList.toggle('is-visible', scriptVariableConfigOpen);
  scriptVariableNamesSignature = '';
  queueAutomationUIRefresh();
}

function updateScriptVariableConfigUI(automation, script) {
  const panel = automationElements.scriptVariableConfigPanel;
  if (!panel || !scriptVariableConfigOpen) return;
  const signature = JSON.stringify([
    script?.id || null,
    script?.name || '',
    automation.variableNames,
    script?.variableNames || null,
    panel._variableControls.number.select.value,
    panel._variableControls.script.select.value
  ]);
  if (signature === scriptVariableNamesSignature) return;

  const scriptHeader = getAutomationCardText('scriptVariableScriptNameHeader', {
    script: script?.name || getAutomationCardText('scriptWithId', { id: script?.id || '' })
  });
  ['number', 'script'].forEach(variableType => {
    const controls = panel._variableControls[variableType];
    const variableId = controls.select.value || 'A';
    const targets = automation.getVariableTargets(variableType, script.id);
    targets.forEach((target, index) => {
      controls.select.options[index].textContent = target.label === target.id
        ? target.id
        : `${target.id} - ${target.label}`;
    });
    controls.inputs.script.label.textContent = scriptHeader;
    ['global', 'script'].forEach(scope => {
      const input = controls.inputs[scope].input;
      input.dataset.variableId = variableId;
      input.setAttribute('aria-label', getAutomationCardText('scriptVariableNameInputLabel', {
        id: variableId,
        scope: scope === 'global' ? getAutomationCardText('scriptVariableGlobalNameHeader') : scriptHeader,
        type: controls.title
      }));
      const value = scope === 'global'
        ? automation.getGlobalVariableName(variableType, variableId)
        : automation.getScriptVariableName(script.id, variableType, variableId);
      if (document.activeElement !== input) input.value = value;
      input.placeholder = scope === 'global'
        ? variableId
        : getAutomationCardText('scriptVariableInheritedPlaceholder', {
            name: automation.getGlobalVariableName(variableType, variableId) || variableId
          });
    });
  });
  scriptVariableNamesSignature = signature;
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

  els.scriptGoToRowOneOnTravelToggle.addEventListener('click', () => {
    const automation = getScriptAutomation();
    if (!automation) return;
    automation.goToRowOneOnTravel = !automation.goToRowOneOnTravel;
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

  els.scriptMoveUpButton.addEventListener('click', () => {
    const automation = getScriptAutomation();
    const script = automation.getSelectedScript();
    automation.moveScript(script.id, -1);
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });

  els.scriptMoveDownButton.addEventListener('click', () => {
    const automation = getScriptAutomation();
    const script = automation.getSelectedScript();
    automation.moveScript(script.id, 1);
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });

  els.scriptNameInput.addEventListener('input', event => {
    const automation = getScriptAutomation();
    const script = automation?.getSelectedScript();
    if (!automation || !script) return;
    automation.renameScript(script.id, event.target.value);
    queueAutomationUIRefresh();
    updateAutomationUI();
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

  els.scriptVariableConfigButton.addEventListener('click', () => {
    setScriptVariableConfigOpen(!scriptVariableConfigOpen);
  });
  els.scriptVariableConfigPanel._closeButton.addEventListener('click', () => setScriptVariableConfigOpen(false));
  els.scriptVariableConfigPanel._confirmButton.addEventListener('click', () => setScriptVariableConfigOpen(false));
  els.scriptVariableConfigPanel.addEventListener('click', event => {
    if (event.target === els.scriptVariableConfigPanel) setScriptVariableConfigOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && scriptVariableConfigOpen) setScriptVariableConfigOpen(false);
  });

  els.scriptAddLineButton.addEventListener('click', () => {
    const automation = getScriptAutomation();
    const script = automation?.getSelectedScript();
    if (!automation || !script) return;
    automation.addLine(script.id, 'if');
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });

  els.scriptExportButton.addEventListener('click', () => {
    const automation = getScriptAutomation();
    const script = automation?.getSelectedScript();
    if (!automation || !script) return;
    exportAutomationPresetToClipboard('script', automation.exportScript(script.id), els.scriptExportButton);
  });

  els.scriptImportButton.addEventListener('click', () => {
    openAutomationPresetImportDialog({
      title: getAutomationCardText('importScriptTitle', {}, 'Import Script'),
      description: getAutomationCardText(
        'importPresetDescription',
        {},
        'Paste an exported preset string below. Import adds it as a new preset.'
      ),
      onImport: (text) => {
        const parsed = parseAutomationPresetTransferPayload(text, 'script');
        if (!parsed.ok) {
          return parsed;
        }
        const automation = getScriptAutomation();
        if (!automation) {
          return { ok: false, error: getAutomationCardText('importPresetFailed', {}, 'Could not import that preset.') };
        }
        automation.importScript(parsed.preset);
        forceScriptAutomationRefresh = true;
        queueAutomationUIRefresh();
        updateAutomationUI();
        return { ok: true };
      }
    });
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
  setAutomationToggleState(automationElements.scriptGoToRowOneOnTravelToggle, automation.goToRowOneOnTravel);

  const script = automation.getSelectedScript();
  const nextTravelScriptId = automation.nextTravelScriptId;
  const nextTravelScript = nextTravelScriptId ? automation.scripts.find(item => item.id === Number(nextTravelScriptId)) : null;
  if (nextTravelScriptId && !nextTravelScript) {
    automation.nextTravelScriptId = null;
    automation.nextTravelPersistent = false;
  }
  automation.nextTravelPersistent = automation.nextTravelPersistent && !!automation.nextTravelScriptId;

  const nextTravelSignature = JSON.stringify(
    automation.scripts.map((item) => [item.id, item.name || ''])
  );
  if (document.activeElement !== automationElements.scriptNextTravelSelect
      && scriptNextTravelOptionsSignature !== nextTravelSignature) {
    automationElements.scriptNextTravelSelect.textContent = '';
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = getAutomationCardText('noneOption', {}, 'None');
    automationElements.scriptNextTravelSelect.appendChild(noneOption);
    automation.scripts.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name || getAutomationCardText('scriptWithId', { id: item.id }, `Script ${item.id}`);
      automationElements.scriptNextTravelSelect.appendChild(option);
    });
    scriptNextTravelOptionsSignature = nextTravelSignature;
  }
  if (document.activeElement !== automationElements.scriptNextTravelSelect) {
    automationElements.scriptNextTravelSelect.value = automation.nextTravelScriptId
      ? String(automation.nextTravelScriptId)
      : '';
  }
  automationElements.scriptNextTravelPersistToggle.checked = automation.nextTravelPersistent;
  automationElements.scriptNextTravelPersistToggle.disabled = !automation.nextTravelScriptId;

  const selectedScriptSignature = JSON.stringify([
    automation.getSelectedScript()?.id || null,
    automation.scripts.map((item) => [item.id, item.name || ''])
  ]);
  if (document.activeElement !== automationElements.scriptSelect
      && scriptSelectOptionsSignature !== selectedScriptSignature) {
    automationElements.scriptSelect.textContent = '';
    automation.scripts.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name || getAutomationCardText('scriptWithId', { id: item.id }, `Script ${item.id}`);
      option.selected = script && item.id === script.id;
      automationElements.scriptSelect.appendChild(option);
    });
    scriptSelectOptionsSignature = selectedScriptSignature;
  } else if (document.activeElement !== automationElements.scriptSelect) {
    automationElements.scriptSelect.value = script ? String(script.id) : '';
  }

  if (script && document.activeElement !== automationElements.scriptNameInput) {
    automationElements.scriptNameInput.value = script.name || '';
  }
  updateScriptVariableConfigUI(automation, script);
  const selectedScriptIndex = automation.scripts.findIndex(item => item.id === script.id);
  automationElements.scriptMoveUpButton.disabled = selectedScriptIndex <= 0;
  automationElements.scriptMoveDownButton.disabled = selectedScriptIndex < 0 || selectedScriptIndex >= automation.scripts.length - 1;
  automationElements.scriptDeleteButton.disabled = automation.scripts.length <= 1;
  automationElements.scriptRunButton.disabled = !automation.enabled || !script;
  automationElements.scriptPauseButton.disabled = !automation.running;
  automationElements.scriptStepButton.disabled = !automation.enabled || !script;
  automationElements.scriptResetButton.disabled = !script;
  automationElements.scriptImportButton.disabled = false;
  automationElements.scriptExportButton.disabled = !script;

  const statusText = automation.getConsoleOutputText();
  if (automationElements.scriptStatusCurrent.textContent !== statusText) {
    automationElements.scriptStatusCurrent.textContent = statusText;
  }
  updateScriptAutomationConsole(automation, statusText);
  automationElements.scriptStatusLine.classList.toggle('script-automation-status-line-paused', automation.lastStatus === 'Paused');

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
  updateScriptAutomationLiveReferenceValues(automation, automationElements.scriptLinesContainer);
  updateCurrentScriptLineHighlight(automation, automationElements.scriptLinesContainer);
}

function updateScriptAutomationConsole(automation, statusText) {
  const history = automationElements.scriptStatusHistory;
  const wasPinnedToBottom = history.scrollHeight - history.clientHeight - history.scrollTop <= 8;
  const added = automation.captureConsoleOutput(statusText);
  const entries = automation.consoleOutputHistory;
  const entryCache = history._entryCache || new Map();
  const activeIds = new Set(entries.map(entry => entry.id));

  entryCache.forEach((node, id) => {
    if (activeIds.has(id)) return;
    node.remove();
    entryCache.delete(id);
  });

  entries.forEach((entry, index) => {
    let node = entryCache.get(entry.id);
    if (!node) {
      node = document.createElement('div');
      node.classList.add('script-automation-status-entry');
      entryCache.set(entry.id, node);
    }
    if (node.textContent !== entry.text) node.textContent = entry.text;
    const currentNode = history.children[index];
    if (currentNode !== node) history.insertBefore(node, currentNode || null);
  });

  history._entryCache = entryCache;
  if (added && automationElements.scriptStatusLine.open && wasPinnedToBottom) {
    history.scrollTop = history.scrollHeight;
  }
}

function getScriptLinesSignature(automation, script) {
  if (!script) return '';
  return JSON.stringify({
    selectedScriptId: script.id,
    lines: script.lines,
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
  return ['buildings', 'projects', 'colony', 'research', 'autoTravel'].map(type => {
    const target = getScriptActionAutomationTarget(type);
    return `${type}:${(target?.presets || []).map(item => `${item.id}:${item.name}`).join(',')}:${(target?.combinations || []).map(item => `${item.id}:${item.name}`).join(',')}`;
  }).join('|');
}

function renderScriptLines(automation, script, container) {
  script.lines.forEach((line, index) => {
    const card = document.createElement('div');
    card.classList.add('script-line-card');
    card.dataset.lineId = String(line.id);
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
    const insertAbove = document.createElement('button');
    insertAbove.textContent = '+';
    insertAbove.title = getAutomationCardText('scriptInsertLineAbove', {}, 'Insert line above');
    insertAbove.addEventListener('click', () => {
      automation.insertLine(script.id, line.id, -1);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
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
    const insertBelow = document.createElement('button');
    insertBelow.textContent = '+';
    insertBelow.title = getAutomationCardText('scriptInsertLineBelow', {}, 'Insert line below');
    insertBelow.addEventListener('click', () => {
      automation.insertLine(script.id, line.id, 1);
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
    controls.append(insertAbove, up, down, insertBelow, remove);
    header.append(enabledToggle, expand, summary, controls);
    card.appendChild(header);

    if (line.expanded !== false) {
      const editor = document.createElement('div');
      editor.classList.add('script-line-editor');
      renderLineBasics(automation, script, line, editor);
      const effectiveKind = getEffectiveScriptLineKind(automation, script, line);
      if (line.kind === 'if' || effectiveKind === 'elseIf' || line.kind === 'wait') {
        renderConditionEditor(automation, line, editor);
      }
      renderActionsEditor(automation, script, line, editor, line.actions, getScriptActionsSectionTitle(line.kind));
      card.appendChild(editor);
    }

    container.appendChild(card);
  });
}

function updateCurrentScriptLineHighlight(automation, container) {
  if (!container) {
    return;
  }
  const displayLineId = automation.getDisplayLineId ? automation.getDisplayLineId() : automation.pcLineId;
  const cards = container.querySelectorAll('.script-line-card');
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    const lineId = Number(card.dataset.lineId);
    card.classList.toggle('script-line-current', lineId === displayLineId);
  }
}

function buildScriptLineSummary(automation, script, line, index) {
  const nameText = line.name ? `${line.name}: ` : '';
  if (line.description) {
    return `#${index + 1} ${getScriptLineKindLabel(line.kind)} ${nameText}${line.description}`;
  }
  const effectiveKind = getEffectiveScriptLineKind(automation, script, line);
  const conditionText = (effectiveKind === 'actions' || effectiveKind === 'else')
    ? getAutomationCardText('scriptAlways', {}, 'Always')
    : automation.describeCondition(line.condition);
  const linkedText = getScriptLinkedIfSummary(automation, script, line);
  const actionText = describeScriptLineActions(automation, script, line);
  const actionSuffix = actionText
    ? ` → ${actionText}`
    : ` → ${getAutomationCardText('scriptNoActions', {}, 'No actions')}`;
  return `#${index + 1} ${getScriptLineKindLabel(line.kind)} ${linkedText}${nameText}${conditionText}${actionSuffix}`;
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
      const gotoLabel = getAutomationCardText('scriptGoto', {}, 'GOTO');
      return target ? `${gotoLabel} ${automation.getLineLabel(script, target)}` : `${gotoLabel} ?`;
    }
    if (action.kind === 'gotoScript') {
      const targetScript = automation.scripts.find(item => item.id === Number(automation.resolveGotoScriptTargetId(action)));
      if (!targetScript) return `${getAutomationCardText('scriptGotoScript', {}, 'GOTO Script')} ?`;
      const scriptLabel = targetScript.name
        || getAutomationCardText('scriptWithId', { id: targetScript.id }, `Script ${targetScript.id}`);
      return `${getAutomationCardText('scriptGotoScript', {}, 'GOTO Script')} ${scriptLabel} #1`;
    }
    return automation.describeAction(action);
  }).join('; ');
}

function getScriptLineKindLabel(kind) {
  if (kind === 'elseIf') return getAutomationCardText('scriptLineTypeElseIf', {}, 'ELSE IF');
  if (kind === 'else') return getAutomationCardText('scriptLineTypeElse', {}, 'ELSE');
  if (kind === 'wait') return getAutomationCardText('scriptLineTypeWait', {}, 'WAIT');
  if (kind === 'actions') return getAutomationCardText('scriptLineTypeActions', {}, 'ACTIONS');
  return getAutomationCardText('scriptLineTypeIf', {}, 'IF');
}

function getScriptRefCurrentText(automation, ref) {
  const value = automation.registry.resolveValue(ref);
  const text = automation.registry.formatResolvedValue
    ? automation.registry.formatResolvedValue(ref, value)
    : formatNumber(value);
  return `= ${text}`;
}

function appendScriptSelectWithValue(row, select, valueText, ref) {
  const wrap = document.createElement('span');
  wrap.classList.add('script-select-value-wrap');
  const value = document.createElement('span');
  value.classList.add('script-current-value');
  value.textContent = valueText;
  value._scriptRef = ref;
  wrap.append(select, value);
  row.appendChild(wrap);
}

function createScriptAction() {
  return { kind: 'applyPreset', automationType: 'buildings', presetId: null };
}

function normalizeScriptSleepDuration(action) {
  if (action.kind !== 'sleep') return;
  if (action.durationMs === null || action.durationMs === undefined || action.durationMs === '') {
    action.durationMs = 1000;
  }
}

function normalizeScriptAction(automation, action) {
  if (action.kind === 'sleep') {
    normalizeScriptSleepDuration(action);
    return;
  }
  if (action.kind === 'setVariable') {
    action.variableType = action.variableType === 'script' ? 'script' : 'number';
    action.variableId = automation.normalizeVariableId(action.variableId);
    if (action.variableType === 'script') {
      const scripts = Array.isArray(automation.scripts) ? automation.scripts : [];
      if (!scripts.find(script => script.id === Number(action.targetScriptId))) action.targetScriptId = null;
    } else if (!action.valueExpression || action.valueExpression.constructor !== Object) {
      action.valueExpression = automation.createDefaultExpression();
    }
    return;
  }
  if (action.kind === 'gotoScript') {
    action.scriptTargetMode = action.scriptTargetMode === 'variable' ? 'variable' : 'script';
    action.scriptVariableId = automation.normalizeVariableId(action.scriptVariableId);
    if (action.scriptTargetMode === 'script') {
      const scripts = Array.isArray(automation.scripts) ? automation.scripts : [];
      if (!scripts.find(script => script.id === Number(action.targetScriptId))) {
        action.targetScriptId = scripts[0]?.id || null;
      }
    }
    return;
  }
  if (action.kind === 'applyPreset') {
    action.parameterVariableId = automation.normalizeVariableId(action.parameterVariableId);
  }
}

function createLineKindSelect(selectedKind) {
  return createSelect([
    { id: 'if', label: getAutomationCardText('scriptLineTypeIf', {}, 'IF') },
    { id: 'elseIf', label: getAutomationCardText('scriptLineTypeElseIf', {}, 'ELSE IF') },
    { id: 'else', label: getAutomationCardText('scriptLineTypeElse', {}, 'ELSE') },
    { id: 'wait', label: getAutomationCardText('scriptLineTypeWait', {}, 'WAIT') },
    { id: 'actions', label: getAutomationCardText('scriptLineTypeActions', {}, 'ACTIONS') }
  ], selectedKind || 'if');
}

function ensureLineKindState(automation, line) {
  if (!['if', 'elseIf', 'else', 'wait', 'actions'].includes(line.kind)) line.kind = 'if';
  if (!['elseIf', 'else'].includes(line.kind)) line.linkedIfLineId = null;
  if (line.enabled !== false) line.enabled = true;
  if (!line.description) line.description = '';
  if (!line.condition) line.condition = automation.createDefaultCondition();
  if (!Array.isArray(line.actions)) line.actions = [];
}

function getScriptActionsSectionTitle(kind) {
  if (kind === 'else') return getAutomationCardText('scriptElseActions', {}, 'Else Actions');
  return getAutomationCardText('scriptActions', {}, 'Actions');
}

function getEffectiveScriptLineKind(automation, script, line) {
  if (line.kind === 'elseIf') {
    return automation.getLinkedIfLine(script, line) ? 'elseIf' : 'actions';
  }
  if (line.kind === 'else') {
    return automation.getLinkedIfLine(script, line) ? 'else' : 'actions';
  }
  return line.kind;
}

function getScriptLinkedIfSummary(automation, script, line) {
  if (!['elseIf', 'else'].includes(line.kind)) return '';
  const linkedIf = automation.getLinkedIfLine(script, line);
  if (!linkedIf) return `(${getAutomationCardText('scriptLinkedToNone', {}, 'unlinked')}) `;
  return `(${getAutomationCardText('scriptLinkedTo', {}, 'Linked to')} ${automation.getLineLabel(script, linkedIf)}) `;
}

function createLineTargetOptions(script) {
  return script.lines.map((targetLine, targetIndex) => ({
    id: targetLine.id,
    label: getAutomationCardText(
      'scriptLineOptionLabel',
      { number: targetIndex + 1, label: targetLine.name || getScriptLineKindLabel(targetLine.kind) },
      `#${targetIndex + 1} ${targetLine.name || getScriptLineKindLabel(targetLine.kind)}`
    )
  }));
}

function getScriptActionKinds() {
  return [
    { id: 'applyPreset', label: getAutomationCardText('scriptApplyPreset', {}, 'Apply Preset') },
    { id: 'applyCombination', label: getAutomationCardText('scriptApplyCombination', {}, 'Apply Combination') },
    { id: 'setVariable', label: getAutomationCardText('scriptSetVariable', {}, 'Set Variable') },
    { id: 'toggleAutomation', label: getAutomationCardText('scriptToggleAutomation', {}, 'Toggle Automation') },
    { id: 'togglePause', label: getAutomationCardText('scriptTogglePause', {}, 'Toggle Pause') },
    { id: 'goto', label: getAutomationCardText('scriptGoto', {}, 'GOTO') },
    { id: 'gotoScript', label: getAutomationCardText('scriptGotoScript', {}, 'GOTO Script') },
    { id: 'sleep', label: getAutomationCardText('scriptSleep', {}, 'Sleep') }
  ];
}

function renderLineBasics(automation, script, line, container) {
  const row = document.createElement('div');
  row.classList.add('script-editor-row');
  row.classList.add('script-line-basics-row');

  ensureLineKindState(automation, line);
  const kind = createLineKindSelect(line.kind);
  kind.addEventListener('change', event => {
    line.kind = event.target.value;
    automation.assignDefaultLinkedIf(script, line);
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

  const kindField = labeledNode(getAutomationCardText('scriptLineKind', {}, 'Line Type'), kind);
  kindField.classList.add('script-line-basics-kind');
  row.append(kindField);
  if (line.kind === 'elseIf' || line.kind === 'else') {
    const linkedField = labeledNode(getAutomationCardText('scriptLinkedTo', {}, 'Linked to'), createLinkedIfSelect(automation, script, line));
    linkedField.classList.add('script-line-basics-kind');
    row.appendChild(linkedField);
  }
  const nameField = labeledNode(getAutomationCardText('scriptLineName', {}, 'Name'), name);
  nameField.classList.add('script-line-basics-expand');
  nameField.classList.add('script-line-basics-name');
  const descriptionField = labeledNode(getAutomationCardText('scriptLineDescription', {}, 'Description'), description);
  descriptionField.classList.add('script-line-basics-expand');
  descriptionField.classList.add('script-line-basics-description');
  row.append(nameField, descriptionField);
  container.appendChild(row);
}

function createLinkedIfSelect(automation, script, line) {
  const options = [{ id: '', label: getAutomationCardText('scriptLinkedToNone', {}, 'None') }];
  automation.getValidLinkedIfOptions(script, line).forEach((targetLine) => {
    options.push({ id: targetLine.id, label: automation.getLineLabel(script, targetLine) });
  });
  const linkedIf = automation.getLinkedIfLine(script, line);
  const select = createSelect(options, linkedIf ? linkedIf.id : '');
  line.linkedIfLineId = linkedIf ? linkedIf.id : null;
  select.addEventListener('change', event => {
    line.linkedIfLineId = event.target.value ? Number(event.target.value) : null;
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });
  return select;
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
        { id: 'and', label: getAutomationCardText('scriptJoinAnd', {}, 'AND') },
        { id: 'or', label: getAutomationCardText('scriptJoinOr', {}, 'OR') }
      ], clause.join || 'and');
      join.addEventListener('change', event => {
        clause.join = event.target.value;
        forceScriptAutomationRefresh = true;
        queueAutomationUIRefresh();
      });
      clauseCard.appendChild(labeledNode(getAutomationCardText('scriptJoin', {}, 'Join'), join));
    }

    const notToggle = createAutomationToggle(
      getAutomationCardText('scriptNotOn', {}, 'NOT'),
      getAutomationCardText('scriptNotOff', {}, 'NOT Off')
    );
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
  const titleLabel = document.createElement('span');
  titleLabel.textContent = getAutomationCardText('scriptCurrentValuePrefix', { title: titleText }, '{title} (Current Value: ');
  const titleValue = document.createElement('span');
  titleValue.classList.add('script-expression-current-value');
  titleValue._scriptExpression = expression;
  titleValue.textContent = formatNumber(automation.evaluateExpression(expression), false, 3);
  const titleSuffix = document.createElement('span');
  titleSuffix.textContent = getAutomationCardText('scriptCurrentValueSuffix', {}, ')');
  title.append(titleLabel, titleValue, titleSuffix);
  wrap.appendChild(title);

  expression.terms.forEach((term, index) => {
    const row = document.createElement('div');
    row.classList.add('script-term-row');
    if (index > 0) {
      const op = createSelect([
        { id: 'add', label: automation.getExpressionOperatorLabel('add') },
        { id: 'subtract', label: automation.getExpressionOperatorLabel('subtract') },
        { id: 'multiply', label: automation.getExpressionOperatorLabel('multiply') },
        { id: 'safeDivide', label: automation.getExpressionOperatorLabel('safeDivide') }
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
    appendScriptSelectWithValue(row, input, getScriptRefCurrentText(automation, ref), ref);
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
      appendScriptSelectWithValue(row, optionSelect, getScriptRefCurrentText(automation, ref), ref);
    } else {
      ref.option = null;
      appendScriptSelectWithValue(row, attribute, getScriptRefCurrentText(automation, ref), ref);
    }
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
    appendScriptSelectWithValue(row, attribute, getScriptRefCurrentText(automation, ref), ref);
    return;
  }

  if (ref.source === 'artificial') {
    const attributes = registry.getAttributes(ref.source, ref.category, ref.target);
    const attribute = createSelect(attributes.map(item => ({ id: item.id, label: item.label })), ref.attribute);
    attribute.addEventListener('change', event => {
      ref.attribute = event.target.value;
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    appendScriptSelectWithValue(row, attribute, getScriptRefCurrentText(automation, ref), ref);
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

  if (ref.source === 'resources' && ref.category === 'surface') {
    const targets = registry.getTargets(ref.source, ref.category);
    const target = createSelect(targets.map(item => ({ id: item.id, label: item.label })), ref.target);
    target.addEventListener('change', event => {
      ref.target = event.target.value;
      ref.option = null;
      ref.attribute = null;
      normalizeScriptRef(registry, ref);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    row.appendChild(target);

    const options = registry.getSurfaceResourceOptions ? registry.getSurfaceResourceOptions(ref.target) : [];
    const optionSelect = createSelect(options.map(item => ({ id: item.id, label: item.label })), ref.option);
    optionSelect.addEventListener('change', event => {
      ref.option = event.target.value;
      ref.attribute = null;
      normalizeScriptRef(registry, ref);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    row.appendChild(optionSelect);

    const attributes = registry.getAttributes(ref.source, ref.category, ref.target, ref.option);
    const attribute = createSelect(attributes.map(item => ({ id: item.id, label: item.label })), ref.attribute);
    attribute.addEventListener('change', event => {
      ref.attribute = event.target.value;
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    appendScriptSelectWithValue(row, attribute, getScriptRefCurrentText(automation, ref), ref);
    return;
  }

  if (ref.source === 'terraforming') {
    const attributes = registry.getAttributes(ref.source, ref.category, ref.target);
    const attribute = createSelect(attributes.map(item => ({ id: item.id, label: item.label })), ref.attribute);
    attribute.addEventListener('change', event => {
      ref.attribute = event.target.value;
      normalizeScriptRef(registry, ref);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    appendScriptSelectWithValue(row, attribute, getScriptRefCurrentText(automation, ref), ref);
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
  appendScriptSelectWithValue(row, attribute, getScriptRefCurrentText(automation, ref), ref);
}

function updateScriptAutomationLiveReferenceValues(automation, container) {
  if (!automation || !container) return;

  const currentValueEls = container.querySelectorAll('.script-current-value');
  for (let index = 0; index < currentValueEls.length; index += 1) {
    const valueEl = currentValueEls[index];
    const ref = valueEl._scriptRef;
    if (!ref) continue;
    valueEl.textContent = getScriptRefCurrentText(automation, ref);
  }

  const expressionValueEls = container.querySelectorAll('.script-expression-current-value');
  for (let index = 0; index < expressionValueEls.length; index += 1) {
    const valueEl = expressionValueEls[index];
    const expression = valueEl._scriptExpression;
    if (!expression) continue;
    valueEl.textContent = formatNumber(automation.evaluateExpression(expression), false, 3);
  }
}

function normalizeScriptRef(registry, ref) {
  const categories = registry.getCategories(ref.source);
  if (!categories.find(item => item.id === ref.category)) ref.category = categories[0]?.id || null;
  if (ref.source === 'resources' && ref.category === 'surface' && registry.getSurfaceResourceOptions) {
    const surfaceGroups = registry.getTargets(ref.source, ref.category);
    const targetIsGroup = surfaceGroups.find(item => item.id === ref.target);
    if (!targetIsGroup && ref.target) {
      ref.option = ref.option || ref.target;
      ref.target = registry.getSurfaceResourceGroupId ? registry.getSurfaceResourceGroupId(ref.option) : surfaceGroups[0]?.id || null;
    }
    if (!surfaceGroups.find(item => item.id === ref.target)) ref.target = surfaceGroups[0]?.id || null;
    const options = registry.getSurfaceResourceOptions(ref.target);
    if (!options.find(option => option.id === ref.option)) ref.option = options[0]?.id || null;
    const attributes = registry.getAttributes(ref.source, ref.category, ref.target, ref.option);
    if (!attributes.find(item => item.id === ref.attribute)) ref.attribute = attributes[0]?.id || null;
    return;
  }
  const targets = registry.getTargets(ref.source, ref.category);
  if (!targets.find(item => item.id === ref.target)) ref.target = targets[0]?.id || null;
  const attributes = registry.getAttributes(ref.source, ref.category, ref.target);
  if (!attributes.find(item => item.id === ref.attribute)) ref.attribute = attributes[0]?.id || null;
  const options = registry.getReferenceOptions ? registry.getReferenceOptions(ref) : [];
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
    if (action.kind === 'setVariable') row.classList.add('script-set-variable-action');

    const kind = createSelect(getScriptActionKinds(), action.kind || 'applyPreset');
    kind.addEventListener('change', event => {
      action.kind = event.target.value;
      normalizeScriptAction(automation, action);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    row.appendChild(kind);

    if (action.kind === 'setVariable') {
      renderSetVariableActionEditor(automation, script, action, row);
    } else if (action.kind === 'sleep') {
      normalizeScriptSleepDuration(action);
      const duration = document.createElement('input');
      duration.type = 'text';
      duration.value = action.durationMs;
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
    } else if (action.kind === 'gotoScript') {
      renderGotoScriptActionEditor(automation, script, action, row);
    } else {
      renderActionTargetPicker(automation, script, action, row);
    }

    const controls = document.createElement('div');
    controls.classList.add('script-action-controls');

    const up = document.createElement('button');
    up.textContent = '↑';
    up.disabled = index === 0;
    up.addEventListener('click', () => {
      const movedAction = actions.splice(index, 1)[0];
      actions.splice(index - 1, 0, movedAction);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    controls.appendChild(up);

    const down = document.createElement('button');
    down.textContent = '↓';
    down.disabled = index === actions.length - 1;
    down.addEventListener('click', () => {
      const movedAction = actions.splice(index, 1)[0];
      actions.splice(index + 1, 0, movedAction);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    controls.appendChild(down);

    const remove = document.createElement('button');
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      actions.splice(index, 1);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    controls.appendChild(remove);
    row.appendChild(controls);
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

function renderSetVariableActionEditor(automation, script, action, row) {
  normalizeScriptAction(automation, action);
  const typeSelect = createSelect([
    { id: 'number', label: getAutomationCardText('scriptVariableTypeNumber', {}, 'Number') },
    { id: 'script', label: getAutomationCardText('scriptVariableTypeScript', {}, 'Script') }
  ], action.variableType || 'number');
  action.variableType = typeSelect.value;
  typeSelect.addEventListener('change', event => {
    action.variableType = event.target.value;
    normalizeScriptAction(automation, action);
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });
  typeSelect.title = getAutomationCardText('scriptVariableTypeLabel', {}, 'Variable type');
  row.appendChild(typeSelect);

  const variables = automation.getVariableTargets(action.variableType, script.id);
  const variableSelect = createSelect(variables.map(item => ({ id: item.id, label: item.label })), action.variableId);
  action.variableId = variableSelect.value || 'A';
  variableSelect.addEventListener('change', event => {
    action.variableId = event.target.value;
    queueAutomationUIRefresh();
  });
  variableSelect.title = getAutomationCardText('scriptVariableLabel', {}, 'Variable');
  row.appendChild(variableSelect);

  if (action.variableType === 'script') {
    const scriptSelect = createSelect(createScriptTargetOptions(automation, true), action.targetScriptId || '');
    action.targetScriptId = scriptSelect.value === '' ? null : Number(scriptSelect.value);
    scriptSelect.addEventListener('change', event => {
      action.targetScriptId = event.target.value === '' ? null : Number(event.target.value);
      queueAutomationUIRefresh();
    });
    scriptSelect.title = getAutomationCardText('scriptChooseScript', {}, 'Choose Script');
    row.appendChild(scriptSelect);
  } else {
    renderExpressionEditor(
      automation,
      action.valueExpression,
      row,
      getAutomationCardText('scriptVariableValue', {}, 'Value')
    );
  }
}

function renderGotoScriptActionEditor(automation, script, action, row) {
  normalizeScriptAction(automation, action);
  const modeSelect = createSelect([
    { id: 'script', label: getAutomationCardText('scriptChooseScript', {}, 'Choose Script') },
    { id: 'variable', label: getAutomationCardText('scriptVariableTypeScriptVariable', {}, 'Script variable') }
  ], action.scriptTargetMode || 'script');
  action.scriptTargetMode = modeSelect.value;
  modeSelect.addEventListener('change', event => {
    action.scriptTargetMode = event.target.value;
    normalizeScriptAction(automation, action);
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });
  row.appendChild(modeSelect);

  if (action.scriptTargetMode === 'variable') {
    const variables = automation.getVariableTargets('script', script.id);
    const variableSelect = createSelect(variables.map(item => ({ id: item.id, label: item.label })), action.scriptVariableId);
    action.scriptVariableId = variableSelect.value || 'A';
    variableSelect.addEventListener('change', event => {
      action.scriptVariableId = event.target.value || 'A';
      queueAutomationUIRefresh();
    });
    variableSelect.title = getAutomationCardText('scriptVariableTypeScriptVariable', {}, 'Script variable');
    row.appendChild(variableSelect);
  } else {
    const defaultScriptId = action.targetScriptId || script.id || automation.scripts[0]?.id || '';
    const scriptSelect = createSelect(createScriptTargetOptions(automation, false), defaultScriptId);
    action.targetScriptId = scriptSelect.value ? Number(scriptSelect.value) : null;
    scriptSelect.addEventListener('change', event => {
      action.targetScriptId = Number(event.target.value);
      queueAutomationUIRefresh();
    });
    row.appendChild(scriptSelect);
  }
}

function createScriptTargetOptions(automation, includeNull) {
  const options = [];
  if (includeNull) {
    options.push({ id: '', label: getAutomationCardText('scriptNullTargetOption', {}, '(null)') });
  }
  const scripts = Array.isArray(automation.scripts) ? automation.scripts : [];
  scripts.forEach(targetScript => {
    options.push({
      id: targetScript.id,
      label: targetScript.name
        || getAutomationCardText('scriptWithId', { id: targetScript.id }, `Script ${targetScript.id}`)
    });
  });
  return options;
}

function renderActionTargetPicker(automation, script, action, row) {
  if (action.kind === 'togglePause') {
    const modeSelect = createSelect([
      { id: 'on', label: getAutomationCardText('scriptToggleModeOn', {}, 'On') },
      { id: 'off', label: getAutomationCardText('scriptToggleModeOff', {}, 'Off') },
      { id: 'toggle', label: getAutomationCardText('scriptToggleModeToggle', {}, 'Toggle') }
    ], action.toggleValue || 'toggle');
    action.toggleValue = modeSelect.value;
    action.automationType = null;
    action.presetId = null;
    action.combinationId = null;
    modeSelect.addEventListener('change', event => {
      action.toggleValue = event.target.value;
      queueAutomationUIRefresh();
    });
    row.appendChild(modeSelect);
    return;
  }

  function getAutomationTypeLabel(type) {
    if (type === 'buildings') return getAutomationCardText('scriptAutomationTypeBuildings', {}, 'Buildings');
    if (type === 'projects') return getAutomationCardText('scriptAutomationTypeProjects', {}, 'Projects');
    if (type === 'colony') return getAutomationCardText('scriptAutomationTypeColony', {}, 'Colony');
    if (type === 'research') return getAutomationCardText('scriptAutomationTypeResearch', {}, 'Research');
    if (type === 'scripting') return getAutomationCardText('scriptAutomationTypeScripting', {}, 'Scripting');
    if (type === 'autoTravel') return getAutomationCardText('scriptAutomationTypeAutoTravel', {}, 'Auto Travel');
    if (type === 'ship') return getAutomationCardText('scriptAutomationTypeShip', {}, 'Ship');
    if (type === 'life') return getAutomationCardText('scriptAutomationTypeLife', {}, 'Life');
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
  const types = action.kind === 'applyCombination'
    ? ['buildings', 'projects', 'colony']
    : action.kind === 'toggleAutomation'
      ? ['scripting', 'autoTravel', 'ship', 'life']
      : ['buildings', 'projects', 'colony', 'research', 'ship', 'life', 'autoTravel'];
  if (!types.includes(action.automationType)) action.automationType = types[0];
  const typeSelect = createSelect(types.map(type => ({ id: type, label: getAutomationTypeLabel(type) })), action.automationType);
  typeSelect.addEventListener('change', event => {
    action.automationType = event.target.value;
    action.presetId = null;
    action.combinationId = null;
    action.toggleValue = action.toggleValue || 'toggle';
    forceScriptAutomationRefresh = true;
    queueAutomationUIRefresh();
  });
  row.appendChild(typeSelect);

  if (action.kind === 'toggleAutomation') {
    const modeSelect = createSelect([
      { id: 'on', label: getAutomationCardText('scriptToggleModeOn', {}, 'On') },
      { id: 'off', label: getAutomationCardText('scriptToggleModeOff', {}, 'Off') },
      { id: 'toggle', label: getAutomationCardText('scriptToggleModeToggle', {}, 'Toggle') }
    ], action.toggleValue || 'toggle');
    action.toggleValue = modeSelect.value;
    modeSelect.addEventListener('change', event => {
      action.toggleValue = event.target.value;
      queueAutomationUIRefresh();
    });
    row.appendChild(modeSelect);
    return;
  }

  const target = getScriptActionAutomationTarget(action.automationType);
  if (action.kind === 'applyCombination') {
    const combinations = target?.getCombinations ? target.getCombinations() : [];
    const comboOptions = [{
      id: '',
      label: getAutomationCardText('scriptNullTargetOption', {}, '(null)')
    }];
    for (let index = 0; index < combinations.length; index += 1) {
      const combo = combinations[index];
      comboOptions.push({ id: combo.id, label: combo.name || `Combination ${combo.id}` });
    }
    const selectedCombinationId = action.combinationId === null || action.combinationId === undefined
      ? ''
      : action.combinationId;
    const comboSelect = createSelect(comboOptions, selectedCombinationId);
    action.combinationId = comboSelect.value === '' ? null : Number(comboSelect.value);
    comboSelect.addEventListener('change', event => {
      action.combinationId = event.target.value === '' ? null : Number(event.target.value);
      queueAutomationUIRefresh();
    });
    row.appendChild(comboSelect);
  } else {
    const presets = target?.presets || [];
    const presetOptions = [{
      id: '',
      label: getAutomationCardText('scriptNullTargetOption', {}, '(null)')
    }];
    for (let index = 0; index < presets.length; index += 1) {
      const preset = presets[index];
      presetOptions.push({ id: preset.id, label: preset.name || `Preset ${preset.id}` });
    }
    const selectedPresetId = action.presetId === null || action.presetId === undefined
      ? ''
      : action.presetId;
    const presetSelect = createSelect(presetOptions, selectedPresetId);
    action.presetId = presetSelect.value === '' ? null : Number(presetSelect.value);
    presetSelect.addEventListener('change', event => {
      action.presetId = event.target.value === '' ? null : Number(event.target.value);
      forceScriptAutomationRefresh = true;
      queueAutomationUIRefresh();
    });
    row.appendChild(presetSelect);
    const selectedPreset = action.presetId && target?.getPresetById
      ? target.getPresetById(Number(action.presetId))
      : null;
    if (selectedPreset && target.isParameterizedPreset && target.isParameterizedPreset(selectedPreset)) {
      action.parameterVariableId = automationManager.scriptAutomation.normalizeVariableId(action.parameterVariableId);
      const variables = automation.getVariableTargets('number', script.id);
      const parameterLabel = document.createElement('span');
      parameterLabel.classList.add('script-action-parameter-label');
      parameterLabel.textContent = getAutomationCardText('scriptParameterWithValueLabel', {}, 'with value');
      const variableSelect = createSelect(
        variables.map(item => ({ id: item.id, label: item.label })),
        action.parameterVariableId
      );
      variableSelect.title = getAutomationCardText('scriptParameterVariableLabel', {}, 'Parameter variable');
      variableSelect.addEventListener('change', event => {
        action.parameterVariableId = event.target.value || 'A';
        queueAutomationUIRefresh();
      });
      row.appendChild(parameterLabel);
      row.appendChild(variableSelect);
    }
  }
}

function getScriptActionAutomationTarget(type) {
  if (!automationManager) return null;
  if (type === 'buildings') return automationManager.buildingsAutomation;
  if (type === 'projects') return automationManager.projectsAutomation;
  if (type === 'colony') return automationManager.colonyAutomation;
  if (type === 'research') return automationManager.researchAutomation;
  if (type === 'ship') return automationManager.spaceshipAutomation;
  if (type === 'life') return automationManager.lifeAutomation;
  if (type === 'autoTravel') return automationManager.autoTravelAutomation;
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
