const GalaxyOperationUI = (() => {
    const operationsAllocations = new Map();
    const operationsStepSizes = new Map();
    const operationsAutoStates = new Map();
    let cachedAutoLaunchThreshold = DEFAULT_OPERATION_AUTO_THRESHOLD;
    let context = { manager: null, cache: null };

    function getManager() {
        return context.manager || globalThis.galaxyManager || null;
    }

    function getCache() {
        return context.cache || null;
    }

    function setContext({ manager, cache }) {
        if (manager) {
            context.manager = manager;
        }
        if (cache) {
            context.cache = cache;
        }
    }

    function getNumberFormatter() {
        if (typeof formatNumber === 'function') {
            return formatNumber;
        }
        return (value) => {
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) {
                return '0';
            }
            return Math.round(numeric * 100) / 100;
        };
    }

    function getDefaultOperationDurationMs() {
        const provided = globalThis?.GALAXY_OPERATION_DURATION_MS;
        if (Number.isFinite(provided) && provided > 0) {
            return provided;
        }
        return 5 * 60 * 1000;
    }

    function formatOperationDurationDisplay(milliseconds) {
        if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
            return '0s';
        }
        const seconds = Math.floor(milliseconds / 1000);
        const formatted = globalThis?.formatDuration?.(seconds);
        if (formatted) {
            return formatted;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours}h ${remainingMinutes}m`;
        }
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${seconds}s`;
    }

    function formatAutoThresholdDisplay(value) {
        if (!Number.isFinite(value) || value <= 0) {
            return DEFAULT_OPERATION_AUTO_THRESHOLD.toFixed(2);
        }
        const rounded = Math.round(value * 100) / 100;
        return rounded.toFixed(2);
    }

    function getStoredAllocation(key) {
        if (!key || !operationsAllocations.has(key)) {
            return 0;
        }
        const value = operationsAllocations.get(key);
        return Number.isFinite(value) ? value : 0;
    }

    function setStoredAllocation(key, value) {
        if (!key) {
            return;
        }
        if (!Number.isFinite(value) || value <= 0) {
            operationsAllocations.delete(key);
            return;
        }
        operationsAllocations.set(key, value);
    }

    function getStoredStep(key) {
        if (!key) {
            return 1;
        }
        if (operationsStepSizes.has(key)) {
            const cached = operationsStepSizes.get(key);
            if (Number.isFinite(cached) && cached > 0) {
                return cached;
            }
        }
        const manager = getManager();
        if (manager?.getOperationStep) {
            const fetched = manager.getOperationStep(key);
            const sanitized = Number.isFinite(fetched) && fetched > 0 ? Math.max(1, Math.floor(fetched)) : 1;
            operationsStepSizes.set(key, sanitized);
            return sanitized;
        }
        return 1;
    }

    function setStoredStep(key, value) {
        if (!key) {
            return;
        }
        const numeric = Number(value);
        const manager = getManager();
        if (!Number.isFinite(numeric) || numeric <= 0) {
            operationsStepSizes.delete(key);
            if (manager?.setOperationStep) {
                manager.setOperationStep({ sectorKey: key, value: 1 });
            }
            return;
        }
        const sanitized = Math.max(1, Math.floor(numeric));
        operationsStepSizes.set(key, sanitized);
        if (manager?.setOperationStep) {
            manager.setOperationStep({ sectorKey: key, value: sanitized });
        }
    }

    function getOperationAutoState(key) {
        if (!key) {
            return false;
        }
        const normalizedKey = String(key).trim();
        if (normalizedKey === '') {
            return false;
        }
        const manager = getManager();
        if (manager && typeof manager.getOperationAutoEnabled === 'function') {
            const result = manager.getOperationAutoEnabled(normalizedKey);
            const enabled = !!result;
            if (enabled) {
                operationsAutoStates.set(normalizedKey, true);
            } else {
                operationsAutoStates.delete(normalizedKey);
            }
            return enabled;
        }
        return operationsAutoStates.get(normalizedKey) === true;
    }

    function setOperationAutoState(key, value) {
        if (!key) {
            return false;
        }
        const normalizedKey = String(key).trim();
        if (normalizedKey === '') {
            return false;
        }
        const enabled = value === true;
        let applied = enabled;
        const manager = getManager();
        if (manager && typeof manager.setOperationAutoEnabled === 'function') {
            applied = manager.setOperationAutoEnabled({ sectorKey: normalizedKey, value: enabled });
        }
        if (applied) {
            operationsAutoStates.set(normalizedKey, true);
        } else {
            operationsAutoStates.delete(normalizedKey);
        }
        return applied;
    }

    function getAutoLaunchThreshold() {
        const manager = getManager();
        if (manager && typeof manager.getOperationAutoThreshold === 'function') {
            const stored = manager.getOperationAutoThreshold();
            if (Number.isFinite(stored) && stored > 0) {
                cachedAutoLaunchThreshold = stored;
                return stored;
            }
        }
        return cachedAutoLaunchThreshold;
    }

    function setAutoLaunchThreshold(value) {
        const manager = getManager();
        if (manager && typeof manager.setOperationAutoThreshold === 'function') {
            cachedAutoLaunchThreshold = manager.setOperationAutoThreshold(value);
        } else {
            const numeric = Number(value);
            cachedAutoLaunchThreshold = Number.isFinite(numeric) && numeric > 0
                ? numeric
                : DEFAULT_OPERATION_AUTO_THRESHOLD;
        }
        return cachedAutoLaunchThreshold;
    }

    function updateOperationsStepDisplay(step, formatter) {
        const cache = getCache();
        if (!cache || !cache.operationsButtons) {
            return;
        }
        const display = formatter(step, false, 2);
        const button = cache.operationsButtons.multiply;
        if (button) {
            button.textContent = `x10 (${display})`;
        }
    }

    function clampAssignment(value, maxAssignable) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return 0;
        }
        const maxValue = Number(maxAssignable);
        if (!Number.isFinite(maxValue) || maxValue <= 0) {
            return 0;
        }
        return Math.max(0, Math.min(numeric, maxValue));
    }

    function resolveOperationSuccessChance(manager, sectorKey, assignedPower) {
        if (!manager?.getOperationSuccessChance) {
            return 0;
        }
        const chance = manager.getOperationSuccessChance({
            sectorKey,
            factionId: (typeof globalThis !== 'undefined' && typeof globalThis.UHF_FACTION_ID === 'string')
                ? globalThis.UHF_FACTION_ID
                : 'uhf',
            assignedPower
        });
        if (!Number.isFinite(chance)) {
            return 0;
        }
        return Math.max(0, Math.min(1, chance));
    }

    function handleOperationsInputChange(event) {
        const cache = getCache();
        if (!cache) {
            return;
        }
        const manager = getManager();
        const key = cache.selectedSector?.key || null;
        if (!key) {
            return;
        }
        const value = Number(event.target.value);
        if (!Number.isFinite(value)) {
            setStoredAllocation(key, 0);
        } else {
            setStoredAllocation(key, Math.max(0, value));
        }
        updateOperationsPanel(manager, cache);
    }

    function adjustAllocationByAction(action) {
        const cache = getCache();
        const manager = getManager();
        const key = cache?.selectedSector?.key;
        if (!manager || !manager.enabled || !key || !cache || !cache.selectedSector) {
            return;
        }
        const faction = manager.getFaction((typeof globalThis !== 'undefined' && typeof globalThis.UHF_FACTION_ID === 'string')
            ? globalThis.UHF_FACTION_ID
            : 'uhf');
        const availablePower = faction ? Math.max(0, faction.fleetPower) : 0;
        let current = getStoredAllocation(key);
        let step = getStoredStep(key);
        let shouldUpdateAllocation = true;
        switch (action) {
        case 'zero':
            current = 0;
            break;
        case 'decrement':
            current = Math.max(0, current - step);
            break;
        case 'increment':
            current += step;
            break;
        case 'max':
            current = availablePower;
            break;
        case 'divide':
            if (step > 1) {
                const reduced = step / 10;
                step = reduced >= 1 ? Math.floor(reduced) : 1;
            } else {
                step = 1;
            }
            setStoredStep(key, step);
            shouldUpdateAllocation = false;
            break;
        case 'multiply':
            step *= 10;
            setStoredStep(key, step);
            shouldUpdateAllocation = false;
            break;
        default:
            break;
        }
        if (shouldUpdateAllocation) {
            const clamped = clampAssignment(current, availablePower);
            setStoredAllocation(key, clamped);
        }
        updateOperationsPanel(manager, cache);
    }

    function handleOperationsButtonClick(event) {
        const action = event.currentTarget && event.currentTarget.dataset
            ? event.currentTarget.dataset.action
            : '';
        if (!action) {
            return;
        }
        adjustAllocationByAction(action);
    }

    function handleAutoCheckboxChange(event) {
        const checkbox = event?.target;
        const cache = getCache();
        if (!checkbox || !cache) {
            return;
        }
        const key = cache.selectedSector?.key || null;
        if (!key) {
            checkbox.checked = false;
            updateOperationsPanel();
            return;
        }
        const applied = setOperationAutoState(key, checkbox.checked === true);
        checkbox.checked = applied;
        updateOperationsPanel();
    }

    function handleAutoThresholdChange(event) {
        const input = event?.target;
        if (!input) {
            return;
        }
        const rawValue = input.value;
        if (event.type === 'input' && rawValue.trim() === '') {
            return;
        }
        const numeric = Number(rawValue);
        const sanitized = Number.isFinite(numeric) && numeric > 0 ? numeric : DEFAULT_OPERATION_AUTO_THRESHOLD;
        const applied = setAutoLaunchThreshold(sanitized);
        input.value = formatAutoThresholdDisplay(applied);
        updateOperationsPanel();
    }

    function handleOperationsLaunch() {
        const cache = getCache();
        const manager = getManager();
        if (!manager || !manager.enabled || !cache || !cache.selectedSector) {
            return;
        }
        const selection = cache.selectedSector;
        const sectorKey = selection.key;
        const sector = manager.getSector(selection.q, selection.r);
        if (!sectorKey || !sector) {
            return;
        }
        const faction = manager.getFaction((typeof globalThis !== 'undefined' && typeof globalThis.UHF_FACTION_ID === 'string')
            ? globalThis.UHF_FACTION_ID
            : 'uhf');
        if (!faction) {
            return;
        }
        const availablePower = Math.max(0, faction.fleetPower);
        const stored = getStoredAllocation(sectorKey);
        const assignment = clampAssignment(stored, availablePower);
        if (!(assignment > 0)) {
            return;
        }
        const antimatterResource = resources && resources.special ? resources.special.antimatter : null;
        const antimatterValue = antimatterResource ? Number(antimatterResource.value) : 0;
        const cost = assignment * 1000;
        if (!antimatterResource || antimatterValue < cost) {
            return;
        }
        const successChance = resolveOperationSuccessChance(manager, sectorKey, assignment);
        const operation = manager.startOperation({
            sectorKey,
            factionId: (typeof globalThis !== 'undefined' && typeof globalThis.UHF_FACTION_ID === 'string')
                ? globalThis.UHF_FACTION_ID
                : 'uhf',
            assignedPower: assignment,
            successChance,
            durationMs: getDefaultOperationDurationMs()
        });
        if (!operation) {
            return;
        }
        if (antimatterResource) {
            antimatterResource.value = Math.max(0, antimatterValue - cost);
        }
        operation.launchCost = cost;
        setStoredAllocation(sectorKey, assignment);
        updateOperationsPanel(manager, cache);
    }

    function populateSection({ doc, container, createInfoTooltip }) {
        const panel = doc.createElement('div');
        panel.className = 'galaxy-operations-panel';

        const empty = doc.createElement('div');
        empty.className = 'galaxy-operations-panel__empty';
        empty.textContent = 'Select a contested sector to assign fleet power.';
        panel.appendChild(empty);

        const form = doc.createElement('div');
        form.className = 'galaxy-operations-form is-hidden';
        panel.appendChild(form);

        const formHeader = doc.createElement('div');
        formHeader.className = 'galaxy-operations-form__header';
        form.appendChild(formHeader);

        const powerLabel = doc.createElement('span');
        powerLabel.className = 'galaxy-operations-form__label galaxy-operations-form__label--with-icon';
        powerLabel.textContent = 'Fleet Power';
        if (typeof createInfoTooltip === 'function') {
            powerLabel.appendChild(createInfoTooltip(
                doc,
                'Fleet power may be assigned to conduct operations on the map, in an attempt to gain sector control.  You may only perform operations on a sector that you either contest, or is neighbour to a sector you fully control.  The more fleet power assigned, the higher your chances of success, and the lower your losses, but your fleet will be busy in the meantime.'
            ));
        }
        formHeader.appendChild(powerLabel);

        const powerAvailable = doc.createElement('span');
        powerAvailable.className = 'galaxy-operations-form__available';
        powerAvailable.textContent = 'Available: 0';
        formHeader.appendChild(powerAvailable);

        const powerRow = doc.createElement('div');
        powerRow.className = 'galaxy-operations-form__row';
        form.appendChild(powerRow);

        const powerInput = doc.createElement('input');
        powerInput.type = 'number';
        powerInput.min = '0';
        powerInput.step = '1';
        powerInput.className = 'galaxy-operations-form__input';
        powerRow.appendChild(powerInput);

        const buttonGroup = doc.createElement('div');
        buttonGroup.className = 'galaxy-operations-form__buttons';
        powerRow.appendChild(buttonGroup);

        const operationsButtons = {};
        [
            { key: 'zero', label: '0' },
            { key: 'decrement', label: '-1' },
            { key: 'increment', label: '+1' },
            { key: 'max', label: 'Max' },
            { key: 'divide', label: '/10' },
            { key: 'multiply', label: 'x10' }
        ].forEach(({ key, label }) => {
            const button = doc.createElement('button');
            button.type = 'button';
            button.className = 'galaxy-operations-form__button';
            button.textContent = label;
            button.dataset.action = key;
            button.addEventListener('click', handleOperationsButtonClick);
            buttonGroup.appendChild(button);
            operationsButtons[key] = button;
        });

        const launchContainer = doc.createElement('div');
        launchContainer.className = 'galaxy-operations-launch';
        form.appendChild(launchContainer);

        const launchControls = doc.createElement('div');
        launchControls.className = 'galaxy-operations-launch__controls';
        launchContainer.appendChild(launchControls);

        const autoLaunchLabel = doc.createElement('label');
        autoLaunchLabel.className = 'galaxy-operations-launch__auto';

        const autoLaunchCheckbox = doc.createElement('input');
        autoLaunchCheckbox.type = 'checkbox';
        autoLaunchCheckbox.className = 'galaxy-operations-launch__auto-checkbox';
        autoLaunchCheckbox.addEventListener('change', handleAutoCheckboxChange);
        autoLaunchLabel.appendChild(autoLaunchCheckbox);

        const autoLaunchText = doc.createElement('span');
        autoLaunchText.className = 'galaxy-operations-launch__auto-label';
        autoLaunchText.textContent = 'Auto';
        autoLaunchLabel.appendChild(autoLaunchText);

        const autoLaunchThresholdPrefix = doc.createElement('span');
        autoLaunchThresholdPrefix.className = 'galaxy-operations-launch__auto-prefix';
        autoLaunchThresholdPrefix.textContent = ' with ';
        autoLaunchLabel.appendChild(autoLaunchThresholdPrefix);

        const autoLaunchThresholdInput = doc.createElement('input');
        autoLaunchThresholdInput.type = 'number';
        autoLaunchThresholdInput.step = '0.01';
        autoLaunchThresholdInput.min = '0';
        autoLaunchThresholdInput.className = 'galaxy-operations-launch__auto-threshold';
        autoLaunchThresholdInput.addEventListener('change', handleAutoThresholdChange);
        autoLaunchThresholdInput.addEventListener('blur', handleAutoThresholdChange);
        autoLaunchThresholdInput.addEventListener('input', handleAutoThresholdChange);
        autoLaunchLabel.appendChild(autoLaunchThresholdInput);

        const autoLaunchThresholdSuffix = doc.createElement('span');
        autoLaunchThresholdSuffix.className = 'galaxy-operations-launch__auto-suffix';
        autoLaunchThresholdSuffix.textContent = ' success chance';
        autoLaunchLabel.appendChild(autoLaunchThresholdSuffix);

        launchControls.appendChild(autoLaunchLabel);

        const launchButton = doc.createElement('button');
        launchButton.type = 'button';
        launchButton.className = 'galaxy-operations-launch__button';
        launchButton.textContent = 'Launch Operation';
        launchButton.addEventListener('click', handleOperationsLaunch);
        launchContainer.appendChild(launchButton);

        const costRow = doc.createElement('div');
        costRow.className = 'galaxy-operations-form__cost';
        form.appendChild(costRow);

        const costLabel = doc.createElement('span');
        costLabel.className = 'galaxy-operations-form__cost-label';
        costLabel.textContent = 'Antimatter Cost';
        costRow.appendChild(costLabel);

        const costValue = doc.createElement('span');
        costValue.className = 'galaxy-operations-form__cost-value';
        costValue.textContent = '0';
        costRow.appendChild(costValue);

        const durationRow = doc.createElement('div');
        durationRow.className = 'galaxy-operations-form__duration';
        form.appendChild(durationRow);

        const durationLabel = doc.createElement('span');
        durationLabel.className = 'galaxy-operations-form__duration-label';
        durationLabel.textContent = 'Duration';
        durationRow.appendChild(durationLabel);

        const durationValue = doc.createElement('span');
        durationValue.className = 'galaxy-operations-form__duration-value';
        durationValue.textContent = formatOperationDurationDisplay(getDefaultOperationDurationMs());
        durationRow.appendChild(durationValue);

        const progressContainer = doc.createElement('div');
        progressContainer.className = 'galaxy-operations-progress is-hidden';
        form.appendChild(progressContainer);

        const progressTrack = doc.createElement('div');
        progressTrack.className = 'galaxy-operations-progress__track';
        progressContainer.appendChild(progressTrack);

        const progressFill = doc.createElement('div');
        progressFill.className = 'galaxy-operations-progress__fill';
        progressTrack.appendChild(progressFill);

        const progressLabel = doc.createElement('div');
        progressLabel.className = 'galaxy-operations-progress__label';
        progressContainer.appendChild(progressLabel);

        const summary = doc.createElement('div');
        summary.className = 'galaxy-operations-summary';
        form.appendChild(summary);

        const summaryItems = {};
        [
            { key: 'success', label: 'Success Chance', value: '0%' },
            { key: 'gain', label: 'Control Gain', value: '+0%' },
            { key: 'loss', label: 'Projected Losses', value: '-0 power' }
        ].forEach(({ key, label, value }) => {
            const item = doc.createElement('div');
            item.className = 'galaxy-operations-summary__item';

            const itemLabel = doc.createElement('span');
            itemLabel.className = 'galaxy-operations-summary__label';
            itemLabel.textContent = label;
            item.appendChild(itemLabel);

            const itemValue = doc.createElement('span');
            itemValue.className = 'galaxy-operations-summary__value';
            itemValue.textContent = value;
            item.appendChild(itemValue);

            summary.appendChild(item);
            summaryItems[key] = itemValue;
        });

        const statusMessage = doc.createElement('div');
        statusMessage.className = 'galaxy-operations-form__status';
        statusMessage.textContent = '';
        form.appendChild(statusMessage);

        const cache = {
            operationsPanel: panel,
            operationsEmpty: empty,
            operationsForm: form,
            operationsInput: powerInput,
            operationsButtons,
            operationsLaunchButton: launchButton,
            operationsAutoCheckbox: autoLaunchCheckbox,
            operationsAutoThresholdInput: autoLaunchThresholdInput,
            operationsProgress: progressContainer,
            operationsProgressFill: progressFill,
            operationsProgressLabel: progressLabel,
            operationsCostValue: costValue,
            operationsDurationRow: durationRow,
            operationsDurationLabel: durationLabel,
            operationsDurationValue: durationValue,
            operationsAvailable: powerAvailable,
            operationsSummaryItems: summaryItems,
            operationsStatusMessage: statusMessage
        };

        powerInput.addEventListener('change', handleOperationsInputChange);
        powerInput.addEventListener('input', handleOperationsInputChange);

        container.appendChild(panel);
        return cache;
    }

    function updateOperationsPanel(managerOverride, cacheOverride) {
        const cache = cacheOverride || getCache();
        if (!cache) {
            return;
        }
        const {
            operationsPanel,
            operationsEmpty,
            operationsForm,
            operationsInput,
            operationsButtons,
            operationsLaunchButton,
            operationsAutoCheckbox,
            operationsAutoThresholdInput,
            operationsProgress,
            operationsProgressFill,
            operationsProgressLabel,
            operationsCostValue,
            operationsDurationRow,
            operationsDurationLabel,
            operationsDurationValue,
            operationsAvailable,
            operationsSummaryItems,
            operationsStatusMessage
        } = cache;

        if (!operationsPanel || !operationsEmpty || !operationsForm || !operationsInput || !operationsButtons
            || !operationsLaunchButton || !operationsProgress || !operationsProgressFill || !operationsProgressLabel
            || !operationsCostValue || !operationsAvailable || !operationsSummaryItems || !operationsStatusMessage) {
            return;
        }

        const manager = managerOverride || getManager();
        const formatter = getNumberFormatter();
        const selection = cache.selectedSector;
        const enabled = !!(manager && manager.enabled);
        updateOperationArrows(manager, cache);
        const antimatterResource = resources && resources.special ? resources.special.antimatter : null;
        const antimatterValue = antimatterResource ? Number(antimatterResource.value) : 0;
        const selectedKey = enabled && selection ? selection.key : null;
        const stepSize = getStoredStep(selectedKey);
        const defaultDurationMs = getDefaultOperationDurationMs();

        operationsStatusMessage.textContent = '';

        operationsInput.step = stepSize;
        updateOperationsStepDisplay(stepSize, formatter);

        if (operationsDurationLabel) {
            operationsDurationLabel.textContent = 'Duration';
        }
        if (operationsDurationRow) {
            operationsDurationRow.classList.remove('is-hidden');
        }
        if (operationsDurationValue) {
            operationsDurationValue.textContent = formatOperationDurationDisplay(defaultDurationMs);
        }
        if (operationsAutoThresholdInput) {
            const thresholdValue = getAutoLaunchThreshold();
            operationsAutoThresholdInput.value = formatAutoThresholdDisplay(thresholdValue);
            operationsAutoThresholdInput.disabled = true;
        }

        const storedAutoEnabled = selectedKey ? getOperationAutoState(selectedKey) : false;
        if (operationsAutoCheckbox) {
            operationsAutoCheckbox.checked = storedAutoEnabled;
        }

        const disableAllControls = () => {
            operationsInput.disabled = true;
            Object.values(operationsButtons).forEach((button) => {
                button.disabled = true;
            });
            operationsLaunchButton.disabled = true;
            operationsLaunchButton.classList.remove('is-hidden');
            operationsProgress.classList.add('is-hidden');
            operationsProgressFill.style.width = '0%';
            operationsProgressLabel.textContent = '';
            if (operationsAutoCheckbox) {
                operationsAutoCheckbox.disabled = true;
                operationsAutoCheckbox.checked = false;
            }
            if (operationsAutoThresholdInput) {
                operationsAutoThresholdInput.disabled = true;
            }
        };

        if (!enabled) {
            operationsEmpty.classList.remove('is-hidden');
            operationsEmpty.textContent = 'Galaxy operations are offline.';
            operationsForm.classList.add('is-hidden');
            operationsCostValue.textContent = '0';
            operationsStatusMessage.textContent = '';
            if (operationsDurationValue) {
                operationsDurationValue.textContent = '—';
            }
            disableAllControls();
            return;
        }

        if (!selection) {
            operationsEmpty.classList.remove('is-hidden');
            operationsEmpty.textContent = 'Select a contested sector to assign fleet power.';
            operationsForm.classList.add('is-hidden');
            operationsCostValue.textContent = '0';
            operationsStatusMessage.textContent = '';
            if (operationsDurationValue) {
                operationsDurationValue.textContent = '—';
            }
            disableAllControls();
            return;
        }

        const sector = manager.getSector(selection.q, selection.r);
        if (!sector) {
            operationsEmpty.classList.remove('is-hidden');
            operationsEmpty.textContent = 'Sector data unavailable.';
            operationsForm.classList.add('is-hidden');
            operationsCostValue.textContent = '0';
            operationsStatusMessage.textContent = '';
            if (operationsDurationValue) {
                operationsDurationValue.textContent = '—';
            }
            disableAllControls();
            return;
        }

        const faction = manager.getFaction((typeof globalThis !== 'undefined' && typeof globalThis.UHF_FACTION_ID === 'string')
            ? globalThis.UHF_FACTION_ID
            : 'uhf');
        const availablePower = faction ? Math.max(0, faction.fleetPower) : 0;
        const stored = getStoredAllocation(selection.key);
        const assignment = clampAssignment(stored, availablePower);
        const step = getStoredStep(selection.key);
        operationsInput.value = assignment;

        operationsEmpty.classList.add('is-hidden');
        operationsForm.classList.remove('is-hidden');
        operationsAvailable.textContent = `Available: ${formatter(availablePower, false, 2)}`;

        const antimatterCost = assignment * 1000;
        operationsCostValue.textContent = formatter(antimatterCost, true);

        const operation = manager.getOperationForSector(selection.key);
        const hasOperation = !!operation;
        const operationRunning = hasOperation && operation.status === 'running';

        const lossEstimate = manager?.getOperationLossEstimate?.({
            sectorKey: selection.key,
            factionId: (typeof globalThis !== 'undefined' && typeof globalThis.UHF_FACTION_ID === 'string')
                ? globalThis.UHF_FACTION_ID
                : 'uhf',
            assignedPower: assignment,
            reservedPower: assignment,
            offensePower: assignment
        });

        const sectorPower = manager.getSectorDefensePower
            ? manager.getSectorDefensePower(selection.key, (typeof globalThis !== 'undefined' && typeof globalThis.UHF_FACTION_ID === 'string')
                ? globalThis.UHF_FACTION_ID
                : 'uhf')
            : 0;
        const successChance = assignment > 0
            ? resolveOperationSuccessChance(manager, selection.key, assignment)
            : 0;
        const meetsAutoThreshold = successChance >= getAutoLaunchThreshold();

        let requiredAutoPower = 0;
        if (!meetsAutoThreshold && lossEstimate) {
            const desired = sectorPower;
            requiredAutoPower = desired > assignment ? desired : 0;
        }

        if (operationsSummaryItems.success) {
            operationsSummaryItems.success.textContent = (typeof formatPercentDisplay === 'function')
                ? formatPercentDisplay(successChance)
                : `${Math.round(successChance * 100)}%`;
        }
        if (operationsSummaryItems.gain) {
            const gainPercent = lossEstimate?.successChance ? lossEstimate.successChance * 100 : successChance * 100;
            operationsSummaryItems.gain.textContent = `+${Math.max(0, Math.round(gainPercent * 10) / 10)}%`;
        }
        if (operationsSummaryItems.loss) {
            const lossDisplay = lossEstimate?.failureLoss ?? assignment;
            operationsSummaryItems.loss.textContent = `-${formatter(lossDisplay, false, 2)} power`;
        }

        if (operationRunning) {
            operationsInput.disabled = true;
            Object.values(operationsButtons).forEach((button) => {
                button.disabled = true;
            });
            operationsLaunchButton.disabled = true;
            operationsLaunchButton.classList.add('is-hidden');
            operationsProgress.classList.remove('is-hidden');
            const duration = Number.isFinite(operation.durationMs) && operation.durationMs > 0
                ? operation.durationMs
                : defaultDurationMs;
            const elapsed = Math.max(0, Math.min(duration, Number(operation.elapsedMs) || 0));
            const progress = duration > 0 ? elapsed / duration : 1;
            const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
            operationsProgressFill.style.width = `${percent}%`;
            const remainingMs = Math.max(0, duration - elapsed);
            const remainingLabel = formatOperationDurationDisplay(remainingMs);
            if (operationsDurationLabel) {
                operationsDurationLabel.textContent = 'Time Remaining';
            }
            if (operationsDurationRow) {
                operationsDurationRow.classList.remove('is-hidden');
            }
            if (operationsDurationValue) {
                operationsDurationValue.textContent = remainingLabel;
            }
            operationsProgressLabel.textContent = `Launch in progress — ${percent}% (${remainingLabel} remaining)`;
            operationsStatusMessage.textContent = 'Deployment underway. Fleet power returns upon completion.';
            return;
        }

        operationsLaunchButton.classList.remove('is-hidden');
        operationsProgress.classList.add('is-hidden');
        operationsProgressFill.style.width = '0%';
        operationsProgressLabel.textContent = '';

        const hasFleetPower = availablePower > 0;
        const hasAssignment = assignment > 0;
        const hasAntimatter = !!antimatterResource && antimatterValue >= antimatterCost;
        const hasChance = successChance > 0;

        operationsInput.disabled = !hasFleetPower;
        Object.values(operationsButtons).forEach((button) => {
            button.disabled = !hasFleetPower;
        });

        let statusMessage = '';
        if (!hasFleetPower) {
            statusMessage = 'No fleet power available for deployment.';
        } else if (!hasAssignment) {
            statusMessage = 'Assign fleet power to begin an operation.';
        } else if (!hasAntimatter) {
            const deficit = antimatterCost - antimatterValue;
            statusMessage = `Insufficient antimatter by ${formatter(deficit, true)}.`;
        } else if (!hasChance) {
            statusMessage = `Assign more than ${formatter(sectorPower, false, 0)} power for a chance of success.`;
        }
        if (statusMessage === '' && storedAutoEnabled && !meetsAutoThreshold && requiredAutoPower > 0) {
            statusMessage = `Auto launch requires ${formatter(requiredAutoPower, false, 2)} power.`;
        }
        operationsStatusMessage.textContent = statusMessage;

        const launchBlocked = !hasFleetPower || !hasAssignment || !hasAntimatter || !hasChance;
        operationsLaunchButton.disabled = launchBlocked;
        if (operationsAutoCheckbox) {
            const autoDisabled = !enabled || !selection;
            operationsAutoCheckbox.disabled = autoDisabled;
            operationsAutoCheckbox.checked = !!(selection && storedAutoEnabled);
            if (!autoDisabled && !hasOperation && storedAutoEnabled && meetsAutoThreshold && hasAntimatter && !launchBlocked) {
                handleOperationsLaunch();
            }
        }
    }

    function updateOperationArrows(managerOverride, cacheOverride) {
        const cache = cacheOverride || getCache();
        const manager = managerOverride || getManager();
        if (!cache || !cache.operationArrows) {
            return;
        }
        cache.operationArrows.forEach((arrow) => {
            if (arrow?.isConnected) {
                arrow.remove();
            }
        });
        cache.operationArrows.clear();
        if (!cache || !cache.mapOperationsLayer || !cache.operationArrows) {
            return;
        }
        const doc = cache.mapOperationsLayer.ownerDocument || globalThis.document;
        if (!doc || !manager || !manager.enabled) {
            return;
        }
        const arrowCache = cache.operationArrows;
        cache.mapOperationsLayer.replaceChildren();
        manager.getSectors?.().forEach((sector) => {
            const sectorKey = sector?.key;
            if (!sectorKey) {
                return;
            }
            const operation = manager.getOperationForSector(sectorKey);
            if (!operation || operation.status !== 'running') {
                return;
            }
            const origin = operation.originHex;
            if (!origin) {
                return;
            }
            const arrow = doc.createElement('div');
            arrow.className = 'galaxy-operation-arrow';
            arrow.dataset.sector = sectorKey;
            arrowCache.set(sectorKey, arrow);
            cache.mapOperationsLayer.appendChild(arrow);
        });
    }

    return {
        populateSection,
        setContext,
        updateOperationsPanel,
        updateOperationArrows
    };
})();

if (typeof window !== 'undefined') {
    window.GalaxyOperationUI = GalaxyOperationUI;
}
if (typeof globalThis !== 'undefined') {
    globalThis.GalaxyOperationUI = GalaxyOperationUI;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GalaxyOperationUI;
}

