class ScriptAutomation {
  constructor() {
    this.enabled = false;
    this.running = false;
    this.collapsed = false;
    this.scripts = [];
    this.selectedScriptId = null;
    this.activeScriptId = null;
    this.pcLineId = null;
    this.pcActionIndex = 0;
    this.nextScriptId = 1;
    this.nextLineId = 1;
    this.lastStatus = 'Inactive';
    this.lastError = '';
    this.lastActionSummary = '';
    this.lastLineOutcomeSummary = '';
    this.lastLineOutcomeLineId = null;
    this.lastEvaluatedLineId = null;
    this.manualStepDisplayLineId = null;
    this.manualStepPendingLineId = null;
    this.lastConditionResult = null;
    this.consoleOutputHistory = [];
    this.nextConsoleOutputId = 1;
    this.lastConsoleOutput = '';
    this.haltedReason = 'inactive';
    this.autoRestartOnCompletion = true;
    this.goToRowOneOnTravel = false;
    this.nextTravelScriptId = null;
    this.nextTravelPersistent = false;
    this.sleepRemainingMs = 0;
    this.maxLinesPerTick = 25;
    this.maxActionsPerTick = 25;
    this.registry = new ScriptVariableRegistry(this);
    this.variableValues = {};
    this.scriptVariableValues = {};
    this.variableNames = this.createVariableNames();
    this.resetVariables();
    this.ensureDefaultScript();
  }

  enable() {
    this.enabled = true;
    if (typeof queueAutomationUIRefresh === 'function') queueAutomationUIRefresh();
  }

  disable() {
    this.enabled = false;
    this.running = false;
    if (typeof queueAutomationUIRefresh === 'function') queueAutomationUIRefresh();
  }

  setCollapsed(collapsed) {
    this.collapsed = !!collapsed;
  }

  isActive() {
    return automationManager.enabled && this.enabled && this.running;
  }

  ensureDefaultScript() {
    if (this.scripts.length > 0) return;
    const script = {
      id: this.nextScriptId++,
      name: t('ui.hope.automationCards.defaultScriptName', {}, 'Default Script'),
      variableNames: this.createVariableNames(),
      lines: [this.createLine('if')]
    };
    this.scripts.push(script);
    this.selectedScriptId = script.id;
    this.activeScriptId = script.id;
    this.pcLineId = script.lines[0].id;
  }

  createLine(kind = 'if') {
    return {
      id: this.nextLineId++,
      name: '',
      description: '',
      kind,
      linkedIfLineId: null,
      enabled: true,
      expanded: true,
      condition: this.createDefaultCondition(),
      actions: []
    };
  }

  createDefaultCondition() {
    return {
      clauses: [this.createDefaultClause()]
    };
  }

  createDefaultClause() {
    return {
      join: 'and',
      not: false,
      left: this.createDefaultExpression(),
      comparator: '>',
      right: {
        terms: [
          {
            op: 'add',
            ref: { source: 'constant', category: 'constant', target: 'constant', attribute: 'value', constant: 0 }
          }
        ]
      }
    };
  }

  createDefaultExpression() {
    return {
      terms: [
        {
          op: 'add',
          ref: { source: 'constant', category: 'constant', target: 'constant', attribute: 'value', constant: 1 }
        }
      ]
    };
  }

  resetVariables() {
    this.variableValues = {};
    this.scriptVariableValues = {};
    for (let index = 0; index < 26; index += 1) {
      const id = String.fromCharCode(65 + index);
      this.variableValues[id] = 0;
      this.scriptVariableValues[id] = null;
    }
  }

  getVariableValue(variableId) {
    const id = this.normalizeVariableId(variableId);
    return this.registry.toNumber(this.variableValues[id]);
  }

  setVariableValue(variableId, value) {
    const id = this.normalizeVariableId(variableId);
    this.variableValues[id] = this.registry.toNumber(value);
    return true;
  }

  getScriptVariableValue(variableId) {
    const id = this.normalizeVariableId(variableId);
    const scriptId = Number(this.scriptVariableValues[id]);
    return this.scripts.find(script => script.id === scriptId) ? scriptId : null;
  }

  setScriptVariableValue(variableId, scriptId) {
    const id = this.normalizeVariableId(variableId);
    const numericId = Number(scriptId);
    this.scriptVariableValues[id] = this.scripts.find(script => script.id === numericId) ? numericId : null;
    return true;
  }

  normalizeVariableId(variableId) {
    const id = String(variableId || 'A').toUpperCase();
    return /^[A-Z]$/.test(id) ? id : 'A';
  }

  getSelectedScript() {
    const script = this.scripts.find(item => item.id === Number(this.selectedScriptId));
    if (script) return script;
    this.selectedScriptId = this.scripts[0]?.id || null;
    return this.scripts[0] || null;
  }

  getActiveScript() {
    const script = this.scripts.find(item => item.id === Number(this.activeScriptId));
    if (script) return script;
    this.activeScriptId = this.getSelectedScript()?.id || null;
    return this.getSelectedScript();
  }

  setSelectedScriptId(id) {
    const script = this.scripts.find(item => item.id === Number(id));
    if (!script) return null;
    this.selectedScriptId = script.id;
    return script;
  }

  createVariableNames() {
    return {
      number: {},
      script: {}
    };
  }

  normalizeVariableNames(variableNames) {
    const normalized = this.createVariableNames();
    if (!variableNames || variableNames.constructor !== Object) return normalized;
    ['number', 'script'].forEach(variableType => {
      const names = variableNames[variableType];
      if (!names || names.constructor !== Object) return;
      for (const variableId in names) {
        const id = String(variableId).toUpperCase();
        if (!/^[A-Z]$/.test(id)) continue;
        const name = String(names[variableId] || '').trim().slice(0, 64);
        if (name) normalized[variableType][id] = name;
      }
    });
    return normalized;
  }

  getVariableName(variableType, variableId, scriptId = this.selectedScriptId) {
    const type = variableType === 'script' ? 'script' : 'number';
    const id = this.normalizeVariableId(variableId);
    const script = this.scripts.find(item => item.id === Number(scriptId));
    return script?.variableNames?.[type]?.[id] || this.variableNames[type][id] || '';
  }

  getGlobalVariableName(variableType, variableId) {
    const type = variableType === 'script' ? 'script' : 'number';
    const id = this.normalizeVariableId(variableId);
    return this.variableNames[type][id] || '';
  }

  getScriptVariableName(scriptId, variableType, variableId) {
    const type = variableType === 'script' ? 'script' : 'number';
    const id = this.normalizeVariableId(variableId);
    const script = this.scripts.find(item => item.id === Number(scriptId));
    return script?.variableNames?.[type]?.[id] || '';
  }

  setVariableName(scope, variableType, variableId, name, scriptId = this.selectedScriptId) {
    const type = variableType === 'script' ? 'script' : 'number';
    const id = this.normalizeVariableId(variableId);
    const normalizedName = String(name || '').trim().slice(0, 64);
    const names = scope === 'script'
      ? this.scripts.find(item => item.id === Number(scriptId))?.variableNames?.[type]
      : this.variableNames[type];
    if (!names) return false;
    if (normalizedName) names[id] = normalizedName;
    else delete names[id];
    return true;
  }

  getVariableTargets(variableType = 'number', scriptId = this.selectedScriptId) {
    const targets = [];
    for (let index = 0; index < 26; index += 1) {
      const id = String.fromCharCode(65 + index);
      targets.push({ id, label: this.getVariableName(variableType, id, scriptId) || id });
    }
    return targets;
  }

