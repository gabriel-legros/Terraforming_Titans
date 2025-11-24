class SpaceshipAutomation {
  constructor() {
    this.presets = [];
    this.activePresetId = null;
    this.disabledProjects = new Set();
    this.collapsed = false;
    this.nextPresetId = 1;
    this.elapsed = 0;
    this.lockedAssignments = false;
    this.ensureDefaultPreset();
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
      limit: null,
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

  setStepLimit(presetId, stepId, value) {
    const preset = this.presets.find(item => item.id === presetId);
    if (!preset) return;
    const step = preset.steps.find(item => item.id === stepId);
    if (!step) return;
    const isLast = preset.steps[preset.steps.length - 1] === step;
    if (value === null || value === undefined || value === '') {
      step.limit = isLast ? null : 0;
      return;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      step.limit = parsed;
    } else {
      step.limit = isLast ? null : 0;
    }
  }

  setStepMode(presetId, stepId, mode) {
    const preset = this.presets.find(item => item.id === presetId);
    if (!preset) return;
    const step = preset.steps.find(item => item.id === stepId);
    if (!step) return;
    if (mode === 'cappedMin') {
      step.mode = 'cappedMin';
      step.limit = null;
    } else {
      step.mode = 'fill';
    }
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
      max: null
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

  getSpaceshipProjects() {
    if (!projectManager || !projectManager.projects) return [];
    return Object.values(projectManager.projects).filter(project => project instanceof SpaceshipProject);
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
    if (projects.length === 0) {
      this.unlockManualControls();
      return;
    }

    this.updateManualControls(true);

    let totalShips = Math.floor(resources.special.spaceships?.value || 0);
    const currentAssignments = {};
    for (let index = 0; index < projects.length; index += 1) {
      const project = projects[index];
      const assigned = project.getActiveShipCount();
      currentAssignments[project.name] = assigned;
      totalShips += assigned;
    }

    const desiredAssignments = {};
    let remainingTotal = totalShips;
    for (let stepIndex = 0; stepIndex < preset.steps.length; stepIndex += 1) {
      const step = preset.steps[stepIndex];
      if (remainingTotal <= 0) break;
      const isCappedStep = step.mode === 'cappedMin';
      const stepLimit = isCappedStep ? remainingTotal : (step.limit === null ? remainingTotal : Math.min(step.limit, remainingTotal));
      let stepRemaining = stepLimit;
      const entries = step.entries;
      if (entries.length === 0) continue;

      while (stepRemaining > 0) {
        const weightedEntries = [];
        for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
          const entry = entries[entryIndex];
          const project = projects.find(item => item.name === entry.projectId);
          if (!project) continue;
          const releaseOnDisable = this.disabledProjects.has(entry.projectId);
          const automationAllowed = typeof project.shouldAutomationDisable === 'function' ? !project.shouldAutomationDisable() : true;
          const manuallyDisabled = project.autoStart === false || project.run === false;
          if (releaseOnDisable && (!automationAllowed || manuallyDisabled)) {
            desiredAssignments[project.name] = 0;
            continue;
          }
          const currentTarget = desiredAssignments[entry.projectId] || 0;
          const projectCap = typeof project.getMaxAssignableShips === 'function'
            ? project.getMaxAssignableShips()
            : Infinity;
          const maxForEntry = Math.min(projectCap, entry.max === null ? Infinity : entry.max);
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
              const projectCap = typeof item.project.getMaxAssignableShips === 'function'
                ? item.project.getMaxAssignableShips()
                : Infinity;
              const cap = Math.min(projectCap, item.entry.max === null ? Infinity : item.entry.max);
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

    // First release surplus ships so they become available for other assignments.
    for (let index = 0; index < projects.length; index += 1) {
      const project = projects[index];
      const current = currentAssignments[project.name] || 0;
      const target = desiredAssignments[project.name] || 0;
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
      const current = project.getActiveShipCount();
      const target = desiredAssignments[project.name] || 0;
      const projectCap = typeof project.getMaxAssignableShips === 'function'
        ? project.getMaxAssignableShips()
        : Infinity;
      const boundedTarget = Math.min(target, projectCap);
      const delta = boundedTarget - current;
      if (delta > 0) {
        const wasContinuous = project.isContinuous();
        project.applySpaceshipDelta(delta);
        project.finalizeAssignmentChange(wasContinuous);
      }
    }
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
      steps: Array.isArray(preset.steps) ? preset.steps.map(step => ({
        id: step.id,
        limit: step.limit === null || step.limit === undefined ? null : step.limit,
        mode: step.mode || 'fill',
        entries: Array.isArray(step.entries) ? step.entries.map(entry => ({
          projectId: entry.projectId,
          weight: entry.weight,
          max: Number.isFinite(entry.max) && entry.max > 0 ? entry.max : null
        })) : []
      })) : []
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
