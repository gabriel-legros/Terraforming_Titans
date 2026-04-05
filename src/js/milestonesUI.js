let milestoneAlertNeeded = false;
let lastCompletableCount = 0;
let festivalContainerElement = null;
let festivalCountdownElement = null;
let totalHappinessBonusElement = null;
let claimAllMilestonesButton = null;
let milestoneButtons = [];

function getMilestoneSettings() {
    return gameSettings;
}

function isMilestoneSubtabUnlocked() {
    const button = document.querySelector('.terraforming-subtab[data-subtab="milestone-terraforming"]');
    return !button.classList.contains('hidden');
}

function getMilestonesUiText(path, fallback, vars) {
    return t(`ui.terraforming.milestonesUi.${path}`, vars, fallback);
}

function createMilestonesUI() {
    const milestonesContainer = document.getElementById('milestone-terraforming');
    milestonesContainer.innerHTML = ''; // Clear any existing content
    milestoneButtons = [];

    // Add the Milestones header
    const header = document.createElement('h2');
    header.textContent = t('ui.terraforming.milestonesTitle', null, 'Milestones');
    milestonesContainer.appendChild(header);

    // Add a short description below the header
    const description = document.createElement('p');
    description.textContent = getMilestonesUiText(
        'description',
        'Track your progress and unlock up to 10% colony happiness as you achieve these terraforming milestones. Each milestone completed (click to claim) will also start a festival.'
    );
    milestonesContainer.appendChild(description);

    const silenceDiv = document.createElement('div');
    const silenceLabel = document.createElement('label');
    const silenceToggle = document.createElement('input');
    silenceToggle.type = 'checkbox';
    silenceToggle.id = 'milestone-silence-toggle';
    const settings = getMilestoneSettings();
    if (settings) {
        silenceToggle.checked = settings.silenceMilestoneAlert || false;
    }
    silenceToggle.addEventListener('change', () => {
        const currentSettings = getMilestoneSettings();
        if (currentSettings) {
            currentSettings.silenceMilestoneAlert = silenceToggle.checked;
        }
        updateMilestoneAlert();
    });
    silenceLabel.appendChild(silenceToggle);
    silenceLabel.appendChild(document.createTextNode(` ${t('ui.terraforming.silenceMilestoneAlert', null, 'Silence milestone alert')}`));
    silenceDiv.appendChild(silenceLabel);
    milestonesContainer.appendChild(silenceDiv);

    // Add total bonuses display
    const totalBonuses = document.createElement('div');
    totalBonuses.id = 'total-bonuses';
    totalBonuses.className = 'milestone-summary-row';

    totalHappinessBonusElement = document.createElement('div');
    totalHappinessBonusElement.id = 'total-happiness-bonus';
    totalHappinessBonusElement.className = 'milestone-total-happiness';

    claimAllMilestonesButton = document.createElement('button');
    claimAllMilestonesButton.id = 'claim-all-milestones-button';
    claimAllMilestonesButton.className = 'milestone-claim-all-button';
    claimAllMilestonesButton.textContent = getMilestonesUiText('claimAll', 'Claim All');
    claimAllMilestonesButton.addEventListener('click', () => {
        milestonesManager.completeAllMilestones();
        updateMilestonesUI();
    });

    totalBonuses.appendChild(totalHappinessBonusElement);
    totalBonuses.appendChild(claimAllMilestonesButton);
    milestonesContainer.appendChild(totalBonuses);

    const rows = [];
    let currentRow;

    // Create buttons for each milestone
    milestonesManager.milestones.forEach((milestone, index) => {
        if (index % 5 === 0) {
            currentRow = document.createElement('div');
            currentRow.classList.add('milestone-row');
            milestonesContainer.appendChild(currentRow);
            rows.push(currentRow);
        }

        const button = document.createElement('button');
        button.classList.add('milestone-button');
        button.id = `milestone-button-${index}`;

        // Add the milestone name and description to the button
        button.innerHTML = `
            <div class="milestone-name">${milestone.name}</div>
            <div class="milestone-description">${milestone.description}</div>
        `;

        // Attach click event to complete the milestone
        button.addEventListener('click', () => {
            milestonesManager.completeMilestone(milestone.name);
            updateMilestonesUI();
        });

        currentRow.appendChild(button);
        milestoneButtons.push(button);
    });

    festivalContainerElement = document.getElementById('festival-container');
    festivalCountdownElement = document.getElementById('festival-countdown') || document.createElement('div');
    festivalCountdownElement.className = 'festival-countdown';
    festivalCountdownElement.id = 'festival-countdown';
    festivalCountdownElement.hidden = true;
    festivalCountdownElement.textContent = '';
    festivalCountdownElement.isConnected || festivalContainerElement.appendChild(festivalCountdownElement);
}

