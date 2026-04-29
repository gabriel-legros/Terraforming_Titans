class ScriptAutomation {
  constructor() {
    this.enabled = false;
    this.running = false;
    this.collapsed = false;
    this.scripts = [];
    this.selectedScriptId = null;
    this.activeScriptId = null;
    this.pcLineId = null;
    this.nextScriptId = 1;
    this.nextLineId = 1;
    this.lastStatus = 'Inactive';
    this.lastError = '';
    this.lastActionSummary = '';
    this.lastEvaluatedLineId = null;
    this.manualStepDisplayLineId = null;
    this.lastConditionResult = null;
    this.haltedReason = 'inactive';
    this.autoRestartOnCompletion = true;
    this.nextTravelScriptId = null;
    this.nextTravelPersistent = false;
    this.sleepRemainingMs = 0;
    this.maxLinesPerTick = 25;
    this.maxActionsPerTick = 25;
    this.registry = new ScriptVariableRegistry();
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
      name: 'Default Script',
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

  addScript(name = '') {
    const line = this.createLine('if');
    const script = {
      id: this.nextScriptId++,
      name: name || `Script ${this.nextScriptId - 1}`,
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
    script.lines.forEach(line => {
      line.id = this.nextLineId++;
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
    }
    if (this.nextTravelScriptId === numericId) {
      this.nextTravelScriptId = null;
      this.nextTravelPersistent = false;
    }
    return true;
  }

  renameScript(id, name) {
    const script = this.scripts.find(item => item.id === Number(id));
    if (!script) return false;
    script.name = name || `Script ${script.id}`;
    return true;
  }

  runScript(id) {
    const script = this.scripts.find(item => item.id === Number(id));
    if (!script) return false;
    this.activeScriptId = script.id;
    if (!this.pcLineId || !script.lines.find(line => line.id === this.pcLineId)) {
      this.pcLineId = script.lines[0]?.id || null;
    }
    this.running = true;
    this.sleepRemainingMs = 0;
    this.manualStepDisplayLineId = null;
    this.lastStatus = 'Running';
    this.haltedReason = 'running';
    return true;
  }

  applyTravelScript() {
    const script = this.scripts.find(item => item.id === Number(this.nextTravelScriptId));
    if (!script) {
      this.nextTravelScriptId = null;
      this.nextTravelPersistent = false;
      return false;
    }
    this.enabled = true;
    this.runScript(script.id);
    this.lastStatus = 'Running (Travel script)';
    if (!this.nextTravelPersistent) {
      this.nextTravelScriptId = null;
    }
    return true;
  }

  pause() {
    this.running = false;
    this.manualStepDisplayLineId = null;
    this.haltedReason = 'paused';
    this.lastStatus = 'Paused';
  }

  reset() {
    const script = this.getActiveScript();
    this.pcLineId = script?.lines[0]?.id || null;
    this.manualStepDisplayLineId = null;
    this.sleepRemainingMs = 0;
    this.haltedReason = 'reset';
    this.lastStatus = 'Ready to Start';
  }

  stepOnce() {
    const wasRunning = this.running;
    const script = this.getActiveScript();
    if (!this.pcLineId && script?.lines.length) this.pcLineId = script.lines[0].id;
    this.running = true;
    this.update(0, true);
    this.manualStepDisplayLineId = this.lastEvaluatedLineId;
    if (wasRunning && this.pcLineId) this.running = true;
    else this.running = false;
  }

  addLine(scriptId, kind = 'if') {
    const script = this.scripts.find(item => item.id === Number(scriptId));
    if (!script) return null;
    const line = this.createLine(kind);
    script.lines.push(line);
    if (!this.pcLineId) this.pcLineId = line.id;
    return line.id;
  }

  removeLine(scriptId, lineId) {
    const script = this.scripts.find(item => item.id === Number(scriptId));
    if (!script || script.lines.length <= 1) return false;
    script.lines = script.lines.filter(line => line.id !== Number(lineId));
    if (this.pcLineId === Number(lineId)) this.pcLineId = script.lines[0]?.id || null;
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
    const maxLines = forceStep ? 1 : this.maxLinesPerTick;

    while (linesEvaluated < maxLines) {
      const line = this.getCurrentLine(script);
      if (!line) {
        if (this.autoRestartOnCompletion) {
          this.pcLineId = script.lines[0]?.id || null;
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
        const actionResult = this.runActions(line.actions, script, { actionsUsed, gotoUsed });
        actionsUsed = actionResult.actionsUsed;
        gotoUsed = actionResult.gotoUsed;
        if (actionResult.gotoTriggered || actionResult.actionLimitReached || actionResult.sleepTriggered) {
          if (actionResult.sleepTriggered) this.advanceLine(script, line);
          this.haltedReason = actionResult.gotoTriggered ? 'goto' : (actionResult.sleepTriggered ? 'sleep' : 'actionLimit');
          this.lastStatus = actionResult.gotoTriggered ? 'GOTO executed' : (actionResult.sleepTriggered ? `Sleeping (${formatNumber(this.sleepRemainingMs, false, 0)} ms)` : 'Action limit reached');
          break;
        }
        this.advanceLine(script, line);
        this.haltedReason = 'actions';
        this.lastStatus = `Ran actions ${this.getLineLabel(script, line)}`;
        break;
      }

      if (line.kind === 'if' || line.kind === 'elseIf' || line.kind === 'else') {
        const branchResult = this.evaluateConditionalLine(script, line);
        this.lastConditionResult = branchResult.conditionResult;
        if (branchResult.executeActions) {
          const actionResult = this.runActions(line.actions, script, { actionsUsed, gotoUsed });
          actionsUsed = actionResult.actionsUsed;
          gotoUsed = actionResult.gotoUsed;
          if (actionResult.gotoTriggered || actionResult.actionLimitReached || actionResult.sleepTriggered) {
            if (actionResult.sleepTriggered) this.advanceLine(script, line);
            this.haltedReason = actionResult.gotoTriggered ? 'goto' : (actionResult.sleepTriggered ? 'sleep' : 'actionLimit');
            this.lastStatus = actionResult.gotoTriggered ? 'GOTO executed' : (actionResult.sleepTriggered ? `Sleeping (${formatNumber(this.sleepRemainingMs, false, 0)} ms)` : 'Action limit reached');
            break;
          }
        }

        this.advanceLine(script, line);
        this.haltedReason = 'advanced';
        this.lastStatus = `Advanced past ${this.getLineLabel(script, line)}`;

        if (branchResult.stopAfterLine) break;
        continue;
      }

      const conditionResult = this.evaluateCondition(line.condition);
      this.lastConditionResult = conditionResult;

      if (line.kind === 'wait' && !conditionResult) {
        this.haltedReason = 'wait';
        this.lastStatus = `Waiting at ${this.getLineLabel(script, line)}`;
        break;
      }

      if (conditionResult) {
        const actionResult = this.runActions(line.actions, script, { actionsUsed, gotoUsed });
        actionsUsed = actionResult.actionsUsed;
        gotoUsed = actionResult.gotoUsed;
        if (actionResult.gotoTriggered || actionResult.actionLimitReached || actionResult.sleepTriggered) {
          if (actionResult.sleepTriggered) this.advanceLine(script, line);
          this.haltedReason = actionResult.gotoTriggered ? 'goto' : (actionResult.sleepTriggered ? 'sleep' : 'actionLimit');
          this.lastStatus = actionResult.gotoTriggered ? 'GOTO executed' : (actionResult.sleepTriggered ? `Sleeping (${formatNumber(this.sleepRemainingMs, false, 0)} ms)` : 'Action limit reached');
          break;
        }
      }
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
      return {
        conditionResult,
        executeActions: conditionResult,
        stopAfterLine: false
      };
    }

    if (line.kind === 'elseIf') {
      const conditionResult = this.evaluateCondition(line.condition);
      if (!this.hasConditionalPredecessor(script, line)) {
        return {
          conditionResult,
          executeActions: conditionResult,
          stopAfterLine: false
        };
      }
      if (this.hasEarlierConditionalMatch(script, line)) {
        return {
          conditionResult: false,
          executeActions: false,
          stopAfterLine: false
        };
      }
      return {
        conditionResult,
        executeActions: conditionResult,
        stopAfterLine: false
      };
    }

    if (!this.hasConditionalPredecessor(script, line)) {
      return {
        conditionResult: true,
        executeActions: true,
        stopAfterLine: true
      };
    }

    const conditionResult = !this.hasEarlierConditionalMatch(script, line);
    return {
      conditionResult,
      executeActions: conditionResult,
      stopAfterLine: false
    };
  }

  hasConditionalPredecessor(script, line) {
    const previousLine = this.getPreviousLine(script, line);
    return previousLine && ['if', 'elseIf'].includes(previousLine.kind);
  }

  hasEarlierConditionalMatch(script, line) {
    const index = this.getLineIndex(script, line.id);
    if (index <= 0) return false;
    for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
      const previousLine = script.lines[previousIndex];
      if (!['if', 'elseIf'].includes(previousLine.kind)) break;
      if (previousLine.enabled === false) continue;
      if (this.evaluateCondition(previousLine.condition)) return true;
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
  }

  runActions(actions, script, state) {
    let actionsUsed = state.actionsUsed || 0;
    let gotoUsed = !!state.gotoUsed;
    let gotoTriggered = false;
    let sleepTriggered = false;
    let actionLimitReached = false;
    const summaries = [];
    const actionList = Array.isArray(actions) ? actions : [];

    for (let index = 0; index < actionList.length; index += 1) {
      if (actionsUsed >= this.maxActionsPerTick) {
        actionLimitReached = true;
        break;
      }
      const action = actionList[index];
      if (action.kind === 'sleep') {
        this.sleepRemainingMs = Math.max(0, this.registry.toNumber(action.durationMs));
        sleepTriggered = this.sleepRemainingMs > 0;
        if (sleepTriggered) summaries.push(`Sleep ${formatNumber(this.sleepRemainingMs, false, 0)} ms`);
        actionsUsed += 1;
        break;
      }
      if (action.kind === 'goto') {
        if (gotoUsed) continue;
        const target = script.lines.find(line => line.id === Number(action.targetLineId));
        if (target) {
          this.pcLineId = target.id;
          gotoUsed = true;
          gotoTriggered = true;
          summaries.push(`GOTO ${this.getLineLabel(script, target)}`);
        }
        actionsUsed += 1;
        break;
      }

      if (this.applyAutomationAction(action)) {
        summaries.push(this.describeAction(action));
      }
      actionsUsed += 1;
    }

    this.lastActionSummary = summaries.join(', ');
    return { actionsUsed, gotoUsed, gotoTriggered, sleepTriggered, actionLimitReached };
  }

  applyAutomationAction(action) {
    if (!action || action.constructor !== Object) return false;
    const target = this.getAutomationTarget(action.automationType);
    if (!target) return false;
    if (action.kind === 'applyPreset' && action.presetId) {
      target.applyPresetOnce(Number(action.presetId));
      return true;
    }
    if (action.kind === 'applyCombination' && action.combinationId && target.applyCombinationPresets) {
      target.applyCombinationPresets(Number(action.combinationId));
      return true;
    }
    return false;
  }

  getAutomationTarget(type) {
    if (type === 'buildings') return automationManager.buildingsAutomation;
    if (type === 'projects') return automationManager.projectsAutomation;
    if (type === 'colony') return automationManager.colonyAutomation;
    if (type === 'research') return automationManager.researchAutomation;
    return null;
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
      else value += next;
    }
    return value;
  }

  describeCondition(condition) {
    const clauses = Array.isArray(condition?.clauses) ? condition.clauses : [];
    if (clauses.length === 0) return 'Always';
    return clauses.map((clause, index) => {
      const prefix = index === 0 ? '' : ` ${String(clause.join || 'and').toUpperCase()} `;
      const notText = clause.not ? 'NOT ' : '';
      return `${prefix}${notText}${this.describeExpression(clause.left)} ${clause.comparator || '>'} ${this.describeExpression(clause.right)}`;
    }).join('');
  }

  describeExpression(expression) {
    const terms = Array.isArray(expression?.terms) ? expression.terms : [];
    if (terms.length === 0) return '0';
    return terms.map((term, index) => {
      const op = index === 0 ? '' : ` ${String(term.op || 'add').toUpperCase()} `;
      return `${op}${this.registry.describeReference(term.ref)}`;
    }).join('');
  }

  describeAction(action) {
    if (action.kind === 'sleep') return `Sleep ${formatNumber(this.registry.toNumber(action.durationMs), false, 0)} ms`;
    const target = this.getAutomationTarget(action.automationType);
    if (!target) return 'Action';
    if (action.kind === 'applyPreset') {
      const preset = target.getPresetById?.(Number(action.presetId));
      return `Apply ${action.automationType} preset ${preset?.name || action.presetId}`;
    }
    if (action.kind === 'applyCombination') {
      const combo = target.getCombinationById?.(Number(action.combinationId));
      return `Apply ${action.automationType} combination ${combo?.name || action.combinationId}`;
    }
    return 'Action';
  }

  getLineLabel(script, line) {
    const index = script.lines.findIndex(item => item.id === line.id) + 1;
    return `#${index}${line.name ? ` ${line.name}` : ''}`;
  }

  saveState() {
    return {
      enabled: this.enabled,
      running: this.running,
      collapsed: this.collapsed,
      autoRestartOnCompletion: this.autoRestartOnCompletion,
      nextTravelScriptId: this.nextTravelScriptId,
      nextTravelPersistent: this.nextTravelPersistent,
      sleepRemainingMs: this.sleepRemainingMs,
      scripts: this.deepClone(this.scripts),
      selectedScriptId: this.selectedScriptId,
      activeScriptId: this.activeScriptId,
      pcLineId: this.pcLineId,
      manualStepDisplayLineId: this.manualStepDisplayLineId,
      nextScriptId: this.nextScriptId,
      nextLineId: this.nextLineId,
      lastStatus: this.lastStatus,
      haltedReason: this.haltedReason
    };
  }

  loadState(data = {}) {
    this.enabled = data.enabled === true;
    this.running = data.running === true && this.enabled;
    this.collapsed = data.collapsed === true;
    this.autoRestartOnCompletion = data.autoRestartOnCompletion !== false;
    this.nextTravelScriptId = data.nextTravelScriptId ? Number(data.nextTravelScriptId) : null;
    this.nextTravelPersistent = data.nextTravelPersistent === true && !!this.nextTravelScriptId;
    this.sleepRemainingMs = this.registry.toNumber(data.sleepRemainingMs);
    this.scripts = Array.isArray(data.scripts) ? this.normalizeScripts(data.scripts) : [];
    this.selectedScriptId = data.selectedScriptId ? Number(data.selectedScriptId) : null;
    this.activeScriptId = data.activeScriptId ? Number(data.activeScriptId) : null;
    this.pcLineId = data.pcLineId ? Number(data.pcLineId) : null;
    this.nextScriptId = data.nextScriptId || this.getNextScriptIdFromScripts();
    this.nextLineId = data.nextLineId || this.getNextLineIdFromScripts();
    this.lastStatus = data.lastStatus || 'Loaded';
    this.haltedReason = data.haltedReason || 'loaded';
    this.ensureDefaultScript();
    this.getSelectedScript();
    this.getActiveScript();
    if (!this.scripts.find(script => script.id === this.nextTravelScriptId)) {
      this.nextTravelScriptId = null;
      this.nextTravelPersistent = false;
    }
  }

  normalizeScripts(scripts) {
    return scripts.map(script => ({
      id: Number(script.id) || this.nextScriptId++,
      name: script.name || 'Script',
      lines: Array.isArray(script.lines) && script.lines.length
        ? script.lines.map(line => this.normalizeLine(line))
        : [this.createLine('if')]
    }));
  }

  normalizeLine(line) {
    return {
      id: Number(line.id) || this.nextLineId++,
      name: line.name || '',
      description: line.description || '',
      kind: ['if', 'elseIf', 'else', 'wait', 'actions'].includes(line.kind) ? line.kind : 'if',
      enabled: line.enabled !== false,
      expanded: line.expanded !== false,
      condition: line.condition?.constructor === Object ? line.condition : this.createDefaultCondition(),
      actions: Array.isArray(line.actions) ? line.actions : []
    };
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
}
