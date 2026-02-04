class SpaceshipAutomation {
  constructor() {
    this.presets = [];
    this.activePresetId = null;
    this.disabledProjects = new Set();
    this.collapsed = false;
    this.nextPresetId = 1;
    this.elapsed = 0;
    this.lockedAssignments = false;
    this.automationShipPool = 0;
    this.automationMassDriverCapacity = 0;
    this.ensureDefaultPreset();
  }

  getMassDriverAutomationId() {
    return 'resourceDisposalMassDrivers';
  }

  getMassDriverDisposalProject() {
    return projectManager.projects.disposeResources;
  }

  getMassDriverAutomationTarget() {
    const disposalProject = this.getMassDriverDisposalProject();
    return {
      name: this.getMassDriverAutomationId(),
      displayName: 'Resource Disposal (mass drivers included)',
      enabled: disposalProject.enabled !== false,
      unlocked: disposalProject.unlocked !== false,
      isVisible: () => disposalProject.isVisible(),
      isPermanentlyDisabled: () => disposalProject.isPermanentlyDisabled(),
      isAutomationManuallyDisabled: () => disposalProject.isAutomationManuallyDisabled(),
      shouldAutomationDisable: () => disposalProject.shouldAutomationDisable(),
      getMaxAssignableShips: () => this.automationShipPool + this.automationMassDriverCapacity
    };
  }

  getMassDriverEquivalency(project) {
    return project.massDriverShipEquivalency || 0;
  }

  getMassDriverCapacity(project) {
    if (!project.isBooleanFlagSet('massDriverEnabled')) {
      return 0;
    }
    const structure = project.getMassDriverStructure();
    return structure.count * this.getMassDriverEquivalency(project);
  }

  getMassDriverActiveEquivalency(project) {
    if (!project.isBooleanFlagSet('massDriverEnabled')) {
      return 0;
    }
    const structure = project.getMassDriverStructure();
    return structure.active * this.getMassDriverEquivalency(project);
  }

  sanitizeShipCount(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.floor(value));
  }

  normalizeProjectAssignment(project) {
    const current = project.getAutomationShipCount ? project.getAutomationShipCount() : project.getActiveShipCount();
    const sanitized = this.sanitizeShipCount(current);
    if (sanitized !== current) {
      const wasContinuous = project.isContinuous();
      project.applySpaceshipDelta(sanitized - current);
      project.finalizeAssignmentChange(wasContinuous);
    }
    return sanitized;
  }

  ensureDefaultPreset() {
    if (this.presets.length > 0) {
      return;
    }
    const preset = {
      id: this.nextPresetId++,
      name: 'Default',
      enabled: false,
      steps: []
    };
    this.presets.push(preset);
    this.activePresetId = preset.id;
  }

  getActivePreset() {
    return this.presets.find(preset => preset.id === this.activePresetId) || null;
  }

  setActivePreset(id) {
    const preset = this.presets.find(item => item.id === id);
    if (!preset) return;
    this.activePresetId = preset.id;
    if (!preset.enabled) {
      preset.enabled = true;
    }
    if (preset.enabled) {
      this.disableAutoAssignForProjects();
    }
  }

  togglePresetEnabled(id, enabled) {
    const preset = this.presets.find(item => item.id === id);
    if (!preset) return;
    preset.enabled = !!enabled;
    if (preset.enabled) {
      this.activePresetId = preset.id;
      this.disableAutoAssignForProjects();
    }
  }

  addPreset(name = '') {
    const preset = {
      id: this.nextPresetId++,
      name: name || `Preset ${this.nextPresetId - 1}`,
      enabled: false,
      steps: []
    };
    this.presets.push(preset);
    this.activePresetId = preset.id;
    return preset.id;
  }

  deletePreset(id) {
    const index = this.presets.findIndex(item => item.id === id);
    if (index === -1) return;
    this.presets.splice(index, 1);
    if (this.activePresetId === id) {
      const next = this.presets[0];
      this.activePresetId = next ? next.id : null;
    }
    this.ensureDefaultPreset();
  }

  renamePreset(id, name) {
    const preset = this.presets.find(item => item.id === id);
    if (!preset) return;
    preset.name = name;
  }

  addStep(presetId) {
    const preset = this.presets.find(item => item.id === presetId);
    if (!preset || preset.steps.length >= 10) return null;
    const step = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      limit: 0,
      entries: [],
      mode: 'fill'
    };
    preset.steps.push(step);
    return step.id;
  }

  removeStep(presetId, stepId) {
    const preset = this.presets.find(item => item.id === presetId);
    if (!preset) return;
    preset.steps = preset.steps.filter(step => step.id !== stepId);
  }

  moveStep(presetId, stepId, direction) {
    const preset = this.presets.find(item => item.id === presetId);
    if (!preset) return;
    const steps = preset.steps;
    const index = steps.findIndex(step => step.id === stepId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= steps.length) {
      return;
    }
    const [step] = steps.splice(index, 1);
    steps.splice(nextIndex, 0, step);
  }

  setStepLimit(presetId, stepId, value) {
    const preset = this.presets.find(item => item.id === presetId);
    if (!preset) return;
    const step = preset.steps.find(item => item.id === stepId);
    if (!step) return;
    if (value === null || value === undefined || value === '') {
      if (step.mode === 'cappedMin' || step.mode === 'cappedMax') {
        step.limit = null;
        return;
      }
      step.limit = 0;
      return;
    }
    const parsed = Math.floor(Number(value));
    if (Number.isFinite(parsed) && parsed >= 0) {
      step.limit = parsed;
    } else {
      step.limit = 0;
    }
  }

  setStepMode(presetId, stepId, mode) {
    const preset = this.presets.find(item => item.id === presetId);
    if (!preset) return;
    const step = preset.steps.find(item => item.id === stepId);
    if (!step) return;
    if (mode === 'cappedMin' || mode === 'cappedMax') {
      step.mode = mode;
      step.limit = null;
      return;
    }
    step.mode = 'fill';
  }

  addEntry(presetId, stepId, projectId) {
    const preset = this.presets.find(item => item.id === presetId);
    if (!preset) return;
    const step = preset.steps.find(item => item.id === stepId);
    if (!step) return;
    if (step.entries.some(entry => entry.projectId === projectId)) return;
    step.entries.push({
      projectId,
      weight: 1,
      max: null,
      maxMode: 'absolute'
    });
  }

  updateEntry(presetId, stepId, projectId, updates = {}) {
    const preset = this.presets.find(item => item.id === presetId);
    if (!preset) return;
    const step = preset.steps.find(item => item.id === stepId);
    if (!step) return;
    const entry = step.entries.find(item => item.projectId === projectId);
    if (!entry) return;
    if (Object.prototype.hasOwnProperty.call(updates, 'weight')) {
      const weight = Number(updates.weight);
      entry.weight = Number.isFinite(weight) && weight > 0 ? weight : 0;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'max')) {
      const max = Number(updates.max);
      entry.max = Number.isFinite(max) && max > 0 ? max : null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'maxMode')) {
      entry.maxMode = updates.maxMode || 'absolute';
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'projectId')) {
      entry.projectId = updates.projectId;
    }
  }

  removeEntry(presetId, stepId, projectId) {
    const preset = this.presets.find(item => item.id === presetId);
    if (!preset) return;
    const step = preset.steps.find(item => item.id === stepId);
    if (!step) return;
    step.entries = step.entries.filter(entry => entry.projectId !== projectId);
  }

  toggleProjectDisabled(projectId, disabled) {
    if (disabled) {
      this.disabledProjects.add(projectId);
    } else {
      this.disabledProjects.delete(projectId);
    }
  }

  setCollapsed(collapsed) {
    this.collapsed = !!collapsed;
  }

  isActive() {
    const preset = this.getActivePreset();
    return automationManager && automationManager.enabled && automationManager.hasFeature('automationShipAssignment') && preset && preset.enabled;
  }

  disableAutoAssignForProjects() {
    const projects = this.getSpaceshipProjects();
    for (let index = 0; index < projects.length; index += 1) {
      const project = projects[index];
      if (project.autoAssignSpaceships) {
        project.autoAssignSpaceships = false;
      }
    }
    SpaceshipProject.refreshAutoAssignDisplays();
  }

  computeEntryMax(entry, project) {
    if (!this.isProjectEnabled(project)) {
      return 0;
    }
    const projectCapValue = typeof project.getMaxAssignableShips === 'function'
      ? project.getMaxAssignableShips()
      : Infinity;
    const projectCap = Number.isFinite(projectCapValue) ? this.sanitizeShipCount(projectCapValue) : Infinity;
    const mode = entry.maxMode || 'absolute';
    let baseMax = entry.max;
    if (mode === 'population') {
      const population = resources.colony?.colonists?.value || 0;
      baseMax = population * (entry.max || 0) / 100;
    } else if (mode === 'workers') {
      const workers = resources.colony?.workers?.cap || 0;
      baseMax = workers * (entry.max || 0) / 100;
    }
    const boundedMax = Number.isFinite(baseMax) && baseMax > 0 ? baseMax : Infinity;
    if (!Number.isFinite(boundedMax)) {
      return projectCap;
    }
    return Math.min(projectCap, Math.max(0, Math.floor(boundedMax)));
  }

  isProjectEnabled(project) {
    if (!project) {
      return false;
    }
    if (project.enabled === false) {
      return false;
    }
    if (project.unlocked === false) {
      return false;
    }
    if (project.isPermanentlyDisabled?.()) {
      return false;
    }
    if (project.isVisible?.() === false) {
      return false;
    }
    return true;
  }

  getSpaceshipProjects() {
    if (!projectManager || !projectManager.projects) return [];
    return Object.values(projectManager.projects).filter(project => project instanceof SpaceshipProject);
  }

  getUnassignedTarget() {
    return {
      name: 'unassignedShips',
      displayName: 'Unassigned Ships',
      enabled: true,
      unlocked: true,
      isVisible: () => true,
      getAutomationDisableAllowed: () => false,
      isAutomationManuallyDisabled: () => false
    };
  }

  getAutomationTargets() {
    const projects = this.getSpaceshipProjects();
    projects.push(this.getMassDriverAutomationTarget());
    projects.push(this.getUnassignedTarget());
    return projects;
  }

  unlockManualControls() {
    if (!this.lockedAssignments) return;
    this.updateManualControls(false);
  }

  updateManualControls(locked) {
    if (typeof projectElements === 'undefined') return;
    this.lockedAssignments = locked;
    const projects = this.getSpaceshipProjects();
    for (let index = 0; index < projects.length; index += 1) {
      const project = projects[index];
      const elements = projectElements[project.name];
      if (!elements) continue;
      if (elements.autoAssignCheckbox) {
        elements.autoAssignCheckbox.disabled = locked;
      }
      if (elements.assignmentButtons) {
        for (let buttonIndex = 0; buttonIndex < elements.assignmentButtons.length; buttonIndex += 1) {
          elements.assignmentButtons[buttonIndex].disabled = locked;
        }
      }
      if (elements.assignmentContainer) {
        elements.assignmentContainer.classList.toggle('automation-locked', locked);
      }
    }
  }

  update(delta) {
    if (!this.isActive()) {
      this.unlockManualControls();
      return;
    }
    this.elapsed += delta;
    if (this.elapsed < 500) {
      return;
    }
    this.elapsed = 0;
    this.applyAssignments();
  }

  applyAssignments() {
    const preset = this.getActivePreset();
    if (preset && preset.enabled) {
      this.disableAutoAssignForProjects();
    }
    if (!preset || preset.steps.length === 0) {
      this.unlockManualControls();
      return;
    }

    const projects = this.getSpaceshipProjects();
    const targets = this.getAutomationTargets();
    if (targets.length === 0) {
      this.unlockManualControls();
      return;
    }

    this.updateManualControls(true);

    const massDriverTargetId = this.getMassDriverAutomationId();
    const massDriverProject = this.getMassDriverDisposalProject();
    const massDriverCapacity = this.getMassDriverCapacity(massDriverProject);
    const massDriverActive = this.getMassDriverActiveEquivalency(massDriverProject);
    let totalShipsOnly = this.sanitizeShipCount(resources.special.spaceships?.value || 0);
    const currentAssignments = {};
    for (let index = 0; index < projects.length; index += 1) {
      const project = projects[index];
      const assigned = this.normalizeProjectAssignment(project);
      currentAssignments[project.name] = assigned;
      totalShipsOnly += assigned;
    }
    this.automationShipPool = totalShipsOnly;
    this.automationMassDriverCapacity = massDriverCapacity;

    let totalShips = totalShipsOnly + massDriverCapacity;
    currentAssignments[massDriverTargetId] = this.sanitizeShipCount(massDriverProject.getAutomationShipCount() + massDriverActive);

    const desiredAssignments = {};
    let remainingTotal = totalShips;
    for (let stepIndex = 0; stepIndex < preset.steps.length; stepIndex += 1) {
      const step = preset.steps[stepIndex];
      if (remainingTotal <= 0) break;
      const entries = step.entries;
      const isCappedMin = step.mode === 'cappedMin';
      const isCappedMax = step.mode === 'cappedMax';
      const limitValue = step.limit === null || step.limit === undefined ? null : this.sanitizeShipCount(step.limit);
      let stepLimit = remainingTotal;
      if (!isCappedMin && !isCappedMax) {
        stepLimit = limitValue === null ? 0 : Math.min(limitValue, remainingTotal);
      }
      if (isCappedMax) {
        let totalWeight = 0;
        for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
          const entry = entries[entryIndex];
          if (entry.weight > 0) {
            totalWeight += entry.weight;
          }
        }
        if (totalWeight > 0) {
          let maxWeightedFactor = 0;
          let hasInfinite = false;
          for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
            const entry = entries[entryIndex];
            if (entry.weight <= 0) continue;
            const project = targets.find(item => item.name === entry.projectId);
            const currentTarget = this.sanitizeShipCount(desiredAssignments[entry.projectId] || 0);
            const maxForEntry = this.computeEntryMax(entry, project);
            if (maxForEntry === Infinity) {
              hasInfinite = true;
              break;
            }
            const remainingCapacity = Math.max(0, maxForEntry - currentTarget);
            const weightedFactor = remainingCapacity / entry.weight;
            if (weightedFactor > maxWeightedFactor) {
              maxWeightedFactor = weightedFactor;
            }
          }
          if (!hasInfinite) {
            const weightedLimit = Math.floor(maxWeightedFactor * totalWeight);
            stepLimit = Math.min(stepLimit, weightedLimit);
          }
        }
      }
      let stepRemaining = stepLimit;
      if (entries.length === 0) continue;

      while (stepRemaining > 0) {
        const weightedEntries = [];
        for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
          const entry = entries[entryIndex];
          const project = targets.find(item => item.name === entry.projectId);
          if (!project) continue;
          const releaseOnDisable = this.disabledProjects.has(entry.projectId);
          const automationAllowed = typeof project.shouldAutomationDisable === 'function' ? !project.shouldAutomationDisable() : true;
          const manuallyDisabled = project.isAutomationManuallyDisabled();
          if (releaseOnDisable && (!automationAllowed || manuallyDisabled)) {
            desiredAssignments[project.name] = 0;
            continue;
          }
          const currentTarget = this.sanitizeShipCount(desiredAssignments[entry.projectId] || 0);
          desiredAssignments[entry.projectId] = currentTarget;
          const maxForEntry = this.computeEntryMax(entry, project);
          const remainingCapacity = Math.max(0, maxForEntry - currentTarget);
          if (entry.weight > 0 && remainingCapacity > 0) {
            weightedEntries.push({
              project,
              entry,
              remainingCapacity
            });
          }
        }

        if (weightedEntries.length === 0) {
          break;
        }

        const totalWeight = weightedEntries.reduce((sum, item) => sum + item.entry.weight, 0);
        if (totalWeight <= 0) {
          break;
        }

        const allocateFill = () => {
          let allocatedInPass = 0;
          for (let wIndex = 0; wIndex < weightedEntries.length; wIndex += 1) {
            const item = weightedEntries[wIndex];
            const share = Math.floor(stepRemaining * (item.entry.weight / totalWeight));
            if (share <= 0) continue;
            const applied = Math.min(share, item.remainingCapacity);
            if (applied > 0) {
              desiredAssignments[item.project.name] = (desiredAssignments[item.project.name] || 0) + applied;
              allocatedInPass += applied;
            }
          }

          let remainder = stepRemaining - allocatedInPass;
          if (remainder > 0) {
            for (let wIndex = 0; wIndex < weightedEntries.length && remainder > 0; wIndex += 1) {
              const item = weightedEntries[wIndex];
              const current = desiredAssignments[item.project.name] || 0;
              const cap = this.computeEntryMax(item.entry, item.project);
              if (current < cap) {
                desiredAssignments[item.project.name] = current + 1;
                allocatedInPass += 1;
                remainder -= 1;
              }
            }
          }
          return allocatedInPass;
        };

        const mode = step.mode || 'fill';
        if (mode === 'cappedMin') {
          const hasFiniteCap = weightedEntries.some(item => Number.isFinite(item.remainingCapacity));
          if (!hasFiniteCap) {
            if (stepRemaining <= 0) {
              stepRemaining = remainingTotal;
            }
            const allocatedInPass = allocateFill();
            if (allocatedInPass === 0) {
              break;
            }
            stepRemaining = Math.max(0, stepRemaining - allocatedInPass);
            remainingTotal = Math.max(0, remainingTotal - allocatedInPass);
            continue;
          }
          const capFactor = weightedEntries.reduce((min, item) => {
            const val = item.remainingCapacity / item.entry.weight;
            return Math.min(min, val);
          }, Infinity);
          const stepFactor = stepRemaining / totalWeight;
          const factor = Math.min(capFactor, stepFactor);
          const allocations = [];
          let allocatedInPass = 0;
          for (let wIndex = 0; wIndex < weightedEntries.length; wIndex += 1) {
            const item = weightedEntries[wIndex];
            const share = Math.floor(item.entry.weight * factor);
            const applied = Math.min(share, item.remainingCapacity);
            if (applied > 0) {
              desiredAssignments[item.project.name] = (desiredAssignments[item.project.name] || 0) + applied;
              allocatedInPass += applied;
            }
            allocations.push({
              item,
              applied,
              fractional: (item.entry.weight * factor) - share
            });
          }
          let remainder = Math.max(0, stepRemaining - allocatedInPass);
          if (remainder > 0) {
            allocations.sort((a, b) => b.fractional - a.fractional);
            for (let allocIndex = 0; allocIndex < allocations.length && remainder > 0; allocIndex += 1) {
              const allocation = allocations[allocIndex];
              if (allocation.applied >= allocation.item.remainingCapacity) continue;
              desiredAssignments[allocation.item.project.name] = (desiredAssignments[allocation.item.project.name] || 0) + 1;
              allocation.applied += 1;
              allocatedInPass += 1;
              remainder -= 1;
            }
          }
          if (allocatedInPass <= 0) {
            break;
          }
          remainingTotal = Math.max(0, remainingTotal - allocatedInPass);
          stepRemaining = Math.max(0, stepRemaining - allocatedInPass);
          break;
        } else {
          const allocatedInPass = allocateFill();

          if (allocatedInPass === 0) {
            break;
          }

          stepRemaining = Math.max(0, stepRemaining - allocatedInPass);
          remainingTotal = Math.max(0, remainingTotal - allocatedInPass);
        }
      }
    }

    const desiredMassDriverTarget = this.sanitizeShipCount(desiredAssignments[massDriverTargetId] || 0);
    const desiredShipOnlyTarget = this.sanitizeShipCount(desiredAssignments[massDriverProject.name] || 0);
    const massDriverEquivalency = this.getMassDriverEquivalency(massDriverProject);
    const maxMassDrivers = massDriverEquivalency > 0
      ? Math.floor(massDriverCapacity / massDriverEquivalency)
      : 0;
    const desiredMassDrivers = Math.min(maxMassDrivers, Math.floor(desiredMassDriverTarget / massDriverEquivalency));
    const desiredMassDriverEquivalency = desiredMassDrivers * massDriverEquivalency;
    desiredAssignments[massDriverProject.name] =
      desiredShipOnlyTarget + Math.max(0, desiredMassDriverTarget - desiredMassDriverEquivalency);

    const shipProjectsTotal = projects.reduce((sum, project) => {
      return sum + this.sanitizeShipCount(desiredAssignments[project.name] || 0);
    }, 0);

    if (shipProjectsTotal > totalShipsOnly) {
      const scale = totalShipsOnly / shipProjectsTotal;
      const allocations = [];
      let scaledTotal = 0;
      for (let index = 0; index < projects.length; index += 1) {
        const project = projects[index];
        const desired = this.sanitizeShipCount(desiredAssignments[project.name] || 0);
        if (desired <= 0) {
          desiredAssignments[project.name] = 0;
          continue;
        }
        const scaled = Math.floor(desired * scale);
        desiredAssignments[project.name] = scaled;
        scaledTotal += scaled;
        allocations.push({
          project,
          fractional: (desired * scale) - scaled
        });
      }
      let remainder = Math.max(0, totalShipsOnly - scaledTotal);
      allocations.sort((a, b) => b.fractional - a.fractional);
      for (let index = 0; index < allocations.length && remainder > 0; index += 1) {
        const allocation = allocations[index];
        desiredAssignments[allocation.project.name] += 1;
        remainder -= 1;
      }
    }

    // First release surplus ships so they become available for other assignments.
    for (let index = 0; index < projects.length; index += 1) {
      const project = projects[index];
      const current = this.sanitizeShipCount(currentAssignments[project.name]);
      const target = this.sanitizeShipCount(desiredAssignments[project.name]);
      const delta = target - current;
      if (delta < 0) {
        const wasContinuous = project.isContinuous();
        project.applySpaceshipDelta(delta);
        project.finalizeAssignmentChange(wasContinuous);
      }
    }
    // Then assign additional ships as needed.
    for (let index = 0; index < projects.length; index += 1) {
      const project = projects[index];
      const current = this.sanitizeShipCount(project.getAutomationShipCount ? project.getAutomationShipCount() : project.getActiveShipCount());
      const target = this.sanitizeShipCount(desiredAssignments[project.name]);
      const rawCap = typeof project.getMaxAssignableShips === 'function'
        ? project.getMaxAssignableShips()
        : Infinity;
      const projectCap = Number.isFinite(rawCap) ? this.sanitizeShipCount(rawCap) : Infinity;
      const boundedTarget = Math.min(target, projectCap);
      const delta = boundedTarget - current;
      if (delta > 0) {
        const wasContinuous = project.isContinuous();
        project.applySpaceshipDelta(delta);
        project.finalizeAssignmentChange(wasContinuous);
      }
    }

    massDriverProject.setMassDriverActive(desiredMassDrivers);
  }

  saveState() {
    return {
      presets: this.presets.map(preset => ({
        ...preset,
      steps: preset.steps.map(step => ({
        ...step,
        entries: step.entries.map(entry => ({ ...entry }))
      }))
    })),
      activePresetId: this.activePresetId,
      disabledProjects: Array.from(this.disabledProjects),
      collapsed: this.collapsed,
      nextPresetId: this.nextPresetId
    };
  }

  loadState(data = {}) {
    this.presets = Array.isArray(data.presets) ? data.presets.map(preset => ({
      id: preset.id,
      name: preset.name || 'Preset',
      enabled: !!preset.enabled,
      steps: Array.isArray(preset.steps) ? preset.steps.map(step => {
        const limitValue = step.limit === null || step.limit === undefined ? null : this.sanitizeShipCount(Number(step.limit));
        let stepMode = step.mode || 'fill';
        if (stepMode !== 'cappedMin' && stepMode !== 'cappedMax' && limitValue === null) {
          stepMode = 'cappedMax';
        }
        return {
          id: step.id,
          limit: (stepMode === 'cappedMin' || stepMode === 'cappedMax') ? null : limitValue,
          mode: stepMode,
          entries: Array.isArray(step.entries) ? step.entries.map(entry => {
            const weight = Number(entry.weight);
            const max = Number(entry.max);
            return {
              projectId: entry.projectId,
              weight: Number.isFinite(weight) && weight > 0 ? weight : 0,
              max: Number.isFinite(max) && max > 0 ? max : null,
              maxMode: entry.maxMode || 'absolute'
            };
          }) : []
        };
      }) : []
    })) : [];
    this.activePresetId = data.activePresetId || null;
    this.disabledProjects = new Set(Array.isArray(data.disabledProjects) ? data.disabledProjects : []);
    this.collapsed = !!data.collapsed;
    this.nextPresetId = data.nextPresetId || this.presets.length + 1;
    this.ensureDefaultPreset();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SpaceshipAutomation };
}