  moveScript(id, direction) {
    const numericId = Number(id);
    const index = this.scripts.findIndex(script => script.id === numericId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= this.scripts.length) {
      return false;
    }
    const moved = this.scripts.splice(index, 1)[0];
    this.scripts.splice(nextIndex, 0, moved);
    return true;
  }

  addScript(name = '') {
    const line = this.createLine('if');
    const script = {
      id: this.nextScriptId++,
      name: name || `Script ${this.nextScriptId - 1}`,
      variableNames: this.createVariableNames(),
      lines: [line]
    };
    this.scripts.push(script);
    this.selectedScriptId = script.id;
    this.activeScriptId = script.id;
    this.pcLineId = line.id;
    return script.id;
  }

  duplicateScript(id) {
    const source = this.scripts.find(item => item.id === Number(id));
    if (!source) return null;
    const script = this.deepClone(source);
    script.id = this.nextScriptId++;
    script.name = `${source.name || 'Script'} Copy`;
    const lineIdMap = {};
    script.lines.forEach(line => {
      const oldId = line.id;
      line.id = this.nextLineId++;
      lineIdMap[oldId] = line.id;
    });
    script.lines.forEach(line => {
      line.linkedIfLineId = line.linkedIfLineId ? lineIdMap[line.linkedIfLineId] || null : null;
    });
    this.scripts.push(script);
    this.selectedScriptId = script.id;
    return script.id;
  }

  deleteScript(id) {
    if (this.scripts.length <= 1) return false;
    const numericId = Number(id);
    this.scripts = this.scripts.filter(script => script.id !== numericId);
    if (this.selectedScriptId === numericId) this.selectedScriptId = this.scripts[0].id;
    if (this.activeScriptId === numericId) {
      this.activeScriptId = this.scripts[0].id;
      this.pcLineId = this.scripts[0].lines[0]?.id || null;
      this.pcActionIndex = 0;
    }
    if (this.nextTravelScriptId === numericId) {
      this.nextTravelScriptId = null;
      this.nextTravelPersistent = false;
    }
    for (const id in this.scriptVariableValues) {
      if (Number(this.scriptVariableValues[id]) === numericId) this.scriptVariableValues[id] = null;
    }
    return true;
  }

  renameScript(id, name) {
    const script = this.scripts.find(item => item.id === Number(id));
    if (!script) return false;
    script.name = name || `Script ${script.id}`;
    return true;
  }

