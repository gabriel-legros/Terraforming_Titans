let milestoneAlertNeeded = false;
let lastCompletableCount = 0;

function createMilestonesUI() {
    const milestonesContainer = document.getElementById('milestone-terraforming');
    milestonesContainer.innerHTML = ''; // Clear any existing content

    // Add the Milestones header
    const header = document.createElement('h2');
    header.textContent = 'Milestones';
    milestonesContainer.appendChild(header);

    // Add a short description below the header
    const description = document.createElement('p');
    description.textContent = 'Track your progress and unlock up to 10% colony happiness as you achieve these terraforming milestones.  Each milestone completed (click to claim) will also start a festival.';
    milestonesContainer.appendChild(description);

    const silenceDiv = document.createElement('div');
    const silenceLabel = document.createElement('label');
    const silenceToggle = document.createElement('input');
    silenceToggle.type = 'checkbox';
    silenceToggle.id = 'milestone-silence-toggle';
    if (typeof gameSettings !== 'undefined') {
        silenceToggle.checked = gameSettings.silenceMilestoneAlert || false;
    }
    silenceToggle.addEventListener('change', () => {
        if (typeof gameSettings !== 'undefined') {
            gameSettings.silenceMilestoneAlert = silenceToggle.checked;
        }
        updateMilestoneAlert();
    });
    silenceLabel.appendChild(silenceToggle);
    silenceLabel.appendChild(document.createTextNode(' Silence milestone alert'));
    silenceDiv.appendChild(silenceLabel);
    milestonesContainer.appendChild(silenceDiv);

    // Add total bonuses display
    const totalBonuses = document.createElement('div');
    totalBonuses.id = 'total-bonuses';
    totalBonuses.innerHTML = `
        <p>Total Happiness Bonus: <span id="total-happiness-bonus">0</span></p>
    `;
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
            updateMilestonesUI(milestonesManager);
        });

        currentRow.appendChild(button);
    });
}

function updateMilestonesUI() {
    let totalFundingBonus = 0;
    let completedMilestones = 0;

    milestonesManager.milestones.forEach((milestone, index) => {
        const button = document.getElementById(`milestone-button-${index}`);
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
    const totalHappinessBonusElement = document.getElementById('total-happiness-bonus');

    if (totalFundingBonusElement) {
        totalFundingBonusElement.textContent = totalFundingBonus;
    }

    if (totalHappinessBonusElement) {
        totalHappinessBonusElement.textContent = `${(milestonesManager.getHappinessBonus()).toFixed(2)}%`;
    }

    if(milestonesManager.countdownActive){
        if(!milestonesManager.countdownElement){
            milestonesManager.countdownElement = document.createElement('div');
            milestonesManager.countdownElement.className = 'festival-countdown';
            document.getElementById('festival-container').appendChild(milestonesManager.countdownElement);
        }
        const seconds = Math.ceil(milestonesManager.countdownRemainingTime / 1000);
        milestonesManager.countdownElement.textContent = `Festival 3x multiplier! ${seconds}s`;
    } else {
        if(milestonesManager.countdownElement){
            milestonesManager.countdownElement.remove();
            milestonesManager.countdownElement = null;
        }
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
    if (typeof gameSettings !== 'undefined' && gameSettings.silenceMilestoneAlert) {
        if (alertEl) alertEl.style.display = 'none';
        if (subtabEl) subtabEl.style.display = 'none';
        return;
    }
    const display = milestoneAlertNeeded ? 'inline' : 'none';
    if (alertEl) alertEl.style.display = display;
    if (subtabEl) subtabEl.style.display = display;
}

function markMilestonesViewed() {
    milestoneAlertNeeded = false;
    lastCompletableCount = (typeof milestonesManager !== 'undefined' && milestonesManager.getCompletableMilestones)
        ? milestonesManager.getCompletableMilestones().length
        : 0;
    updateMilestoneAlert();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { checkMilestoneAlert, updateMilestoneAlert, markMilestonesViewed };
}