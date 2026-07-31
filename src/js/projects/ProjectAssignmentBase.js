const PROJECT_ASSIGNMENT_STEP_MAX = 1_000_000_000_000_000_000_000_000_000_000n;
const PROJECT_ASSIGNMENT_WEIGHT_SCALE = 1000000;
const PROJECT_ASSIGNMENT_SUFFIX_EXPONENTS = {
  Dd: 39,
  dd: 39,
  Ud: 36,
  ud: 36,
  De: 33,
  de: 33,
  Dc: 33,
  dc: 33,
  No: 30,
  no: 30,
  Oc: 27,
  oc: 27,
  Sp: 24,
  sp: 24,
  Sx: 21,
  sx: 21,
  Qi: 18,
  qi: 18,
  Q: 15,
  q: 15,
  T: 12,
  t: 12,
  B: 9,
  b: 9,
  M: 6,
  K: 3,
  k: 3,
  m: -3,
  u: -6,
  U: -6,
  n: -9,
  N: -9,
  p: -12,
  P: -12,
  f: -15,
  F: -15
};

function parseExactProjectAssignmentInteger(value) {
  const match = value.match(/^\+?((?:\d+\.?\d*|\d*\.?\d+))(?:e([+-]?\d+))?(Dd|dd|Ud|ud|De|de|Dc|dc|No|no|Oc|oc|Sp|sp|Sx|sx|Qi|qi|Q|q|T|t|B|b|M|K|k|m|u|U|n|N|p|P|f|F)?$/);
  if (!match) {
    return null;
  }
  const decimalParts = match[1].split('.');
  const fraction = decimalParts[1] || '';
  const digits = `${decimalParts[0] || '0'}${fraction}`.replace(/^0+(?=\d)/, '');
  const exponent = Number(match[2] || 0)
    + (PROJECT_ASSIGNMENT_SUFFIX_EXPONENTS[match[3]] || 0)
    - fraction.length;
  if (Math.abs(exponent) > 1000) {
    return null;
  }
  const magnitude = BigInt(digits || '0');
  return exponent >= 0
    ? magnitude * (10n ** BigInt(exponent))
    : magnitude / (10n ** BigInt(-exponent));
}

function normalizeProjectAssignmentInteger(value) {
  if (value === undefined || value === null || value === '') {
    return 0n;
  }
  const valueConstructor = value.constructor;
  if (valueConstructor === BigInt) {
    return value < 0n ? 0n : value;
  }
  if (valueConstructor === String) {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      return BigInt(trimmed);
    }
    const exactInteger = parseExactProjectAssignmentInteger(trimmed);
    if (exactInteger !== null) {
      return exactInteger;
    }
    const parsed = parseFlexibleNumber(trimmed);
    if (Number.isFinite(parsed) && parsed > 0) {
      if (Number.isSafeInteger(parsed)) {
        return BigInt(Math.floor(parsed));
      }
      return BigInt(Math.floor(parsed).toLocaleString('fullwide', {
        useGrouping: false,
        maximumFractionDigits: 0
      }));
    }
  }
  const numeric = Number(value) || 0;
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0n;
  }
  if (Number.isSafeInteger(numeric)) {
    return BigInt(Math.floor(numeric));
  }
  return BigInt(Math.floor(numeric).toLocaleString('fullwide', {
    useGrouping: false,
    maximumFractionDigits: 0
  }));
}

function serializeProjectAssignmentInteger(value) {
  const normalized = normalizeProjectAssignmentInteger(value);
  return normalized <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(normalized)
    : normalized.toString();
}

function serializeProjectAssignments(assignments = {}) {
  const serialized = {};
  Object.keys(assignments).forEach((key) => {
    serialized[key] = serializeProjectAssignmentInteger(assignments[key]);
  });
  return serialized;
}

