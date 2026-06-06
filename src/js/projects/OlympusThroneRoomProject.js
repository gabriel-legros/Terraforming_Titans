class OlympusThroneRoomProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.selectedBranch = '';
    this.sequenceStep = 0;
    this.ui = null;
  }

  getBranchOptions() {
    return this.attributes.branchOptions || [];
  }

  getSequenceSteps() {
    return this.attributes.sequenceSteps || [];
  }

  isAwaitingBranchChoice() {
    return this.unlocked && !this.isCompleted && this.sequenceStep === 1;
  }

  shouldHideStartBar() {
    return true;
  }

  canStart(resources) {
    return false;
  }

  formatStoryStepText(text) {
    const raw = Array.isArray(text) ? text.join('\n') : String(text || '');
    let output = '';
    let lieOpen = false;
    let buffer = '';

    for (let i = 0; i < raw.length; i += 1) {
      const char = raw[i];
      if (char === '|') {
        output += this.formatStorySegment(buffer, lieOpen);
        buffer = '';
        lieOpen = !lieOpen;
      } else {
        buffer += char;
      }
    }

    output += this.formatStorySegment(buffer, lieOpen);
    return output;
  }

  formatStorySegment(text, isLie) {
    if (!isLie) {
      return text;
    }
    return `<span class="journal-lie-text">${text}</span>`;
  }

  addJournalStoryStep(stepIndex, text) {
    if (!text || this.shownStorySteps.has(stepIndex)) {
      return;
    }
    if (typeof addJournalEntry === 'function') {
      addJournalEntry(this.formatStoryStepText(text), null, { type: 'project', id: this.name, step: stepIndex });
      this.shownStorySteps.add(stepIndex);
    }
  }

  getJournalStepTotal() {
    return this.maxRepeatCount;
  }

  getJournalStepText(stepIndex) {
    const sequenceSteps = this.getSequenceSteps();
    if (stepIndex === 0) {
      return this.formatStoryStepText(sequenceSteps[0]?.text);
    }
    if (stepIndex === 1 && this.selectedBranch) {
      const option = this.getBranchOptions().find(branch => branch.id === this.selectedBranch);
      return this.formatStoryStepText(option?.text);
    }
    if (stepIndex === 2) {
      return this.formatStoryStepText(sequenceSteps[2]?.text);
    }
    return '';
  }

  advanceSequence(stepIndex) {
    if (!this.unlocked || this.isCompleted || this.sequenceStep !== stepIndex) {
      return;
    }
    const sequenceSteps = this.getSequenceSteps();
    const step = sequenceSteps[stepIndex];
    if (!step) {
      return;
    }
    this.repeatCount = Math.max(this.repeatCount || 0, stepIndex + 1);
    this.addJournalStoryStep(stepIndex, step.text);
    this.sequenceStep = stepIndex + 1;
    this.updateUI();
    if (typeof updateProjectUI === 'function') {
      updateProjectUI(this.name);
    }
  }

  chooseBranch(branchId) {
    if (!this.isAwaitingBranchChoice()) {
      return;
    }
    const options = this.getBranchOptions();
    const option = options.find(branch => branch.id === branchId);
    if (!option) {
      return;
    }
    this.selectedBranch = option.id;
    this.addJournalStoryStep(1, option.text);
    this.sequenceStep = 2;
    this.repeatCount = Math.max(this.repeatCount || 0, 2);
    this.updateUI();
    if (typeof updateProjectUI === 'function') {
      updateProjectUI(this.name);
    }
  }

  completeSequence() {
    if (!this.unlocked || this.isCompleted || this.sequenceStep !== 3) {
      return;
    }
    this.repeatCount = Math.max(this.repeatCount || 0, this.maxRepeatCount);
    this.isCompleted = true;
    this.isActive = false;
    this.isPaused = false;
    this.updateUI();
    if (typeof updateProjectUI === 'function') {
      updateProjectUI(this.name);
    }
  }

  complete() {
    this.completeSequence();
  }

  renderUI(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'olympus-throne-room-choices';

    const sequenceSteps = this.getSequenceSteps();
    const enterButton = document.createElement('button');
    enterButton.type = 'button';
    enterButton.className = 'olympus-throne-room-choice';
    enterButton.textContent = sequenceSteps[0]?.label || 'Enter the throne room';
    enterButton.addEventListener('click', () => this.advanceSequence(0));
    wrapper.appendChild(enterButton);

    const options = this.getBranchOptions();
    const branchButtons = {};
    options.forEach(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'olympus-throne-room-choice';
      button.textContent = option.label;
      button.addEventListener('click', () => this.chooseBranch(option.id));
      wrapper.appendChild(button);
      branchButtons[option.id] = button;
    });

    const commandCenterButton = document.createElement('button');
    commandCenterButton.type = 'button';
    commandCenterButton.className = 'olympus-throne-room-choice';
    commandCenterButton.textContent = sequenceSteps[2]?.label || 'Go to the command center';
    commandCenterButton.addEventListener('click', () => this.advanceSequence(2));
    wrapper.appendChild(commandCenterButton);

    const leaveButton = document.createElement('button');
    leaveButton.type = 'button';
    leaveButton.className = 'olympus-throne-room-choice';
    leaveButton.textContent = sequenceSteps[3]?.label || 'Leave the palace';
    leaveButton.addEventListener('click', () => this.completeSequence());
    wrapper.appendChild(leaveButton);

    container.appendChild(wrapper);
    this.ui = { wrapper, enterButton, branchButtons, commandCenterButton, leaveButton };
    this.updateUI();
  }

  updateUI() {
    if (!this.ui) {
      return;
    }
    this.ui.wrapper.style.display = this.unlocked && !this.isCompleted ? 'grid' : 'none';
    this.ui.enterButton.style.display = this.sequenceStep === 0 ? '' : 'none';
    this.ui.enterButton.disabled = this.sequenceStep !== 0;
    const selectedBranch = this.selectedBranch;
    const awaitingChoice = this.isAwaitingBranchChoice();
    for (const branchId in this.ui.branchButtons) {
      const button = this.ui.branchButtons[branchId];
      button.style.display = awaitingChoice ? '' : 'none';
      button.disabled = !awaitingChoice;
      button.classList.toggle('is-selected', selectedBranch === branchId);
    }
    this.ui.commandCenterButton.style.display = this.sequenceStep === 2 ? '' : 'none';
    this.ui.commandCenterButton.disabled = this.sequenceStep !== 2;
    this.ui.leaveButton.style.display = this.sequenceStep === 3 ? '' : 'none';
    this.ui.leaveButton.disabled = this.sequenceStep !== 3;
  }

  getJournalObjectiveSteps() {
    const steps = [];
    if ((this.repeatCount || 0) >= 1) {
      const text = this.getJournalStepText(0);
      if (text) {
        steps.push(text);
      }
    }
    if (this.selectedBranch) {
      const text = this.getJournalStepText(1);
      if (text) {
        steps.push(text);
      }
    }
    if ((this.repeatCount || 0) >= 3) {
      const text = this.getJournalStepText(2);
      if (text) {
        steps.push(text);
      }
    }
    return steps;
  }

  saveState() {
    return {
      ...super.saveState(),
      selectedBranch: this.selectedBranch,
      sequenceStep: this.sequenceStep
    };
  }

  loadState(state) {
    super.loadState(state);
    this.selectedBranch = state.selectedBranch || '';
    this.sequenceStep = state.sequenceStep || Math.min(this.repeatCount || 0, this.maxRepeatCount);
    this.updateUI();
  }
}

if (typeof window !== 'undefined') {
  window.OlympusThroneRoomProject = OlympusThroneRoomProject;
}