function updateMilestonesUI() {
    let totalFundingBonus = 0;
    let completedMilestones = 0;
    const completableMilestones = milestonesManager.getCompletableMilestones();

    milestonesManager.milestones.forEach((milestone, index) => {
        const button = milestoneButtons[index];
        if (!button) return;

        // Update the button's state
        if (milestone.isCompleted) {
            button.classList.remove('completable', 'not-completable');
            button.classList.add('completed');
            button.disabled = true;
            totalFundingBonus += milestone.fundingIncrease || 0;
            completedMilestones++;
        } else if (milestone.canBeCompleted) {
            button.classList.remove('completed', 'not-completable');
            button.classList.add('completable');
            button.disabled = false;
        } else {
            button.classList.remove('completed', 'completable');
            button.classList.add('not-completable');
            button.disabled = true;
        }
    });

    // Update the total bonuses
    const totalFundingBonusElement = document.getElementById('total-funding-bonus');

    if (totalFundingBonusElement) {
        totalFundingBonusElement.textContent = totalFundingBonus;
    }

    if (totalHappinessBonusElement) {
        totalHappinessBonusElement.textContent = getMilestonesUiText(
            'totalHappinessBonus',
            'Total Happiness Bonus: {value}',
            { value: `${(milestonesManager.getHappinessBonus()).toFixed(2)}%` }
        );
    }

    if (claimAllMilestonesButton) {
        claimAllMilestonesButton.disabled = completableMilestones.length === 0;
    }

    milestonesManager.countdownElement = festivalCountdownElement;
    festivalCountdownElement.isConnected || festivalContainerElement.appendChild(festivalCountdownElement);
    if (milestonesManager.countdownActive) {
        const seconds = Math.ceil(milestonesManager.countdownRemainingTime / 1000);
        festivalCountdownElement.textContent = getMilestonesUiText(
            'festivalCountdown',
            'Festival 3x multiplier! {seconds}s',
            { seconds }
        );
        festivalCountdownElement.hidden = false;
    } else {
        festivalCountdownElement.textContent = '';
        festivalCountdownElement.hidden = true;
    }

    checkMilestoneAlert();
    updateMilestoneAlert();
}

function checkMilestoneAlert() {
    const count = (typeof milestonesManager !== 'undefined' && milestonesManager.getCompletableMilestones)
        ? milestonesManager.getCompletableMilestones().length
        : 0;
    if (count > lastCompletableCount) {
        milestoneAlertNeeded = true;
    }
    lastCompletableCount = count;
}

function updateMilestoneAlert() {
    const alertEl = document.getElementById('terraforming-alert');
    const subtabEl = document.getElementById('milestone-subtab-alert');
    if (!alertEl && !subtabEl) return;
    const settings = getMilestoneSettings();
    if (settings && settings.silenceMilestoneAlert) {
        if (alertEl) alertEl.style.display = 'none';
        if (subtabEl) subtabEl.style.display = 'none';
        return;
    }
    const milestonesUnlocked = isMilestoneSubtabUnlocked();
    if (alertEl) {
        alertEl.style.display = milestoneAlertNeeded && milestonesUnlocked ? 'inline' : 'none';
    }
    if (subtabEl) {
        subtabEl.style.display = milestoneAlertNeeded && milestonesUnlocked ? 'inline' : 'none';
    }
}

function markMilestonesViewed() {
    milestoneAlertNeeded = false;
    lastCompletableCount = (typeof milestonesManager !== 'undefined' && milestonesManager.getCompletableMilestones)
        ? milestonesManager.getCompletableMilestones().length
        : 0;
    updateMilestoneAlert();
}

function clearFestivalNotification() {
    milestoneAlertNeeded = false;
    lastCompletableCount = 0;
    milestonesManager.countdownActive = false;
    milestonesManager.countdownRemainingTime = 0;
    milestonesManager.countdownElement = festivalCountdownElement;
    festivalCountdownElement.isConnected || festivalContainerElement.appendChild(festivalCountdownElement);
    festivalCountdownElement.textContent = '';
    festivalCountdownElement.hidden = true;
    updateMilestoneAlert();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { checkMilestoneAlert, updateMilestoneAlert, markMilestonesViewed, clearFestivalNotification };
}