function createProjectAssignmentBase(BaseClass) {
  return class ProjectAssignmentBase extends BaseClass {
    initializeAssignmentState(options = {}) {
      this.assignmentStateKey = options.assignmentStateKey;
      this.assignmentStepMax = options.assignmentStepMax || PROJECT_ASSIGNMENT_STEP_MAX;
      this[this.assignmentStateKey] = this[this.assignmentStateKey] || {};
      this.assignmentStep = this.assignmentStep || 1n;
      this.autoAssignFlags = this.autoAssignFlags || {};
      this.autoAssignWeights = this.autoAssignWeights || {};
      this.dynamicAssignmentCaps = options.dynamicAssignmentCaps === true;
      this.assignmentsDirty = true;
      this.assignmentsLastSignature = '';
      this.cachedAssignedTotal = 0n;
      this.assignmentNormalizationBatchActive = false;
      this.assignmentNormalizationBatchValidated = false;
      this.assignmentNormalizationBatchTotalCapacity = null;
    }

    getAssignmentMap() {
      return this[this.assignmentStateKey];
    }

    setAssignmentMap(assignments = {}) {
      this[this.assignmentStateKey] = { ...assignments };
      this.markAssignmentsDirty();
    }

    normalizeAssignmentInteger(value) {
      return normalizeProjectAssignmentInteger(value);
    }

    serializeAssignmentInteger(value) {
      return serializeProjectAssignmentInteger(value);
    }

    serializeAssignmentMap(assignments = this.getAssignmentMap()) {
      return serializeProjectAssignments(assignments);
    }

    markAssignmentsDirty() {
      this.assignmentsDirty = true;
      this.assignmentNormalizationBatchValidated = false;
      this.assignmentNormalizationBatchTotalCapacity = null;
    }

    beginAssignmentNormalizationBatch() {
      this.assignmentNormalizationBatchActive = true;
      this.assignmentNormalizationBatchValidated = false;
      this.assignmentNormalizationBatchTotalCapacity = null;
    }

    endAssignmentNormalizationBatch() {
      this.assignmentNormalizationBatchActive = false;
      this.assignmentNormalizationBatchValidated = false;
      this.assignmentNormalizationBatchTotalCapacity = null;
    }

    getAssignmentTotalCapacity() {
      return this.normalizeAssignmentInteger(this.repeatCount);
    }

    getAssignmentTotalCapacityForBatch() {
      if (!this.assignmentNormalizationBatchActive) {
        return this.getAssignmentTotalCapacity();
      }
      if (this.assignmentNormalizationBatchTotalCapacity === null) {
        this.assignmentNormalizationBatchTotalCapacity = this.getAssignmentTotalCapacity();
      }
      return this.assignmentNormalizationBatchTotalCapacity;
    }

    getAssignmentStepMax() {
      return this.assignmentStepMax || PROJECT_ASSIGNMENT_STEP_MAX;
    }

    getUnassignedAssignmentKey() {
      return 'idleUnassigned';
    }

    isUnassignedAssignmentKey(key) {
      return key === this.getUnassignedAssignmentKey();
    }

    getManagedAssignmentKeys() {
      return [this.getUnassignedAssignmentKey()].concat(this.getAssignmentKeys());
    }

    getPersistentAssignmentKeys() {
      return this.getManagedAssignmentKeys();
    }

    getAssignmentCapForKey(key, total = this.getAssignmentTotalCapacityForBatch()) {
      return total;
    }

    getAssignmentNormalizationSignature() {
      const total = this.getAssignmentTotalCapacityForBatch();
      return `${total.toString()}|${this.getManagedAssignmentKeys().join('|')}`;
    }

    getAssignmentCapSignature() {
      const total = this.getAssignmentTotalCapacityForBatch();
      return this.getManagedAssignmentKeys()
        .map((key) => `${key}:${this.getAssignmentCapForKey(key, total).toString()}`)
        .join('|');
    }

    prepareAssignmentsForNormalization() {}

    shouldPreserveAssignmentsDuringNormalization() {
      return globalGameIsLoadingFromSave === true;
    }

    normalizeAssignments() {
      if (
        this.assignmentNormalizationBatchActive
        && this.assignmentNormalizationBatchValidated
        && !this.assignmentsDirty
      ) {
        return;
      }
      const preserveAssignments = this.shouldPreserveAssignmentsDuringNormalization();
      const capSignature = this.dynamicAssignmentCaps ? this.getAssignmentCapSignature() : '';
      const signature = `${this.getAssignmentNormalizationSignature()}|caps:${capSignature}|preserve:${preserveAssignments}`;
      if (!this.assignmentsDirty && this.assignmentsLastSignature === signature) {
        this.assignmentNormalizationBatchValidated = true;
        return;
      }

      this.prepareAssignmentsForNormalization();

      const assignments = this.getAssignmentMap();
      const keys = this.getManagedAssignmentKeys();
      const keySet = new Set(keys);
      const persistentKeys = new Set(this.getPersistentAssignmentKeys());
      const total = this.getAssignmentTotalCapacityForBatch();

      keys.forEach((key) => {
        assignments[key] = this.normalizeAssignmentInteger(assignments[key]);
        this.autoAssignFlags[key] = this.autoAssignFlags[key] === true;
        const weight = Number(this.autoAssignWeights[key]);
        this.autoAssignWeights[key] = Number.isFinite(weight) ? Math.max(0, weight) : 1;
      });

      Object.keys(assignments).forEach((key) => {
        if (!persistentKeys.has(key)) {
          delete assignments[key];
        } else {
          assignments[key] = this.normalizeAssignmentInteger(assignments[key]);
        }
      });

      if (preserveAssignments) {
        this.cachedAssignedTotal = keys.reduce((sum, key) => sum + (assignments[key] || 0n), 0n);
        this.assignmentsLastSignature = signature;
        this.assignmentsDirty = false;
        this.assignmentNormalizationBatchValidated = true;
        return;
      }

      let usedManual = 0n;
      keys.forEach((key) => {
        if (!this.autoAssignFlags[key]) {
          const cap = this.getAssignmentCapForKey(key, total);
          if ((assignments[key] || 0n) > cap) {
            assignments[key] = cap;
          }
          usedManual += assignments[key] || 0n;
        }
      });

      const autoKeys = keys.filter((key) => this.autoAssignFlags[key] === true);
      const remaining = total > usedManual ? (total - usedManual) : 0n;
      if (autoKeys.length > 0) {
        this.distributeAutoAssignments(autoKeys, remaining, total);
      }

      let assignedTotal = keys.reduce((sum, key) => sum + (assignments[key] || 0n), 0n);
      if (assignedTotal > total) {
        let excess = assignedTotal - total;
        for (let i = keys.length - 1; i >= 0 && excess > 0n; i -= 1) {
          const key = keys[i];
          const current = assignments[key] || 0n;
          const reduction = current < excess ? current : excess;
          assignments[key] = current - reduction;
          excess -= reduction;
        }
        assignedTotal = keys.reduce((sum, key) => sum + (assignments[key] || 0n), 0n);
      }

      this.cachedAssignedTotal = assignedTotal;
      this.assignmentsLastSignature = signature;
      this.assignmentsDirty = false;
      this.assignmentNormalizationBatchValidated = true;
    }

    distributeAutoAssignments(autoKeys, remaining, total) {
      const assignments = this.getAssignmentMap();
      autoKeys.forEach((key) => {
        assignments[key] = 0n;
      });

      let unallocated = remaining;
      let eligibleKeys = autoKeys.filter((key) => {
        return this.autoAssignWeights[key] > 0 && this.getAssignmentCapForKey(key, total) > 0n;
      });

      while (unallocated > 0n && eligibleKeys.length > 0) {
        let totalScaledWeight = 0n;
        const scaledWeights = {};
        eligibleKeys.forEach((key) => {
          const scaled = Math.floor(Math.max(0, this.autoAssignWeights[key]) * PROJECT_ASSIGNMENT_WEIGHT_SCALE);
          scaledWeights[key] = scaled > 0 ? BigInt(scaled) : 0n;
          totalScaledWeight += scaledWeights[key];
        });
        if (totalScaledWeight <= 0n) {
          break;
        }

        const remainders = [];
        let assignedThisPass = 0n;
        eligibleKeys.forEach((key) => {
          const current = assignments[key] || 0n;
          const cap = this.getAssignmentCapForKey(key, total);
          const room = cap > current ? (cap - current) : 0n;
          if (room <= 0n) {
            remainders.push({ key, value: 0n });
            return;
          }
          const weightedTotal = unallocated * scaledWeights[key];
          const floorValue = weightedTotal / totalScaledWeight;
          const remainderValue = weightedTotal % totalScaledWeight;
          const addition = floorValue < room ? floorValue : room;
          assignments[key] = current + addition;
          assignedThisPass += addition;
          remainders.push({ key, value: remainderValue });
        });

        unallocated -= assignedThisPass;
        remainders.sort((left, right) => {
          if (left.value === right.value) {
            return 0;
          }
          return left.value > right.value ? -1 : 1;
        });
        for (let i = 0; i < remainders.length && unallocated > 0n; i += 1) {
          const key = remainders[i].key;
          const current = assignments[key] || 0n;
          const cap = this.getAssignmentCapForKey(key, total);
          if (current >= cap) {
            continue;
          }
          assignments[key] = current + 1n;
          unallocated -= 1n;
          assignedThisPass += 1n;
        }

        eligibleKeys = eligibleKeys.filter((key) => {
          return (assignments[key] || 0n) < this.getAssignmentCapForKey(key, total);
        });
        if (assignedThisPass <= 0n) {
          break;
        }
      }
    }

    getAssignedTotal(skipNormalization = false) {
      if (!skipNormalization) {
        this.normalizeAssignments();
      }
      return this.cachedAssignedTotal;
    }

    getAvailableAssignments(skipNormalization = false, assignedTotal = null) {
      const total = this.getAssignmentTotalCapacityForBatch();
      const assigned = assignedTotal === null ? this.getAssignedTotal(skipNormalization) : assignedTotal;
      return total > assigned ? (total - assigned) : 0n;
    }

    getStoredAssignmentAmount(key) {
      return this.getAssignmentMap()[key] || 0n;
    }

    getDisplayedAssignmentAmount(key) {
      return this.getStoredAssignmentAmount(key);
    }

    getAssignmentMaxTarget(key) {
      const keys = this.getManagedAssignmentKeys();
      const total = this.getAssignmentTotalCapacityForBatch();
      const usedOther = keys.reduce((sum, otherKey) => {
        if (otherKey === key || this.autoAssignFlags[otherKey]) {
          return sum;
        }
        return sum + this.getStoredAssignmentAmount(otherKey);
      }, 0n);
      const availableByTotal = total > usedOther ? (total - usedOther) : 0n;
      const cap = this.getAssignmentCapForKey(key, total);
      return cap < availableByTotal ? cap : availableByTotal;
    }

    setAssignmentStep(step) {
      const next = this.normalizeAssignmentInteger(step);
      const max = this.getAssignmentStepMax();
      this.assignmentStep = next < 1n ? 1n : (next > max ? max : next);
    }

    normalizeAssignmentStep() {
      this.setAssignmentStep(this.assignmentStep);
    }

    divideAssignmentStepByTen() {
      this.normalizeAssignmentStep();
      this.setAssignmentStep(this.assignmentStep > 1n ? (this.assignmentStep / 10n) : 1n);
    }

    multiplyAssignmentStepByTen() {
      this.normalizeAssignmentStep();
      this.setAssignmentStep(this.assignmentStep * 10n);
    }

    getAssignmentStep() {
      this.normalizeAssignmentStep();
      return this.assignmentStep;
    }

    getSignedAssignmentDelta(delta) {
      const valueType = Object.prototype.toString.call(delta);
      if (valueType === '[object BigInt]') {
        return delta;
      }
      if (valueType === '[object String]') {
        const trimmed = delta.trim();
        if (!trimmed || trimmed === '-') {
          return 0n;
        }
        const isNegative = trimmed.startsWith('-');
        const digits = isNegative || trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
        if (!/^\d+$/.test(digits)) {
          return 0n;
        }
        const magnitude = BigInt(digits);
        return isNegative ? -magnitude : magnitude;
      }
      const numeric = Number(delta);
      if (!Number.isFinite(numeric) || numeric === 0) {
        return 0n;
      }
      const magnitude = this.normalizeAssignmentInteger(Math.abs(numeric));
      return numeric < 0 ? -magnitude : magnitude;
    }

    afterAssignmentsChanged() {
      this.updateUI();
    }

    setAutoAssignTarget(key, enabled) {
      this.autoAssignFlags[key] = enabled === true;
      this.markAssignmentsDirty();
      this.normalizeAssignments();
      this.afterAssignmentsChanged();
    }

    setAutoAssignWeight(key, value) {
      const numeric = Number(value);
      this.autoAssignWeights[key] = Number.isFinite(numeric) ? Math.max(0, numeric) : 1;
      this.markAssignmentsDirty();
      this.normalizeAssignments();
      this.afterAssignmentsChanged();
    }

    adjustAssignment(key, delta) {
      if (this.autoAssignFlags[key]) {
        return;
      }
      this.normalizeAssignments();
      const signedDelta = this.getSignedAssignmentDelta(delta);
      if (signedDelta === 0n) {
        return;
      }
      const assignments = this.getAssignmentMap();
      const current = this.getStoredAssignmentAmount(key);
      const maxForKey = this.getAssignmentMaxTarget(key);
      let next = current + signedDelta;
      if (next < 0n) {
        next = 0n;
      }
      if (next > maxForKey) {
        next = maxForKey;
      }
      assignments[key] = next;
      this.markAssignmentsDirty();
      this.normalizeAssignments();
      this.afterAssignmentsChanged();
    }

    clearAssignment(key) {
      if (this.autoAssignFlags[key]) {
        return;
      }
      this.getAssignmentMap()[key] = 0n;
      this.markAssignmentsDirty();
      this.normalizeAssignments();
      this.afterAssignmentsChanged();
    }

    maximizeAssignment(key) {
      if (this.autoAssignFlags[key]) {
        return;
      }
      this.normalizeAssignments();
      this.getAssignmentMap()[key] = this.getAssignmentMaxTarget(key);
      this.markAssignmentsDirty();
      this.normalizeAssignments();
      this.afterAssignmentsChanged();
    }

    getPresetAssignmentMap(settings = {}) {
      const assignments = { ...(settings[this.assignmentStateKey] || {}) };
      const autoAssignFlags = settings.autoAssignFlags || {};
      for (const key in autoAssignFlags) {
        if (autoAssignFlags[key] === true) {
          delete assignments[key];
        }
      }
      return assignments;
    }

    saveAssignmentSettings() {
      return {
        [this.assignmentStateKey]: this.serializeAssignmentMap(),
        assignmentStep: this.serializeAssignmentInteger(this.assignmentStep),
        autoAssignFlags: { ...this.autoAssignFlags },
        autoAssignWeights: { ...this.autoAssignWeights }
      };
    }

    loadAssignmentSettings(settings = {}, options = {}) {
      const isPresetApplication = options.isPresetApplication === true;
      const shouldApplyPresetAssignments = !isPresetApplication
        || Object.keys(settings[this.assignmentStateKey] || {}).length > 0;
      const shouldApplyPresetAutoFlags = !isPresetApplication
        || Object.keys(settings.autoAssignFlags || {}).length > 0;
      const shouldApplyPresetAutoWeights = !isPresetApplication
        || Object.keys(settings.autoAssignWeights || {}).length > 0;
      let changed = false;
      if (Object.prototype.hasOwnProperty.call(settings, this.assignmentStateKey) && shouldApplyPresetAssignments) {
        this.setAssignmentMap(isPresetApplication
          ? this.getPresetAssignmentMap(settings)
          : { ...(settings[this.assignmentStateKey] || {}) });
        changed = true;
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'assignmentStep')) {
        this.assignmentStep = settings.assignmentStep || 1;
        changed = true;
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'autoAssignFlags') && shouldApplyPresetAutoFlags) {
        this.autoAssignFlags = { ...(settings.autoAssignFlags || {}) };
        changed = true;
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'autoAssignWeights') && shouldApplyPresetAutoWeights) {
        this.autoAssignWeights = isPresetApplication
          ? { ...this.autoAssignWeights, ...(settings.autoAssignWeights || {}) }
          : { ...(settings.autoAssignWeights || {}) };
        changed = true;
      }
      if (changed) {
        this.markAssignmentsDirty();
        this.normalizeAssignments();
        this.normalizeAssignmentStep();
      }
      return changed;
    }

    createAssignmentStepButtons(textProvider) {
      const stepDownButton = document.createElement('button');
      stepDownButton.textContent = textProvider('divideTen', '/10');
      stepDownButton.addEventListener('click', () => {
        this.divideAssignmentStepByTen();
        this.updateUI();
      });
      const stepUpButton = document.createElement('button');
      stepUpButton.textContent = textProvider('timesTen', 'x10');
      stepUpButton.addEventListener('click', () => {
        this.multiplyAssignmentStepByTen();
        this.updateUI();
      });
      return { stepDownButton, stepUpButton };
    }

    createAssignmentControls(key, options = {}) {
      const rolePrefix = options.rolePrefix || '';
      const assignmentKeyDataset = options.assignmentKeyDataset || '';
      const textProvider = options.textProvider;
      const zeroButton = document.createElement('button');
      zeroButton.textContent = textProvider('zero', '0');
      const minusButton = document.createElement('button');
      const plusButton = document.createElement('button');
      const maxButton = document.createElement('button');
      maxButton.textContent = textProvider('max', 'Max');
      const autoAssignContainer = document.createElement('div');
      autoAssignContainer.classList.add('hephaestus-auto-assign');
      const autoAssign = document.createElement('input');
      autoAssign.type = 'checkbox';
      const autoAssignLabel = document.createElement('span');
      autoAssignLabel.textContent = textProvider('auto', 'Auto');
      const weightInput = document.createElement('input');
      weightInput.type = 'number';
      weightInput.min = '0';
      weightInput.step = '0.1';
      weightInput.value = String(Object.prototype.hasOwnProperty.call(this.autoAssignWeights, key) ? this.autoAssignWeights[key] : 1);
      weightInput.classList.add('hephaestus-weight-input');

      if (rolePrefix) {
        zeroButton.dataset[`${rolePrefix}Role`] = 'zeroButton';
        minusButton.dataset[`${rolePrefix}Role`] = 'minusButton';
        plusButton.dataset[`${rolePrefix}Role`] = 'plusButton';
        maxButton.dataset[`${rolePrefix}Role`] = 'maxButton';
        autoAssign.dataset[`${rolePrefix}Role`] = 'autoAssign';
        weightInput.dataset[`${rolePrefix}Role`] = 'weightInput';
      }
      if (assignmentKeyDataset) {
        zeroButton.dataset[assignmentKeyDataset] = key;
        minusButton.dataset[assignmentKeyDataset] = key;
        plusButton.dataset[assignmentKeyDataset] = key;
        maxButton.dataset[assignmentKeyDataset] = key;
        autoAssign.dataset[assignmentKeyDataset] = key;
        weightInput.dataset[assignmentKeyDataset] = key;
      }

      zeroButton.addEventListener('click', () => this.clearAssignment(key));
      minusButton.addEventListener('click', () => this.adjustAssignment(key, -this.getAssignmentStep()));
      plusButton.addEventListener('click', () => this.adjustAssignment(key, this.getAssignmentStep()));
      maxButton.addEventListener('click', () => this.maximizeAssignment(key));
      autoAssign.addEventListener('change', () => this.setAutoAssignTarget(key, autoAssign.checked));
      autoAssignLabel.addEventListener('click', () => {
        autoAssign.checked = !autoAssign.checked;
        this.setAutoAssignTarget(key, autoAssign.checked);
      });
      weightInput.addEventListener('input', () => this.setAutoAssignWeight(key, weightInput.value));
      autoAssignContainer.append(autoAssign, autoAssignLabel);

      const controls = document.createElement('div');
      controls.classList.add('hephaestus-assignment-controls');
      const controlButtons = document.createElement('div');
      controlButtons.classList.add('hephaestus-control-buttons');
      controlButtons.append(zeroButton, minusButton, plusButton, maxButton, autoAssignContainer);
      controls.append(controlButtons, weightInput);

      return {
        controls,
        controlButtons,
        zeroButton,
        minusButton,
        plusButton,
        maxButton,
        autoAssign,
        weightInput,
        autoAssignContainer
      };
    }

    updateAssignmentControls(row, key, total, step) {
      const storedCurrent = this.getStoredAssignmentAmount(key);
      const maxForKey = this.getAssignmentMaxTarget(key);
      const stepText = formatNumber(step, true, 0);
      const minusText = `-${stepText}`;
      const plusText = `+${stepText}`;
      const autoAssigned = this.autoAssignFlags[key] === true;
      const noCapacity = total <= 0n;
      if (row.minusButton.textContent !== minusText) {
        row.minusButton.textContent = minusText;
      }
      if (row.plusButton.textContent !== plusText) {
        row.plusButton.textContent = plusText;
      }
      if (row.autoAssign.checked !== autoAssigned) {
        row.autoAssign.checked = autoAssigned;
      }
      if (row.autoAssign.disabled !== noCapacity) {
        row.autoAssign.disabled = noCapacity;
      }
      if (document.activeElement !== row.weightInput) {
        const weight = String(Object.prototype.hasOwnProperty.call(this.autoAssignWeights, key) ? this.autoAssignWeights[key] : 1);
        if (row.weightInput.value !== weight) {
          row.weightInput.value = weight;
        }
      }
      if (row.weightInput.disabled !== noCapacity) {
        row.weightInput.disabled = noCapacity;
      }
      const zeroDisabled = storedCurrent <= 0n || autoAssigned;
      const maxDisabled = storedCurrent >= maxForKey || noCapacity || autoAssigned;
      if (row.zeroButton.disabled !== zeroDisabled) {
        row.zeroButton.disabled = zeroDisabled;
      }
      if (row.maxButton.disabled !== maxDisabled) {
        row.maxButton.disabled = maxDisabled;
      }
      if (row.minusButton.disabled !== zeroDisabled) {
        row.minusButton.disabled = zeroDisabled;
      }
      if (row.plusButton.disabled !== maxDisabled) {
        row.plusButton.disabled = maxDisabled;
      }
    }
  };
}

if (typeof window !== 'undefined') {
  window.createProjectAssignmentBase = createProjectAssignmentBase;
  window.normalizeProjectAssignmentInteger = normalizeProjectAssignmentInteger;
  window.serializeProjectAssignmentInteger = serializeProjectAssignmentInteger;
  window.serializeProjectAssignments = serializeProjectAssignments;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createProjectAssignmentBase,
    normalizeProjectAssignmentInteger,
    serializeProjectAssignmentInteger,
    serializeProjectAssignments,
    PROJECT_ASSIGNMENT_STEP_MAX
  };
}
