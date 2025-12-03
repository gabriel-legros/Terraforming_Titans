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
        tooltip.title = 'Daily patience trickles in automatically and can be cashed in for superalloy production time, advanced research, and O\'Neill cylinder growth.';
        titleRow.appendChild(tooltip);
        header.appendChild(titleRow);

        const subtitle = document.createElement('p');
        subtitle.className = 'patience-subtitle';
        subtitle.textContent = 'HOPE gains patience over time and from terraforming worlds.';
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
        maxLine.innerHTML = 'Capacity <span id="patience-max-value">12</span> hours';
        currentCard.appendChild(maxLine);
        statsRow.appendChild(currentCard);

        const gainCard = document.createElement('div');
        gainCard.className = 'patience-card';

        const gainLabel = document.createElement('div');
        gainLabel.className = 'patience-card-label';
        gainLabel.textContent = 'Patience gain';
        gainCard.appendChild(gainLabel);

        const gainValue = document.createElement('div');
        gainValue.className = 'patience-card-value';
        gainValue.textContent = '+3';
        gainCard.appendChild(gainValue);

        const gainMeta = document.createElement('div');
        gainMeta.className = 'patience-card-meta';
        gainMeta.textContent = 'Daily UTC bonus';
        gainCard.appendChild(gainMeta);

        statsRow.appendChild(gainCard);

        const timerCard = document.createElement('div');
        timerCard.className = 'patience-card';

        const timerLabel = document.createElement('div');
        timerLabel.className = 'patience-card-label';
        timerLabel.textContent = 'Next daily gain';
        timerCard.appendChild(timerLabel);

        const timerValue = document.createElement('div');
        timerValue.id = 'patience-timer-value';
        timerValue.className = 'patience-card-value';
        timerValue.textContent = '--:--';
        timerCard.appendChild(timerValue);

        const timerMeta = document.createElement('div');
        timerMeta.className = 'patience-card-meta';
        timerMeta.textContent = 'UTC midnight refresh';
        timerCard.appendChild(timerMeta);
        statsRow.appendChild(timerCard);

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
        spendHeader.textContent = 'Convert patience into superalloys, advanced research, and O\'Neill cylinders based on current production.';
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

        this.container.appendChild(shell);

        // Cache the newly created elements
        this.currentValueEl = currentValue;
        this.maxValueEl = maxLine.querySelector('#patience-max-value');
        this.timerValueEl = timerValue;
        this.spendInputEl = spendInput;
        this.spendButtonEl = spendButton;
        this.spendPreviewEl = spendPreview;
        this.meterFillEl = meterFill;
        this.gainValueEl = gainValue;
        this.gainMetaEl = gainMeta;
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
     * Update the spend preview text
     */
    updateSpendPreview() {
        if (!this.spendPreviewEl || !this.spendInputEl || !patienceManager) return;
        
        const hours = parseFloat(this.spendInputEl.value) || 0;
        const { superalloyGain, advancedResearchGain, oneillGain } = patienceManager.calculateSpendGains(hours);
        const gains = [];

        if (superalloyGain > 0) {
            gains.push(`${formatNumber(superalloyGain, true)} superalloys`);
        }
        if (advancedResearchGain > 0) {
            gains.push(`${formatNumber(advancedResearchGain, true)} advanced research`);
        }
        if (oneillGain > 0) {
            gains.push(`${oneillGain.toFixed(2)} O'Neill cylinders`);
        }

        if (gains.length === 0) {
            this.spendPreviewEl.textContent = 'No gains available';
            return;
        }

        this.spendPreviewEl.textContent = `Gain: ${gains.join(', ')}`;
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
        if (this.subtab) {
            if (patienceManager && patienceManager.enabled) {
                this.subtab.classList.remove('hidden');
            } else {
                this.subtab.classList.add('hidden');
            }
        }
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
            const msRemaining = patienceManager.getMillisecondsUntilNextDaily();
            this.timerValueEl.textContent = this.formatTimeRemaining(msRemaining);
        }

        if (this.gainValueEl) {
            this.gainValueEl.textContent = '+3';
        }

        if (this.gainMetaEl) {
            this.gainMetaEl.textContent = 'Gained daily or when terraforming a world';
        }

        // Update spend button state
        if (this.spendButtonEl && this.spendInputEl) {
            const hours = parseFloat(this.spendInputEl.value) || 0;
            const gains = patienceManager.calculateSpendGains(hours);
            const canSpend = hours > 0 && hours <= patienceManager.currentHours && (
                gains.superalloyGain > 0 ||
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
 * Global function to update patience UI, called from hopeUI.js
 */
function updatePatienceUI() {
    PatienceUI.update();
}
