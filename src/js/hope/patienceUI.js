/**
 * Patience UI module for H.O.P.E. system
 * Handles UI rendering and updates for patience mechanics
 */

const PatienceUI = {
    // Cached DOM elements
    subtab: null,
    container: null,
    currentValueEl: null,
    maxValueEl: null,
    timerValueEl: null,
    spendInputEl: null,
    spendButtonEl: null,
    spendPreviewEl: null,
    meterFillEl: null,
    gainValueEl: null,
    gainMetaEl: null,
    timerMetaEl: null,
    worldValueEl: null,
    worldMetaEl: null,
    saveFileButtonEl: null,
    saveClipboardButtonEl: null,

    /**
     * Initialize the patience UI
     */
    initialize() {
        this.cacheElements();
        this.buildUI();
        this.setupEventListeners();
    },

    /**
     * Cache DOM elements for reuse
     */
    cacheElements() {
        this.subtab = document.getElementById('patience-subtab');
        this.container = document.getElementById('patience-hope');
    },

    /**
     * Build the UI dynamically
     */
    buildUI() {
        if (!this.container) return;

        // Clear existing content
        this.container.innerHTML = '';

        // Create patience container
        const shell = document.createElement('div');
        shell.className = 'patience-shell';

        const header = document.createElement('div');
        header.className = 'patience-header';

        const titleRow = document.createElement('div');
        titleRow.className = 'patience-title-row';

        const title = document.createElement('h2');
        title.textContent = 'Patience';
        titleRow.appendChild(title);

        const tooltip = document.createElement('span');
        tooltip.className = 'info-tooltip-icon';
        tooltip.title = 'Save to file or export to clipboard once per day to claim patience. Each world banks patience at 2 seconds per second; completing terraforming claims the bank and keeps earning until the 3 hour world cap is reached.';
        titleRow.appendChild(tooltip);
        header.appendChild(titleRow);

        const subtitle = document.createElement('p');
        subtitle.className = 'patience-subtitle';
        subtitle.textContent = 'Claim daily patience by saving or exporting. Each world banks patience until terraforming completes, then continues earning up to 3 hours total. Use patience to gain equivalent hours of production for various things.';
        header.appendChild(subtitle);
        shell.appendChild(header);

        const statsRow = document.createElement('div');
        statsRow.className = 'patience-stats';

        const currentCard = document.createElement('div');
        currentCard.className = 'patience-card';

        const currentLabel = document.createElement('div');
        currentLabel.className = 'patience-card-label';
        currentLabel.textContent = 'Available Patience';
        currentCard.appendChild(currentLabel);

        const currentValue = document.createElement('div');
        currentValue.id = 'patience-current-value';
        currentValue.className = 'patience-card-value';
        currentValue.textContent = '0.0';
        currentCard.appendChild(currentValue);

        const maxLine = document.createElement('div');
        maxLine.className = 'patience-card-meta';
        maxLine.innerHTML = 'Capacity <span id="patience-max-value">12</span> points (hours)';
        currentCard.appendChild(maxLine);
        statsRow.appendChild(currentCard);

        const gainCard = document.createElement('div');
        gainCard.className = 'patience-card';

        const gainLabel = document.createElement('div');
        gainLabel.className = 'patience-card-label';
        gainLabel.textContent = 'Daily patience';
        gainCard.appendChild(gainLabel);

        const gainValue = document.createElement('div');
        gainValue.className = 'patience-card-value';
        gainValue.textContent = '+3';
        gainCard.appendChild(gainValue);

        const gainMeta = document.createElement('div');
        gainMeta.className = 'patience-card-meta';
        gainMeta.textContent = 'Save/export daily';
        gainCard.appendChild(gainMeta);

        statsRow.appendChild(gainCard);

        const timerCard = document.createElement('div');
        timerCard.className = 'patience-card';

        const timerLabel = document.createElement('div');
        timerLabel.className = 'patience-card-label';
        timerLabel.textContent = 'Save bonus status';
        timerCard.appendChild(timerLabel);

        const timerValue = document.createElement('div');
        timerValue.id = 'patience-timer-value';
        timerValue.className = 'patience-card-value';
        timerValue.textContent = '--:--';
        timerCard.appendChild(timerValue);

        const timerMeta = document.createElement('div');
        timerMeta.className = 'patience-card-meta';
        timerMeta.textContent = 'Next reset in --:--:--';
        timerCard.appendChild(timerMeta);
        statsRow.appendChild(timerCard);

        const worldCard = document.createElement('div');
        worldCard.className = 'patience-card';

        const worldLabel = document.createElement('div');
        worldLabel.className = 'patience-card-label';
        worldLabel.textContent = 'Terraforming patience';

        const worldInfo = document.createElement('span');
        worldInfo.className = 'info-tooltip-icon';
        worldLabel.appendChild(worldInfo);
        attachDynamicInfoTooltip(worldInfo, 'Bank patience at 2 seconds per second from world start. Completing terraforming claims the bank and keeps earning until the world cap (3 hours) is reached.');

        worldCard.appendChild(worldLabel);

        const worldValue = document.createElement('div');
        worldValue.id = 'patience-world-value';
        worldValue.className = 'patience-card-value';
        worldValue.textContent = '0.00h banked';
        worldCard.appendChild(worldValue);

        const worldMeta = document.createElement('div');
        worldMeta.className = 'patience-card-meta';
        worldMeta.textContent = 'Banking 0.00 / 3.00h';
        worldCard.appendChild(worldMeta);

        statsRow.appendChild(worldCard);

        shell.appendChild(statsRow);

        const meter = document.createElement('div');
        meter.className = 'patience-meter';
        const meterFill = document.createElement('div');
        meterFill.className = 'patience-meter-fill';
        meterFill.style.width = '0%';
        meter.appendChild(meterFill);

        const meterText = document.createElement('div');
        meterText.className = 'patience-meter-text';
        meterText.textContent = 'Patience reserve';
        meter.appendChild(meterText);
        shell.appendChild(meter);

        const spendCard = document.createElement('div');
        spendCard.className = 'patience-spend-card';

        const spendHeader = document.createElement('div');
        spendHeader.className = 'patience-card-label';
        spendHeader.textContent = 'Convert patience into net metal, superalloys, superconductors, advanced research, O\'Neill cylinders, and Warp Gate Command/Network progress based on current production.';
        spendCard.appendChild(spendHeader);

        const spendRow = document.createElement('div');
        spendRow.className = 'patience-input-row';

        const spendInput = document.createElement('input');
        spendInput.type = 'number';
        spendInput.id = 'patience-spend-input';
        spendInput.min = '1';
        spendInput.max = '12';
        spendInput.step = '1';
        spendInput.value = '1';
        spendRow.appendChild(spendInput);

        const spendButton = document.createElement('button');
        spendButton.id = 'patience-spend-button';
        spendButton.textContent = 'Spend';
        spendRow.appendChild(spendButton);

        spendCard.appendChild(spendRow);

        const spendPreview = document.createElement('div');
        spendPreview.id = 'patience-spend-preview';
        spendPreview.className = 'patience-preview';
        spendCard.appendChild(spendPreview);

        shell.appendChild(spendCard);

        const saveRow = document.createElement('div');
        saveRow.className = 'patience-save-row';

        const saveFileButton = document.createElement('button');
        saveFileButton.id = 'patience-save-file-button';
        saveFileButton.textContent = 'Save to file';
        saveRow.appendChild(saveFileButton);

        const saveClipboardButton = document.createElement('button');
        saveClipboardButton.id = 'patience-save-clipboard-button';
        saveClipboardButton.textContent = 'Export to clipboard';
        saveRow.appendChild(saveClipboardButton);

        shell.appendChild(saveRow);

        this.container.appendChild(shell);

        // Cache the newly created elements
        this.currentValueEl = currentValue;
        this.maxValueEl = maxLine.querySelector('#patience-max-value');
        this.timerValueEl = timerValue;
        this.timerMetaEl = timerMeta;
        this.spendInputEl = spendInput;
        this.spendButtonEl = spendButton;
        this.spendPreviewEl = spendPreview;
        this.meterFillEl = meterFill;
        this.gainValueEl = gainValue;
        this.gainMetaEl = gainMeta;
        this.worldValueEl = worldValue;
        this.worldMetaEl = worldMeta;
        this.saveFileButtonEl = saveFileButton;
        this.saveClipboardButtonEl = saveClipboardButton;
        this.updateSpendPreview();
    },

    /**
     * Setup event listeners for UI interactions
     */
    setupEventListeners() {
        if (this.spendButtonEl) {
            this.spendButtonEl.addEventListener('click', () => this.handleSpendClick());
        }
        if (this.spendInputEl) {
            this.spendInputEl.addEventListener('input', () => this.updateSpendPreview());
        }
        if (this.saveFileButtonEl) {
            this.saveFileButtonEl.addEventListener('click', () => this.handleSaveFile());
        }
        if (this.saveClipboardButtonEl) {
            this.saveClipboardButtonEl.addEventListener('click', () => this.handleSaveClipboard());
        }
    },

    /**
     * Handle spend button click
     */
    handleSpendClick() {
        if (!this.spendInputEl || !patienceManager) return;
        
        const hours = parseFloat(this.spendInputEl.value) || 0;
        if (hours > 0 && patienceManager.spendPatience(hours)) {
            this.spendInputEl.value = '1';
            this.updateSpendPreview();
        }
    },

    /**
     * Handle save-to-file shortcut
     */
    handleSaveFile() {
        if (typeof saveGameToFile === 'function') {
            saveGameToFile();
        }
    },

    /**
     * Handle export-to-clipboard shortcut
     */
    handleSaveClipboard() {
        if (typeof saveGameToClipboard === 'function') {
            saveGameToClipboard();
        }
    },

    /**
     * Update the spend preview text
     */
    updateSpendPreview() {
        if (!this.spendPreviewEl || !this.spendInputEl || !patienceManager) return;
        
        const hours = parseFloat(this.spendInputEl.value) || 0;
        const { superalloyGain, superconductorGain, advancedResearchGain, metalGain, oneillGain } = patienceManager.calculateSpendGains(hours);
        const wgcAdvance = this.getWgcAdvancePreview(hours);
        const lines = [];

        const metalResource = resources.colony.metal;
        const superalloyResource = resources.colony.superalloys;
        const superconductorResource = resources.colony.superconductors;

        if (metalGain > 0) {
            let line = `${formatNumber(metalGain, true)} metal`;
            if (metalResource.hasCap) {
                const metalOverflow = metalResource.value + metalGain - metalResource.cap;
                if (metalOverflow > 0) {
                    line += ` (<span class="patience-warning">warning: ${formatNumber(metalOverflow, true)} over storage</span>)`;
                }
            }
            lines.push(line);
        }
        if (superalloyGain > 0) {
            let line = `${formatNumber(superalloyGain, true)} superalloys`;
            if (superalloyResource.hasCap) {
                const superalloyOverflow = superalloyResource.value + superalloyGain - superalloyResource.cap;
                if (superalloyOverflow > 0) {
                    line += ` (<span class="patience-warning">warning: ${formatNumber(superalloyOverflow, true)} over storage</span>)`;
                }
            }
            lines.push(line);
        }
        if (superconductorGain > 0) {
            let line = `${formatNumber(superconductorGain, true)} superconductors`;
            if (superconductorResource.hasCap) {
                const superconductorOverflow = superconductorResource.value + superconductorGain - superconductorResource.cap;
                if (superconductorOverflow > 0) {
                    line += ` (<span class="patience-warning">warning: ${formatNumber(superconductorOverflow, true)} over storage</span>)`;
                }
            }
            lines.push(line);
        }
        if (advancedResearchGain > 0) {
            lines.push(`${formatNumber(advancedResearchGain, true)} advanced research`);
        }
        if (oneillGain > 0) {
            lines.push(`${oneillGain.toFixed(2)} O'Neill cylinders`);
        }

        if (lines.length === 0 && !wgcAdvance) {
            this.spendPreviewEl.textContent = 'No gains available';
            return;
        }

        const header = lines.length > 0 ? ['Gain:'] : [];
        const footer = wgcAdvance ? [wgcAdvance] : [];
        this.spendPreviewEl.innerHTML = header.concat(lines, footer).join('<br>');
    },

    /**
     * Update the patience UI display
     */
    update() {
        this.updateSubtabVisibility();
        
        if (!patienceManager || !patienceManager.enabled) {
            return;
        }
        
        this.render();
    },

    /**
     * Update subtab visibility based on manager state
     */
    updateSubtabVisibility() {
        setHopeSubtabVisibility('patience-hope', patienceManager && patienceManager.enabled);
    },

    /**
     * Format milliseconds as HH:MM
     * @param {number} ms - Milliseconds
     * @returns {string}
     */
    formatTimeRemaining(ms) {
        const totalMinutes = Math.max(0, Math.floor(ms / 60000));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const seconds = Math.max(0, Math.floor((ms % 60000) / 1000));
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },

    /**
     * Render the patience UI content
     */
    render() {
        if (this.currentValueEl) {
            this.currentValueEl.textContent = patienceManager.currentHours.toFixed(1);
        }
        
        if (this.maxValueEl) {
            this.maxValueEl.textContent = patienceManager.maxHours;
        }

        if (this.timerValueEl) {
            const claimedToday = patienceManager.hasClaimedToday();
            this.timerValueEl.textContent = claimedToday ? 'Claimed' : 'Ready';
        }

        if (this.gainValueEl) {
            this.gainValueEl.textContent = '+3';
        }

        if (this.gainMetaEl) {
            const claimedToday = patienceManager.hasClaimedToday();
            this.gainMetaEl.textContent = claimedToday
                ? 'Claimed today via save/export'
                : 'Save to file or export to claim';
        }

        if (this.timerMetaEl) {
            const msRemaining = patienceManager.getMillisecondsUntilNextDaily();
            this.timerMetaEl.textContent = `Next reset in ${this.formatTimeRemaining(msRemaining)}`;
        }

        if (this.worldValueEl && this.worldMetaEl) {
            const cap = patienceManager.worldPatienceCapHours;
            const earned = patienceManager.getWorldPatienceTotalEarnedHours();
            const remaining = patienceManager.getWorldPatienceRemainingHours();
            if (patienceManager.worldTerraformingCompleted) {
                if (remaining > 0) {
                    this.worldValueEl.textContent = `${earned.toFixed(2)}h earned`;
                    this.worldMetaEl.textContent = `Earning +2s/s until ${cap.toFixed(2)}h cap`;
                } else {
                    this.worldValueEl.textContent = `${cap.toFixed(2)}h earned`;
                    this.worldMetaEl.textContent = 'World cap reached';
                }
            } else {
                this.worldValueEl.textContent = `${earned.toFixed(2)}h banked`;
                this.worldMetaEl.textContent = `Banking ${earned.toFixed(2)} / ${cap.toFixed(2)}h (complete terraforming to claim)`;
            }
        }

        // Update spend button state
        if (this.spendButtonEl && this.spendInputEl) {
            const hours = parseFloat(this.spendInputEl.value) || 0;
            const gains = patienceManager.calculateSpendGains(hours);
            const canSpend = hours > 0 && hours <= patienceManager.currentHours && (
                gains.metalGain > 0 ||
                gains.superalloyGain > 0 ||
                gains.superconductorGain > 0 ||
                gains.advancedResearchGain > 0 ||
                gains.oneillGain > 0
            );
            this.spendButtonEl.disabled = !canSpend;
        }

        if (this.meterFillEl) {
            const maxHours = patienceManager.maxHours || 1;
            const ratio = Math.min(1, Math.max(0, patienceManager.currentHours / maxHours));
            this.meterFillEl.style.width = `${ratio * 100}%`;
        }

        // Update preview on each render
        this.updateSpendPreview();
    }
};

/**
 * Build the Warp Gate Command fast-forward preview text
 */
PatienceUI.getWgcAdvancePreview = function(hours) {
    if (hours <= 0) return '';

    const wgcAdvance = warpGateCommand.enabled;
    const wgnAdvance = warpGateNetworkManager.isBooleanFlagSet('warpGateFabrication') && galaxyManager.enabled;

    if (!wgcAdvance && !wgnAdvance) return '';

    if (wgcAdvance && wgnAdvance) {
        return 'WGC operations and Warp Gate Network progress will advance.';
    }
    if (wgcAdvance) {
        return 'WGC operations will advance.';
    }
    return 'Warp Gate Network progress will advance.';
};

/**
 * Global function to update patience UI, called from hopeUI.js
 */
function updatePatienceUI() {
    PatienceUI.update();
}