  clearDeletedAutomationTargetReference(automationType, targetKind, targetId) {
    const numericId = Number(targetId);
    if (!automationType || !targetKind || !Number.isFinite(numericId)) {
      return false;
    }
    let changed = false;
    for (let scriptIndex = 0; scriptIndex < this.scripts.length; scriptIndex += 1) {
      const script = this.scripts[scriptIndex];
      const lines = Array.isArray(script.lines) ? script.lines : [];
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        const actions = Array.isArray(line.actions) ? line.actions : [];
        for (let actionIndex = 0; actionIndex < actions.length; actionIndex += 1) {
          const action = actions[actionIndex];
          if (action.automationType !== automationType) {
            continue;
          }
          if (targetKind === 'preset' && action.kind === 'applyPreset' && Number(action.presetId) === numericId) {
            action.presetId = null;
            changed = true;
          } else if (targetKind === 'combination' && action.kind === 'applyCombination' && Number(action.combinationId) === numericId) {
            action.combinationId = null;
            changed = true;
          }
        }
      }
    }
    return changed;
  }

  getPresetUsageReferences(automationType, presetId) {
    const numericPresetId = Number(presetId);
    const target = this.getAutomationTarget(automationType);
    const references = [];
    if (!automationType || !numericPresetId || !target) {
      return references;
    }

    const matchingCombinationNames = {};
    if (Array.isArray(target.combinations)) {
      target.combinations.forEach(combination => {
        const assignments = Array.isArray(combination.assignments) ? combination.assignments : [];
        if (assignments.find(entry => Number(entry.presetId) === numericPresetId && entry.enabled !== false)) {
          matchingCombinationNames[combination.id] = combination.name || `${target.combinationLabel || 'Combination'} ${combination.id}`;
        }
      });
    }

    for (let scriptIndex = 0; scriptIndex < this.scripts.length; scriptIndex += 1) {
      const script = this.scripts[scriptIndex];
      const lines = Array.isArray(script.lines) ? script.lines : [];
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        const actions = Array.isArray(line.actions) ? line.actions : [];
        for (let actionIndex = 0; actionIndex < actions.length; actionIndex += 1) {
          const action = actions[actionIndex];
          if (action.automationType !== automationType) {
            continue;
          }
          if (action.kind === 'applyPreset' && Number(action.presetId) === numericPresetId) {
            references.push({
              scriptId: script.id,
              scriptName: script.name || `Script ${script.id}`,
              lineNumber: lineIndex + 1,
              lineName: line.name || '',
              viaCombinationName: ''
            });
          } else if (action.kind === 'applyCombination') {
            const combinationName = matchingCombinationNames[Number(action.combinationId)] || '';
            if (combinationName) {
              references.push({
                scriptId: script.id,
                scriptName: script.name || `Script ${script.id}`,
                lineNumber: lineIndex + 1,
                lineName: line.name || '',
                viaCombinationName: combinationName
              });
            }
          }
        }
      }
    }
    return references;
  }

  getCombinationUsageReferences(automationType, combinationId) {
    const numericCombinationId = Number(combinationId);
    const target = this.getAutomationTarget(automationType);
    const references = [];
    if (!automationType || !numericCombinationId || !target) {
      return references;
    }

    for (let scriptIndex = 0; scriptIndex < this.scripts.length; scriptIndex += 1) {
      const script = this.scripts[scriptIndex];
      const lines = Array.isArray(script.lines) ? script.lines : [];
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        const actions = Array.isArray(line.actions) ? line.actions : [];
        for (let actionIndex = 0; actionIndex < actions.length; actionIndex += 1) {
          const action = actions[actionIndex];
          if (action.automationType !== automationType) {
            continue;
          }
          if (action.kind === 'applyCombination' && Number(action.combinationId) === numericCombinationId) {
            references.push({
              scriptId: script.id,
              scriptName: script.name || `Script ${script.id}`,
              lineNumber: lineIndex + 1,
              lineName: line.name || ''
            });
          }
        }
      }
    }
    return references;
  }

  runScript(id) {
    const script = this.scripts.find(item => item.id === Number(id));
    if (!script) return false;
    this.activeScriptId = script.id;
    if (!this.pcLineId || !script.lines.find(line => line.id === this.pcLineId)) {
      this.pcLineId = script.lines[0]?.id || null;
      this.pcActionIndex = 0;
    }
    this.running = true;
    this.sleepRemainingMs = 0;
    this.manualStepDisplayLineId = null;
    this.manualStepPendingLineId = null;
    this.lastStatus = 'Running';
    this.haltedReason = 'running';
    return true;
  }

  applyTravelScript() {
    if (!this.enabled) {
      return false;
    }
    const script = this.scripts.find(item => item.id === Number(this.nextTravelScriptId));
    if (!script) {
      this.nextTravelScriptId = null;
      this.nextTravelPersistent = false;
      return false;
    }
    this.selectedScriptId = script.id;
    this.runScript(script.id);
    this.applyGoToRowOneOnTravel(script);
    this.lastStatus = 'Running (Travel script)';
    if (!this.nextTravelPersistent) {
      this.nextTravelScriptId = null;
    }
    return true;
  }

  runTravelScript(scriptId, statusText) {
    const script = this.scripts.find(item => item.id === Number(scriptId));
    if (!script) return false;
    this.enable();
    this.selectedScriptId = script.id;
    this.runScript(script.id);
    this.applyGoToRowOneOnTravel(script);
    this.lastStatus = statusText || 'Running (Travel script)';
    return true;
  }

  applyTravelPointerResetIfEnabled() {
    if (!this.goToRowOneOnTravel) return false;
    const script = this.getActiveScript() || this.getSelectedScript();
    if (!script) return false;
    this.applyGoToRowOneOnTravel(script);
    return true;
  }

  applyGoToRowOneOnTravel(script) {
    if (!this.goToRowOneOnTravel) return;
    this.pcLineId = script?.lines[0]?.id || null;
    this.pcActionIndex = 0;
    this.manualStepDisplayLineId = null;
    this.manualStepPendingLineId = null;
  }

  pause() {
    this.running = false;
    this.manualStepDisplayLineId = null;
    this.manualStepPendingLineId = null;
    this.haltedReason = 'paused';
    this.lastStatus = 'Paused';
  }

  reset() {
    const script = this.getActiveScript();
    this.pcLineId = script?.lines[0]?.id || null;
    this.pcActionIndex = 0;
    this.manualStepDisplayLineId = null;
    this.manualStepPendingLineId = null;
    this.sleepRemainingMs = 0;
    this.haltedReason = 'reset';
    this.lastStatus = 'Ready to Start';
  }

  stepOnce() {
    const wasRunning = this.running;
    const script = this.getActiveScript();
    if (!this.running && this.manualStepPendingLineId && !script?.lines.find(line => line.id === this.manualStepPendingLineId)) {
      this.manualStepPendingLineId = null;
    }
    if (!this.running && this.manualStepPendingLineId) {
      this.pcLineId = this.manualStepPendingLineId;
      this.pcActionIndex = 0;
      this.manualStepPendingLineId = null;
    }
    if (!this.pcLineId && script?.lines.length) {
      this.pcLineId = script.lines[0].id;
      this.pcActionIndex = 0;
    }
    if (!this.pcLineId) this.pcActionIndex = 0;
    this.running = true;
    this.update(0, true);
    this.manualStepDisplayLineId = this.lastEvaluatedLineId;
    if (wasRunning && this.pcLineId) {
      this.running = true;
    } else {
      this.running = false;
      if (this.haltedReason === 'skippedBranch') this.lastStatus = 'Paused';
    }
  }

  addLine(scriptId, kind = 'if') {
    const script = this.scripts.find(item => item.id === Number(scriptId));
    if (!script) return null;
    const line = this.createLine(kind);
    this.assignDefaultLinkedIf(script, line);
    script.lines.push(line);
    if (!this.pcLineId) this.pcLineId = line.id;
    return line.id;
  }

  insertLine(scriptId, lineId, direction, kind = 'if') {
    const script = this.scripts.find(item => item.id === Number(scriptId));
    if (!script) return null;
    const index = script.lines.findIndex(line => line.id === Number(lineId));
    if (index < 0) return null;
    const insertIndex = direction < 0 ? index : index + 1;
    const line = this.createLine(kind);
    script.lines.splice(insertIndex, 0, line);
    this.assignDefaultLinkedIf(script, line);
    this.relinkInsertedElseIfContinuation(script, line);
    if (!this.pcLineId) this.pcLineId = line.id;
    return line.id;
  }

  relinkInsertedElseIfContinuation(script, line) {
    if (line.kind !== 'elseIf' || !line.linkedIfLineId) return;
    const lineIndex = this.getLineIndex(script, line.id);
    const nextContinuation = script.lines.find((item, index) =>
      index > lineIndex
      && ['elseIf', 'else'].includes(item.kind)
      && item.id !== line.id
      && Number(item.linkedIfLineId) === Number(line.linkedIfLineId)
    );
    if (nextContinuation) nextContinuation.linkedIfLineId = line.id;
  }

  removeLine(scriptId, lineId) {
    const script = this.scripts.find(item => item.id === Number(scriptId));
    if (!script || script.lines.length <= 1) return false;
    const removedActiveLine = this.pcLineId === Number(lineId);
    script.lines = script.lines.filter(line => line.id !== Number(lineId));
    script.lines.forEach(line => {
      if (line.linkedIfLineId === Number(lineId)) line.linkedIfLineId = null;
    });
    if (removedActiveLine) {
      this.pcLineId = script.lines[0]?.id || null;
      this.pcActionIndex = 0;
    }
    return true;
  }

  moveLine(scriptId, lineId, direction) {
    const script = this.scripts.find(item => item.id === Number(scriptId));
    if (!script) return false;
    const index = script.lines.findIndex(line => line.id === Number(lineId));
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= script.lines.length) return false;
    const [line] = script.lines.splice(index, 1);
    script.lines.splice(nextIndex, 0, line);
    return true;
  }

  getLineIndex(script, lineId) {
    return script.lines.findIndex(line => line.id === Number(lineId));
  }

  getPreviousLine(script, line) {
    const index = this.getLineIndex(script, line.id);
    if (index <= 0) return null;
    return script.lines[index - 1];
  }

  updateLine(scriptId, lineId, patch) {
    const line = this.getLine(scriptId, lineId);
    if (!line) return false;
    Object.assign(line, patch);
    return true;
  }

  assignDefaultLinkedIf(script, line) {
    if (!['elseIf', 'else'].includes(line.kind)) {
      line.linkedIfLineId = null;
      return;
    }
    const options = this.getValidLinkedIfOptions(script, line);
    line.linkedIfLineId = options.length ? options[options.length - 1].id : null;
  }

  getValidLinkedIfOptions(script, line) {
    const index = script.lines.findIndex(item => item.id === line.id);
    const lineIndex = index >= 0 ? index : script.lines.length;
    const openBranches = [];
    for (let i = 0; i < lineIndex; i += 1) {
      const current = script.lines[i];
      if (current.kind === 'if') {
        openBranches.push(current);
      } else if (current.kind === 'elseIf' || current.kind === 'else') {
        const linkedIndex = openBranches.findIndex(item => item.id === Number(current.linkedIfLineId));
        if (linkedIndex >= 0) {
          openBranches.splice(linkedIndex);
          if (current.kind === 'elseIf') openBranches.push(current);
        }
      }
    }
    return openBranches;
  }

  getLinkedElseLine(script, line) {
    return script.lines.find(item => ['elseIf', 'else'].includes(item.kind) && Number(item.linkedIfLineId) === line.id) || null;
  }

  getLinkedIfLine(script, line) {
    if (!['elseIf', 'else'].includes(line.kind) || !line.linkedIfLineId) return null;
    const linkedIf = script.lines.find(item => item.id === Number(line.linkedIfLineId)) || null;
    if (!linkedIf || !['if', 'elseIf'].includes(linkedIf.kind)) return null;
    if (this.getLineIndex(script, linkedIf.id) >= this.getLineIndex(script, line.id)) return null;
    if (!this.getValidLinkedIfOptions(script, line).find(item => item.id === linkedIf.id)) return null;
    if (this.getLinkedElseLine(script, linkedIf)?.id !== line.id) return null;
    return linkedIf;
  }

  getLine(scriptId, lineId) {
    const script = this.scripts.find(item => item.id === Number(scriptId));
    if (!script) return null;
    return script.lines.find(line => line.id === Number(lineId)) || null;
  }

  update(delta, forceStep = false) {
    if (!forceStep && this.sleepRemainingMs > 0) {
      this.sleepRemainingMs = Math.max(0, this.sleepRemainingMs - Math.max(0, delta || 0));
      if (this.sleepRemainingMs > 0) {
        this.haltedReason = 'sleep';
        this.lastStatus = `Sleeping (${formatNumber(this.sleepRemainingMs, false, 0)} ms)`;
        return;
      }
    }
    if (!forceStep && this.running) this.manualStepDisplayLineId = null;
    if (!forceStep && !this.isActive()) {
      if (this.enabled && this.haltedReason === 'end') {
        this.lastStatus = 'End reached';
      } else if (this.enabled && this.haltedReason === 'reset') {
        this.lastStatus = 'Ready to Start';
      } else {
        this.lastStatus = this.enabled ? 'Paused' : 'Inactive';
        this.haltedReason = this.enabled ? 'paused' : 'inactive';
      }
      return;
    }

    const script = this.getActiveScript();
    if (!script || script.lines.length === 0) {
      this.haltedReason = 'noScript';
      this.lastStatus = 'No script';
      return;
    }

    let linesEvaluated = 0;
    let actionsUsed = 0;
    let gotoUsed = false;
    this.lastError = '';
    this.lastActionSummary = '';
    this.lastLineOutcomeSummary = '';
    this.lastLineOutcomeLineId = null;
    const maxLines = forceStep ? 1 : this.maxLinesPerTick;

    while (linesEvaluated < maxLines) {
      if (!forceStep && actionsUsed >= this.maxActionsPerTick) {
        this.haltedReason = 'actionLimit';
        this.lastStatus = 'Action limit reached';
        break;
      }
      const line = this.getCurrentLine(script);
      if (!line) {
        if (this.autoRestartOnCompletion) {
          this.pcLineId = script.lines[0]?.id || null;
          this.pcActionIndex = 0;
          this.haltedReason = 'autoRestart';
          this.lastStatus = 'Running (Auto restarting)';
        } else {
          this.running = false;
          this.haltedReason = 'end';
          this.lastStatus = 'End reached';
        }
        break;
      }

      this.lastEvaluatedLineId = line.id;
      linesEvaluated += 1;
      if (line.enabled === false) {
        this.advanceLine(script, line);
        this.haltedReason = 'disabledLine';
        this.lastStatus = `Skipped disabled ${this.getLineLabel(script, line)}`;
        continue;
      }
      if (line.kind === 'actions') {
        const actionResult = this.runActions(
          line.actions,
          script,
          { actionsUsed, gotoUsed },
          this.pcActionIndex,
          forceStep ? 1 : Infinity,
          forceStep
        );
        actionsUsed = actionResult.actionsUsed;
        gotoUsed = actionResult.gotoUsed;
        if (actionResult.gotoTriggered || actionResult.actionLimitReached || actionResult.sleepTriggered) {
          this.pcActionIndex = actionResult.nextActionIndex;
          this.haltedReason = actionResult.gotoTriggered ? 'goto' : (actionResult.sleepTriggered ? 'sleep' : 'actionLimit');
          this.lastStatus = actionResult.gotoTriggered ? 'GOTO executed' : (actionResult.sleepTriggered ? `Sleeping (${formatNumber(this.sleepRemainingMs, false, 0)} ms)` : 'Action limit reached');
          break;
        }
        this.pcActionIndex = 0;
        this.advanceLine(script, line);
        this.haltedReason = 'actions';
        this.lastStatus = `Ran actions ${this.getLineLabel(script, line)}`;
        break;
      }

      if (line.kind === 'if' || line.kind === 'elseIf' || line.kind === 'else') {
        const isResumingLineActions = this.pcActionIndex > 0;
        const branchResult = isResumingLineActions ? {
          conditionResult: true,
          executeActions: true,
          stopAfterLine: false,
          gotoLineId: null,
          skippedByEarlierMatch: false
        } : this.evaluateConditionalLine(script, line);
        this.lastConditionResult = branchResult.conditionResult;
        if (branchResult.executeActions) {
          const actionResult = this.runActions(
            line.actions,
            script,
            { actionsUsed, gotoUsed },
            this.pcActionIndex,
            forceStep ? 1 : Infinity,
            forceStep
          );
          actionsUsed = actionResult.actionsUsed;
          gotoUsed = actionResult.gotoUsed;
          if (actionResult.gotoTriggered || actionResult.actionLimitReached || actionResult.sleepTriggered) {
            this.pcActionIndex = actionResult.nextActionIndex;
            this.haltedReason = actionResult.gotoTriggered ? 'goto' : (actionResult.sleepTriggered ? 'sleep' : 'actionLimit');
            this.lastStatus = actionResult.gotoTriggered ? 'GOTO executed' : (actionResult.sleepTriggered ? `Sleeping (${formatNumber(this.sleepRemainingMs, false, 0)} ms)` : 'Action limit reached');
            break;
          }
        }

        if (branchResult.gotoLineId) {
          const targetLine = script.lines.find(item => item.id === branchResult.gotoLineId);
          const targetLabel = targetLine ? this.getLineLabel(script, targetLine) : `#${branchResult.gotoLineId}`;
          this.lastLineOutcomeSummary = `GOTO ${targetLabel}`;
          this.lastLineOutcomeLineId = line.id;
          if (forceStep) {
            this.pcLineId = branchResult.gotoLineId;
            this.pcActionIndex = 0;
            this.manualStepPendingLineId = null;
            this.haltedReason = 'linkedElse';
            this.lastStatus = 'Paused';
            break;
          }
          this.pcLineId = branchResult.gotoLineId;
          this.pcActionIndex = 0;
          this.haltedReason = 'linkedElse';
          this.lastStatus = `Linked ELSE from ${this.getLineLabel(script, line)} to ${targetLabel}`;
          continue;
        }

        this.advanceLine(script, line);
        if (branchResult.skippedByEarlierMatch) {
          this.haltedReason = 'skippedBranch';
          this.lastLineOutcomeSummary = 'Skipped (earlier linked branch matched)';
          this.lastLineOutcomeLineId = line.id;
          this.lastStatus = forceStep && !this.running ? 'Paused' : `Skipped ${this.getLineLabel(script, line)} (earlier linked branch matched)`;
        } else {
          this.haltedReason = 'advanced';
          this.lastStatus = `Advanced past ${this.getLineLabel(script, line)}`;
        }

        if (branchResult.stopAfterLine) break;
        continue;
      }

      const isResumingLineActions = this.pcActionIndex > 0;
      const conditionResult = isResumingLineActions ? true : this.evaluateCondition(line.condition);
      this.lastConditionResult = conditionResult;

      if (line.kind === 'wait' && !conditionResult) {
        this.pcActionIndex = 0;
        this.haltedReason = 'wait';
        this.lastStatus = `Waiting at ${this.getLineLabel(script, line)}`;
        break;
      }

      if (conditionResult) {
        const actionResult = this.runActions(
          line.actions,
          script,
          { actionsUsed, gotoUsed },
          this.pcActionIndex,
          forceStep ? 1 : Infinity,
          forceStep
        );
        actionsUsed = actionResult.actionsUsed;
        gotoUsed = actionResult.gotoUsed;
        if (actionResult.gotoTriggered || actionResult.actionLimitReached || actionResult.sleepTriggered) {
          this.pcActionIndex = actionResult.nextActionIndex;
          this.haltedReason = actionResult.gotoTriggered ? 'goto' : (actionResult.sleepTriggered ? 'sleep' : 'actionLimit');
          this.lastStatus = actionResult.gotoTriggered ? 'GOTO executed' : (actionResult.sleepTriggered ? `Sleeping (${formatNumber(this.sleepRemainingMs, false, 0)} ms)` : 'Action limit reached');
          break;
        }
      }
      this.pcActionIndex = 0;
      this.advanceLine(script, line);
      this.haltedReason = 'advanced';
      this.lastStatus = `Advanced past ${this.getLineLabel(script, line)}`;

      if (line.kind === 'wait') break;
    }

    if (linesEvaluated >= maxLines && !forceStep) {
      this.haltedReason = 'lineLimit';
      this.lastStatus = 'Line limit reached';
    }
  }

  evaluateConditionalLine(script, line) {
    if (line.kind === 'if') {
      const conditionResult = this.evaluateCondition(line.condition);
      const linkedElse = conditionResult ? null : this.getLinkedElseLine(script, line);
      return {
        conditionResult,
        executeActions: conditionResult,
        stopAfterLine: false,
        gotoLineId: linkedElse ? linkedElse.id : null,
        skippedByEarlierMatch: false
      };
    }

    if (line.kind === 'elseIf') {
      const linkedIf = this.getLinkedIfLine(script, line);
      if (!linkedIf) {
        return {
          conditionResult: true,
          executeActions: true,
          stopAfterLine: true,
          gotoLineId: null,
          skippedByEarlierMatch: false
        };
      }
      const eligible = this.isLinkedElseEligible(script, linkedIf);
      const ownConditionResult = eligible && this.evaluateCondition(line.condition);
      const linkedElse = this.isLinkedElseEligible(script, line) ? this.getLinkedElseLine(script, line) : null;
      return {
        conditionResult: ownConditionResult,
        executeActions: ownConditionResult,
        stopAfterLine: false,
        gotoLineId: linkedElse ? linkedElse.id : null,
        skippedByEarlierMatch: !eligible
      };
    }

    const linkedIf = this.getLinkedIfLine(script, line);
    if (!linkedIf) {
      return {
        conditionResult: true,
        executeActions: true,
        stopAfterLine: true,
        gotoLineId: null,
        skippedByEarlierMatch: false
      };
    }

    const conditionResult = this.isLinkedElseEligible(script, linkedIf);
    return {
      conditionResult,
      executeActions: conditionResult,
      stopAfterLine: false,
      gotoLineId: null,
      skippedByEarlierMatch: !conditionResult
    };
  }

  isLinkedElseEligible(script, line) {
    if (line.kind === 'if') {
      if (line.enabled === false) return true;
      return !this.evaluateCondition(line.condition);
    }
    if (line.kind === 'elseIf') {
      const linkedIf = this.getLinkedIfLine(script, line);
      if (line.enabled === false) return !!linkedIf && this.isLinkedElseEligible(script, linkedIf);
      return !!linkedIf && this.isLinkedElseEligible(script, linkedIf) && !this.evaluateCondition(line.condition);
    }
    return false;
  }

  getCurrentLine(script) {
    if (!this.pcLineId) return null;
    return script.lines.find(line => line.id === this.pcLineId) || null;
  }

  getDisplayLineId() {
    if (this.haltedReason === 'reset') return null;
    if (!this.running && this.manualStepDisplayLineId) return this.manualStepDisplayLineId;
    return this.pcLineId;
  }

  advanceLine(script, line) {
    const index = script.lines.findIndex(item => item.id === line.id);
    const next = script.lines[index + 1];
    this.pcLineId = next ? next.id : null;
    this.pcActionIndex = 0;
  }

  runActions(actions, script, state, startIndex = 0, maxActionsThisRun = this.maxActionsPerTick, treatSleepAsZero = false) {
    let actionsUsed = state.actionsUsed || 0;
    let gotoUsed = !!state.gotoUsed;
    let gotoTriggered = false;
    let sleepTriggered = false;
    let actionLimitReached = false;
    let nextActionIndex = Math.max(0, Number(startIndex) || 0);
    const summaries = [];
    const actionList = Array.isArray(actions) ? actions : [];

    for (let index = nextActionIndex; index < actionList.length; index += 1) {
      if (actionsUsed >= maxActionsThisRun) {
        actionLimitReached = true;
        nextActionIndex = index;
        break;
      }
      const action = actionList[index];
      if (action.kind === 'sleep') {
        const sleepDurationMs = treatSleepAsZero ? 0 : Math.max(0, this.registry.toNumber(action.durationMs));
        this.sleepRemainingMs = sleepDurationMs;
        sleepTriggered = this.sleepRemainingMs > 0;
        const duration = formatNumber(sleepDurationMs, false, 0);
        summaries.push(t(
          'ui.hope.automationCards.scriptSummarySleep',
          { duration },
          `Sleep ${duration} ms`
        ));
        actionsUsed += 1;
        nextActionIndex = index + 1;
        if (sleepTriggered) break;
        continue;
      }
      if (action.kind === 'goto') {
        if (gotoUsed) continue;
        const target = script.lines.find(line => line.id === Number(action.targetLineId));
        if (target) {
          this.pcLineId = target.id;
          this.pcActionIndex = 0;
          gotoUsed = true;
          gotoTriggered = true;
          const targetLabel = this.getLineLabel(script, target);
          summaries.push(t(
            'ui.hope.automationCards.scriptSummaryGoto',
            { target: targetLabel },
            `GOTO ${targetLabel}`
          ));
        }
        actionsUsed += 1;
        nextActionIndex = 0;
        break;
      }
      if (action.kind === 'gotoScript') {
        if (gotoUsed) continue;
        const targetScriptId = this.resolveGotoScriptTargetId(action);
        const targetScript = this.scripts.find(item => item.id === Number(targetScriptId));
        const targetLine = targetScript?.lines?.[0] || null;
        if (targetScript && targetLine) {
          this.activeScriptId = targetScript.id;
          this.selectedScriptId = targetScript.id;
          this.pcLineId = targetLine.id;
          this.pcActionIndex = 0;
          gotoUsed = true;
          gotoTriggered = true;
          const scriptLabel = targetScript.name || t(
            'ui.hope.automationCards.scriptWithId',
            { id: targetScript.id },
            `Script ${targetScript.id}`
          );
          const targetLabel = `${scriptLabel} #1`;
          summaries.push(t(
            'ui.hope.automationCards.scriptSummaryGoto',
            { target: targetLabel },
            `GOTO ${targetLabel}`
          ));
        }
        actionsUsed += 1;
        if (gotoTriggered) {
          nextActionIndex = 0;
          break;
        }
        nextActionIndex = index + 1;
        continue;
      }

      if (this.applyAutomationAction(action)) {
        summaries.push(this.describeAction(action));
      } else if (this.lastError) {
        summaries.push(this.lastError);
      }
      actionsUsed += 1;
      nextActionIndex = index + 1;
    }

    this.lastActionSummary = summaries.join(', ');
    return { actionsUsed, gotoUsed, gotoTriggered, sleepTriggered, actionLimitReached, nextActionIndex };
  }

  applyAutomationAction(action) {
    if (!action || action.constructor !== Object) return false;
    if (action.kind === 'setVariable') {
      return this.applySetVariableAction(action);
    }
    if (action.kind === 'toggleAutomation') {
      return this.applyAutomationToggleAction(action);
    }
    if (action.kind === 'togglePause') {
      return this.applyPauseToggleAction(action);
    }
    const target = this.getAutomationTarget(action.automationType);
    if (!target) return false;
    if (action.kind === 'applyPreset' && action.presetId) {
      const presetId = Number(action.presetId);
      const preset = target.getPresetById ? target.getPresetById(presetId) : null;
      if (target.getPresetById && !preset) {
        this.lastError = t(
          'ui.automation.cards.scriptMissingPresetError',
          { type: action.automationType, id: presetId },
          `Script error: missing ${action.automationType} preset #${presetId}`
        );
        return false;
      }
      let parameterValue = null;
      if (target.isParameterizedPreset && target.isParameterizedPreset(preset)) {
        const parameterInfo = target.getPresetParameterInfo(preset);
        if (!parameterInfo.valid) {
          this.lastError = t(
            'ui.hope.automationCards.scriptInvalidParameterizedPresetError',
            { type: action.automationType, id: presetId },
            `Script error: invalid parametrized ${action.automationType} preset #${presetId}`
          );
          return false;
        }
        parameterValue = this.getVariableValue(action.parameterVariableId);
      }
      if ((action.automationType === 'ship' || action.automationType === 'life') && !target.isToggledOn()) {
        this.lastError = t(
          'ui.automation.cards.scriptAutomationDisabledError',
          { type: action.automationType },
          `Script error: ${action.automationType} automation is disabled`
        );
        return false;
      }
      target.applyPresetOnce(presetId, parameterValue);
      return true;
    }
    if (action.kind === 'applyCombination' && action.combinationId && target.applyCombinationPresets) {
      target.applyCombinationPresets(Number(action.combinationId));
      return true;
    }
    return false;
  }

  applySetVariableAction(action) {
    if (action.variableType === 'script') {
      return this.setScriptVariableValue(action.variableId, action.targetScriptId);
    }
    const expression = action.valueExpression && action.valueExpression.constructor === Object
      ? action.valueExpression
      : this.createDefaultExpression();
    return this.setVariableValue(action.variableId, this.evaluateExpression(expression));
  }

  resolveGotoScriptTargetId(action) {
    if (action.scriptTargetMode === 'variable') {
      return this.getScriptVariableValue(action.scriptVariableId);
    }
    return action.targetScriptId;
  }

  getAutomationTarget(type) {
    if (type === 'buildings') return automationManager.buildingsAutomation;
    if (type === 'projects') return automationManager.projectsAutomation;
    if (type === 'colony') return automationManager.colonyAutomation;
    if (type === 'research') return automationManager.researchAutomation;
    if (type === 'ship') return automationManager.spaceshipAutomation;
    if (type === 'life') return automationManager.lifeAutomation;
    if (type === 'autoTravel') return automationManager.autoTravelAutomation;
    return null;
  }

  applyAutomationToggleAction(action) {
    if (!action.automationType) return false;
    const value = action.toggleValue || 'toggle';
    if (action.automationType === 'scripting') {
      const scriptAutomation = automationManager.scriptAutomation;
      if (!scriptAutomation) return false;
      if (value === 'on') scriptAutomation.enable();
      else if (value === 'off') scriptAutomation.disable();
      else if (scriptAutomation.enabled) scriptAutomation.disable();
      else scriptAutomation.enable();
      return true;
    }

    const target = this.getAutomationTarget(action.automationType);
    if (!target || target.enabled === undefined) return false;
    if (value === 'on') target.setEnabled(true);
    else if (value === 'off') target.setEnabled(false);
    else target.setEnabled(!target.enabled);
    return true;
  }

  applyPauseToggleAction(action) {
    const value = action.toggleValue || 'toggle';
    const paused = isGamePaused();
    if (value === 'on') {
      if (!paused) togglePause();
      return true;
    }
    if (value === 'off') {
      if (paused) togglePause();
      return true;
    }
    togglePause();
    return true;
  }

  evaluateCondition(condition) {
    const clauses = Array.isArray(condition?.clauses) ? condition.clauses : [];
    if (clauses.length === 0) return true;
    let result = this.evaluateClause(clauses[0]);
    for (let index = 1; index < clauses.length; index += 1) {
      const clause = clauses[index];
      const next = this.evaluateClause(clause);
      if (clause.join === 'or') {
        result = result || next;
      } else {
        result = result && next;
      }
    }
    return !!result;
  }

  evaluateClause(clause) {
    const left = this.evaluateExpression(clause.left);
    const right = this.evaluateExpression(clause.right);
    let result = false;
    if (clause.comparator === '>') result = left > right;
    else if (clause.comparator === '>=') result = left >= right;
    else if (clause.comparator === '<') result = left < right;
    else if (clause.comparator === '<=') result = left <= right;
    else if (clause.comparator === '==') result = left === right;
    else if (clause.comparator === '!=') result = left !== right;
    return clause.not ? !result : result;
  }

  evaluateExpression(expression) {
    const terms = Array.isArray(expression?.terms) ? expression.terms : [];
    if (terms.length === 0) return 0;
    let value = this.registry.resolveValue(terms[0].ref);
    for (let index = 1; index < terms.length; index += 1) {
      const term = terms[index];
      const next = this.registry.resolveValue(term.ref);
      if (term.op === 'subtract') value -= next;
      else if (term.op === 'multiply') value *= next;
      else if (term.op === 'safeDivide') {
        const quotient = next === 0 ? 0 : value / next;
        value = Number.isFinite(quotient) ? quotient : 0;
      }
      else value += next;
    }
    return value;
  }

  getExpressionOperatorLabel(op) {
    if (op === 'subtract') return t('ui.hope.automationCards.scriptOperatorSubtract', {}, 'SUBTRACT');
    if (op === 'multiply') return t('ui.hope.automationCards.scriptOperatorMultiply', {}, 'MULTIPLY');
    if (op === 'safeDivide') return t('ui.hope.automationCards.scriptOperatorSafeDivide', {}, 'SAFE DIVIDE');
    return t('ui.hope.automationCards.scriptOperatorAdd', {}, 'ADD');
  }

  describeCondition(condition) {
    const clauses = Array.isArray(condition?.clauses) ? condition.clauses : [];
    if (clauses.length === 0) return t('ui.hope.automationCards.scriptAlways', {}, 'Always');
    return clauses.map((clause, index) => {
      const joinText = clause.join === 'or'
        ? t('ui.hope.automationCards.scriptJoinOr', {}, 'OR')
        : t('ui.hope.automationCards.scriptJoinAnd', {}, 'AND');
      const prefix = index === 0 ? '' : ` ${joinText} `;
      const notText = clause.not ? `${t('ui.hope.automationCards.scriptNotOn', {}, 'NOT')} ` : '';
      return `${prefix}${notText}${this.describeExpression(clause.left)} ${clause.comparator || '>'} ${this.describeExpression(clause.right)}`;
    }).join('');
  }

  describeExpression(expression) {
    const terms = Array.isArray(expression?.terms) ? expression.terms : [];
    if (terms.length === 0) return '0';
    return terms.map((term, index) => {
      const op = index === 0 ? '' : ` ${this.getExpressionOperatorLabel(term.op || 'add')} `;
      return `${op}${this.registry.describeReference(term.ref)}`;
    }).join('');
  }

  describeAction(action) {
    const typeKeys = {
      buildings: 'scriptAutomationTypeBuildings',
      projects: 'scriptAutomationTypeProjects',
      colony: 'scriptAutomationTypeColony',
      research: 'scriptAutomationTypeResearch',
      ship: 'scriptAutomationTypeShip',
      life: 'scriptAutomationTypeLife',
      autoTravel: 'scriptAutomationTypeAutoTravel',
      scripting: 'scriptAutomationTypeScripting'
    };
    const typeFallbacks = {
      buildings: 'Buildings',
      projects: 'Projects',
      colony: 'Colony',
      research: 'Research',
      ship: 'Ship',
      life: 'Life',
      autoTravel: 'Auto Travel',
      scripting: 'Scripting'
    };
    const typeKey = typeKeys[action.automationType];
    const typeLabel = typeKey
      ? t(`ui.hope.automationCards.${typeKey}`, {}, typeFallbacks[action.automationType])
      : action.automationType;
    const modeKeys = {
      on: 'scriptToggleModeOn',
      off: 'scriptToggleModeOff',
      toggle: 'scriptToggleModeToggle'
    };
    const mode = action.toggleValue || 'toggle';
    const modeLabel = t(
      `ui.hope.automationCards.${modeKeys[mode] || modeKeys.toggle}`,
      {},
      mode === 'on' ? 'On' : (mode === 'off' ? 'Off' : 'Toggle')
    );

    if (action.kind === 'sleep') {
      const duration = formatNumber(this.registry.toNumber(action.durationMs), false, 0);
      return t('ui.hope.automationCards.scriptSummarySleep', { duration }, `Sleep ${duration} ms`);
    }
    if (action.kind === 'setVariable') {
      if (action.variableType === 'script') {
        const targetScript = this.scripts.find(item => item.id === Number(action.targetScriptId));
        const value = targetScript
          ? targetScript.name || t('ui.hope.automationCards.scriptWithId', { id: targetScript.id }, `Script ${targetScript.id}`)
          : t('ui.hope.automationCards.scriptNullValue', {}, 'NULL');
        const variable = this.getVariableName('script', action.variableId) || this.normalizeVariableId(action.variableId);
        return t(
          'ui.hope.automationCards.scriptSummarySetScriptVariable',
          { variable, value },
          `Set Script ${variable} = ${value}`
        );
      }
      const variable = this.getVariableName('number', action.variableId) || this.normalizeVariableId(action.variableId);
      const value = this.describeExpression(action.valueExpression);
      return t(
        'ui.hope.automationCards.scriptSummarySetVariable',
        { variable, value },
        `Set ${variable} = ${value}`
      );
    }
    if (action.kind === 'gotoScript') {
      const targetScript = this.scripts.find(item => item.id === Number(this.resolveGotoScriptTargetId(action)));
      if (!targetScript) return `${t('ui.hope.automationCards.scriptGotoScript', {}, 'GOTO Script')} ?`;
      const scriptLabel = targetScript.name || t(
        'ui.hope.automationCards.scriptWithId',
        { id: targetScript.id },
        `Script ${targetScript.id}`
      );
      const target = `${scriptLabel} #1`;
      return t('ui.hope.automationCards.scriptSummaryGoto', { target }, `GOTO ${target}`);
    }
    if (action.kind === 'toggleAutomation') {
      return t(
        'ui.hope.automationCards.scriptSummarySetAutomation',
        { type: typeLabel, mode: modeLabel },
        `Set ${typeLabel} automation ${modeLabel}`
      );
    }
    if (action.kind === 'togglePause') {
      return t(
        'ui.hope.automationCards.scriptSummarySetPause',
        { mode: modeLabel },
        `Set pause ${modeLabel}`
      );
    }
    const target = this.getAutomationTarget(action.automationType);
    if (!target) return t('ui.hope.automationCards.scriptSummaryAction', {}, 'Action');
    if (action.kind === 'applyPreset') {
      const preset = target.getPresetById?.(Number(action.presetId));
      const parameterText = preset && target.isParameterizedPreset && target.isParameterizedPreset(preset)
        ? t(
          'ui.hope.automationCards.scriptSummaryParameter',
          { variable: this.getVariableName('number', action.parameterVariableId) || this.normalizeVariableId(action.parameterVariableId) },
          ` with ${this.getVariableName('number', action.parameterVariableId) || this.normalizeVariableId(action.parameterVariableId)}`
        )
        : '';
      const name = preset?.name || action.presetId;
      return t(
        'ui.hope.automationCards.scriptSummaryApplyPreset',
        { type: typeLabel, name, parameter: parameterText },
        `Apply ${typeLabel} preset ${name}${parameterText}`
      );
    }
    if (action.kind === 'applyCombination') {
      const combo = target.getCombinationById?.(Number(action.combinationId));
      const name = combo?.name || action.combinationId;
      return t(
        'ui.hope.automationCards.scriptSummaryApplyCombination',
        { type: typeLabel, name },
        `Apply ${typeLabel} combination ${name}`
      );
    }
    return t('ui.hope.automationCards.scriptSummaryAction', {}, 'Action');
  }

  getLineLabel(script, line) {
    const index = script.lines.findIndex(item => item.id === line.id) + 1;
    return `#${index}${line.name ? ` ${line.name}` : ''}`;
  }

  getConsoleOutputText() {
    const script = this.getSelectedScript();
    const displayLineId = this.getDisplayLineId();
    const currentLine = script?.lines.find(line => line.id === displayLineId);
    const parts = [this.lastStatus || 'Idle'];
    if (currentLine) parts.push(`Line: ${this.getLineLabel(script, currentLine)}`);
    if (this.lastActionSummary) parts.push(`Last action: ${this.lastActionSummary}`);
    if (this.lastError) parts.push(`Error: ${this.lastError}`);
    else if (this.lastLineOutcomeSummary && this.lastLineOutcomeLineId === displayLineId) {
      parts.push(this.lastLineOutcomeSummary);
    }
    return parts.join(' | ');
  }

  captureConsoleOutput(text) {
    if (!text || text === this.lastConsoleOutput) return false;
    this.consoleOutputHistory.push({
      id: this.nextConsoleOutputId++,
      text
    });
    if (this.consoleOutputHistory.length > 50) this.consoleOutputHistory.shift();
    this.lastConsoleOutput = text;
    return true;
  }

  captureCurrentConsoleOutput() {
    return this.captureConsoleOutput(this.getConsoleOutputText());
  }

  saveState() {
    return {
      enabled: this.enabled,
      running: this.running,
      collapsed: this.collapsed,
      autoRestartOnCompletion: this.autoRestartOnCompletion,
      goToRowOneOnTravel: this.goToRowOneOnTravel,
      nextTravelScriptId: this.nextTravelScriptId,
      nextTravelPersistent: this.nextTravelPersistent,
      sleepRemainingMs: this.sleepRemainingMs,
      variableValues: { ...this.variableValues },
      scriptVariableValues: { ...this.scriptVariableValues },
      variableNames: this.deepClone(this.variableNames),
      scripts: this.deepClone(this.scripts),
      selectedScriptId: this.selectedScriptId,
      activeScriptId: this.activeScriptId,
      pcLineId: this.pcLineId,
      pcActionIndex: this.pcActionIndex,
      manualStepDisplayLineId: this.manualStepDisplayLineId,
      manualStepPendingLineId: this.manualStepPendingLineId,
      nextScriptId: this.nextScriptId,
      nextLineId: this.nextLineId,
      lastStatus: this.lastStatus,
      haltedReason: this.haltedReason
    };
  }

  loadState(data = {}) {
    this.enabled = false;
    this.running = false;
    this.collapsed = data.collapsed === true;
    this.autoRestartOnCompletion = data.autoRestartOnCompletion !== false;
    this.goToRowOneOnTravel = data.goToRowOneOnTravel === true;
    this.nextTravelScriptId = data.nextTravelScriptId ? Number(data.nextTravelScriptId) : null;
    this.nextTravelPersistent = data.nextTravelPersistent === true && !!this.nextTravelScriptId;
    this.sleepRemainingMs = this.registry.toNumber(data.sleepRemainingMs);
    this.variableNames = this.normalizeVariableNames(data.variableNames);
    this.resetVariables();
    if (data.variableValues && data.variableValues.constructor === Object) {
      for (const id in data.variableValues) {
        this.setVariableValue(id, data.variableValues[id]);
      }
    }
    this.scripts = Array.isArray(data.scripts) ? this.normalizeScripts(data.scripts) : [];
    if (data.scriptVariableValues && data.scriptVariableValues.constructor === Object) {
      for (const id in data.scriptVariableValues) {
        this.setScriptVariableValue(id, data.scriptVariableValues[id]);
      }
    }
    this.selectedScriptId = data.selectedScriptId ? Number(data.selectedScriptId) : null;
    this.activeScriptId = data.activeScriptId ? Number(data.activeScriptId) : null;
    this.pcLineId = data.pcLineId ? Number(data.pcLineId) : null;
    this.pcActionIndex = Math.max(0, this.registry.toNumber(data.pcActionIndex));
    this.nextScriptId = data.nextScriptId || this.getNextScriptIdFromScripts();
    this.nextLineId = data.nextLineId || this.getNextLineIdFromScripts();
    this.lastStatus = data.lastStatus || 'Loaded';
    this.consoleOutputHistory = [];
    this.nextConsoleOutputId = 1;
    this.lastConsoleOutput = '';
    this.haltedReason = data.haltedReason || 'loaded';
    this.manualStepPendingLineId = data.manualStepPendingLineId ? Number(data.manualStepPendingLineId) : null;
    this.ensureDefaultScript();
    this.getSelectedScript();
    this.getActiveScript();
    if (!this.scripts.find(script => script.id === this.nextTravelScriptId)) {
      this.nextTravelScriptId = null;
      this.nextTravelPersistent = false;
    }
  }

  normalizeScripts(scripts) {
    return scripts.map(script => {
      const normalizedScript = {
        id: Number(script.id) || this.nextScriptId++,
        name: script.name || 'Script',
        variableNames: this.normalizeVariableNames(script.variableNames),
        lines: Array.isArray(script.lines) && script.lines.length
          ? script.lines.map(line => this.normalizeLine(line))
          : [this.createLine('if')]
      };
      this.normalizeLinkedElseLines(normalizedScript);
      return normalizedScript;
    });
  }

  normalizeLine(line) {
    const normalized = {
      id: Number(line.id) || this.nextLineId++,
      name: line.name || '',
      description: line.description || '',
      kind: ['if', 'elseIf', 'else', 'wait', 'actions'].includes(line.kind) ? line.kind : 'if',
      linkedIfLineId: line.linkedIfLineId ? Number(line.linkedIfLineId) : null,
      enabled: line.enabled !== false,
      expanded: line.expanded !== false,
      condition: line.condition?.constructor === Object ? line.condition : this.createDefaultCondition(),
      actions: Array.isArray(line.actions) ? line.actions.map(action => this.normalizeAction(action)) : []
    };
    const clauses = Array.isArray(normalized.condition?.clauses) ? normalized.condition.clauses : [];
    clauses.forEach(clause => {
      this.normalizeExpressionConstants(clause.left);
      this.normalizeExpressionConstants(clause.right);
    });
    normalized.actions.forEach(action => this.normalizeExpressionConstants(action.valueExpression));
    return normalized;
  }

  normalizeExpressionConstants(expression) {
    const terms = Array.isArray(expression?.terms) ? expression.terms : [];
    terms.forEach(term => {
      const ref = term?.ref;
      if (ref?.source === 'constant' && hasMojibakeMicroSuffix(ref.constant)) {
        ref.constant = formatNumber(this.registry.toNumber(ref.constant), true, 3);
      }
    });
  }

  normalizeAction(action) {
    if (!action || action.constructor !== Object) return { kind: 'applyPreset', automationType: 'buildings', presetId: null };
    const normalized = this.deepClone(action);
    if (normalized.kind === 'setVariable') {
      normalized.variableType = normalized.variableType === 'script' ? 'script' : 'number';
      normalized.variableId = this.normalizeVariableId(normalized.variableId);
      if (normalized.variableType === 'script') {
        normalized.targetScriptId = normalized.targetScriptId ? Number(normalized.targetScriptId) : null;
      } else if (!normalized.valueExpression || normalized.valueExpression.constructor !== Object) {
        normalized.valueExpression = this.createDefaultExpression();
      }
    } else if (normalized.kind === 'gotoScript') {
      normalized.scriptTargetMode = normalized.scriptTargetMode === 'variable' ? 'variable' : 'script';
      normalized.scriptVariableId = this.normalizeVariableId(normalized.scriptVariableId);
      normalized.targetScriptId = normalized.targetScriptId ? Number(normalized.targetScriptId) : null;
    } else if (normalized.kind === 'applyPreset') {
      normalized.parameterVariableId = this.normalizeVariableId(normalized.parameterVariableId);
    }
    return normalized;
  }

  normalizeLinkedElseLines(script) {
    script.lines.forEach(line => {
      if (!['elseIf', 'else'].includes(line.kind)) {
        line.linkedIfLineId = null;
        return;
      }
      if (!line.linkedIfLineId && this.hasAdjacentConditionalPredecessor(script, line)) {
        line.linkedIfLineId = this.getPreviousLine(script, line).id;
      }
      const linkedIf = this.getLinkedIfLine(script, line);
      if (!linkedIf) line.linkedIfLineId = null;
    });
  }

  hasAdjacentConditionalPredecessor(script, line) {
    const previousLine = this.getPreviousLine(script, line);
    return previousLine && ['if', 'elseIf'].includes(previousLine.kind) && !this.getLinkedElseLine(script, previousLine);
  }

  getNextScriptIdFromScripts() {
    let maxId = 0;
    this.scripts.forEach(script => { maxId = Math.max(maxId, script.id); });
    return maxId + 1;
  }

  getNextLineIdFromScripts() {
    let maxId = 0;
    this.scripts.forEach(script => script.lines.forEach(line => { maxId = Math.max(maxId, line.id); }));
    return maxId + 1;
  }

  deepClone(value) {
    if (Array.isArray(value)) return value.map(item => this.deepClone(item));
    if (!value || value.constructor !== Object) return value;
    const clone = {};
    for (const key in value) clone[key] = this.deepClone(value[key]);
    return clone;
  }

  exportScript(scriptId) {
    const script = this.scripts.find(item => item.id === Number(scriptId));
    if (!script) {
      return null;
    }
    return this.deepClone(script);
  }

  importScript(scriptData = {}) {
    const id = this.nextScriptId++;
    const rawScript = {
      id,
      name: scriptData.name || `Script ${id}`,
      variableNames: this.normalizeVariableNames(scriptData.variableNames),
      lines: Array.isArray(scriptData.lines) && scriptData.lines.length
        ? scriptData.lines.map(line => {
            const oldId = line.id;
            const newId = this.nextLineId++;
            return { ...this.deepClone(line), id: newId, _oldId: oldId };
          })
        : [this.createLine('if')]
    };
    const lineIdMap = {};
    rawScript.lines.forEach(line => {
      if (line._oldId) {
        lineIdMap[line._oldId] = line.id;
      }
      delete line._oldId;
    });
    rawScript.lines.forEach(line => {
      line.linkedIfLineId = line.linkedIfLineId ? lineIdMap[line.linkedIfLineId] || null : null;
    });
    const normalizedScript = {
      id: rawScript.id,
      name: rawScript.name,
      variableNames: rawScript.variableNames,
      lines: rawScript.lines.map(line => this.normalizeLine(line))
    };
    this.normalizeLinkedElseLines(normalizedScript);
    this.scripts.push(normalizedScript);
    this.selectedScriptId = normalizedScript.id;
    return normalizedScript.id;
  }
}
