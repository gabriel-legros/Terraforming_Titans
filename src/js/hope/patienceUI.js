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
        const patienceContainer = document.createElement('div');
        patienceContainer.className = 'patience-container';

        // Header
        const header = document.createElement('h2');
        header.textContent = 'Patience';
        patienceContainer.appendChild(header);

        // Display section
        const displayDiv = document.createElement('div');
        displayDiv.className = 'patience-display';

        // Current patience
        const currentDiv = document.createElement('div');
        currentDiv.className = 'patience-current';
        currentDiv.innerHTML = '<span>Current Patience:</span> <span id="patience-current-value">0</span> / <span id="patience-max-value">12</span> hours';
        displayDiv.appendChild(currentDiv);

        // Timer
        const timerDiv = document.createElement('div');
        timerDiv.className = 'patience-timer';
        timerDiv.innerHTML = '<span>Next daily patience in:</span> <span id="patience-timer-value">--:--</span>';
        displayDiv.appendChild(timerDiv);

        patienceContainer.appendChild(displayDiv);

        // Spend section
        const spendDiv = document.createElement('div');
        spendDiv.className = 'patience-spend';

        const label = document.createElement('label');
        label.textContent = 'Spend patience for superalloys: ';
        spendDiv.appendChild(label);

        const input = document.createElement('input');
        input.type = 'number';
        input.id = 'patience-spend-input';
        input.min = '1';
        input.max = '12';
        input.step = '1';
        input.value = '1';
        spendDiv.appendChild(input);

        const button = document.createElement('button');
        button.id = 'patience-spend-button';
        button.textContent = 'Spend Patience';
        spendDiv.appendChild(button);

        const preview = document.createElement('span');
        preview.id = 'patience-spend-preview';
        spendDiv.appendChild(preview);

        patienceContainer.appendChild(spendDiv);

        this.container.appendChild(patienceContainer);

        // Cache the newly created elements
        this.currentValueEl = document.getElementById('patience-current-value');
        this.maxValueEl = document.getElementById('patience-max-value');
        this.timerValueEl = document.getElementById('patience-timer-value');
        this.spendInputEl = document.getElementById('patience-spend-input');
        this.spendButtonEl = document.getElementById('patience-spend-button');
        this.spendPreviewEl = document.getElementById('patience-spend-preview');
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
        if (!this.spendPreviewEl || !this.spendInputEl) return;
        
        const hours = parseFloat(this.spendInputEl.value) || 0;
        const superalloyResource = resources?.colony?.superalloys;
        const productionRate = superalloyResource?.productionRate || 0;
        
        if (productionRate <= 0 || hours <= 0) {
            this.spendPreviewEl.textContent = 'No superalloy production';
            return;
        }
        
        const secondsOfPatience = hours * 3600;
        const superalloyGain = productionRate * secondsOfPatience;
        this.spendPreviewEl.textContent = `Gain: ${formatNumber(superalloyGain, true)} superalloys`;
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
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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

        // Update spend button state
        if (this.spendButtonEl && this.spendInputEl) {
            const hours = parseFloat(this.spendInputEl.value) || 0;
            const superalloyResource = resources?.colony?.superalloys;
            const productionRate = superalloyResource?.productionRate || 0;
            const canSpend = hours > 0 && hours <= patienceManager.currentHours && productionRate > 0;
            this.spendButtonEl.disabled = !canSpend;
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