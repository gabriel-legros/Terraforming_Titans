class StoryEvent {
    constructor(config) {
      this.id = config.id;
      this.type = config.type;
      this.parameters = config.parameters || {};
      this.title = config.title || '';
      this.narrative = config.narrative || '';
      this.objectives = config.objectives || [];
      this.nextChapter = config.nextChapter || null;
      this.reward = config.reward || [];
      this.rewardDelay = config.rewardDelay || 0;  // Add rewardDelay with a default of 0
      this.special = config.special || null; // Add special field for handling flags
    }

    // Handle different types of events (pop-up, journal, etc.)
    trigger() {

        switch (this.type) {
        case "pop-up":
            createPopup(
            this.parameters.title, 
            this.parameters.text, 
            this.parameters.buttonText
            );
            break;
        case "journal":
            addJournalEntry(`${this.title}: ${this.narrative}`);
            break;
        default:
            console.error(`Unknown event type: ${this.type}`);
        }
    }
  }
  
  class StoryManager {
    constructor(progressData) {
        this.chapters = this.loadChapters(progressData);
        this.currentChapter = this.chapters[0];  // Start with the first chapter
        this.objectivesComplete = false; // Track if objectives are complete
        this.appliedEffects = []; // Store applied effects
        this.effectsApplied = false; // Track if all effects have been applied
        this.applyingEffect = false;
      }
  
    // Load the chapters from the progressData object
    loadChapters(progressData) {
      return progressData.chapters.map(chapterConfig => new StoryEvent(chapterConfig));
    }
  
    // Trigger the current chapter and advance to the next
    triggerCurrentChapter() {
        if (this.currentChapter) {
            if (this.currentChapter.type === 'pop-up') {
              this.currentChapter.trigger();
              this.waitForPopupButtonPress();
            } else if (this.currentChapter.type === 'journal') {
                if (!this.objectivesComplete) {
                    if (this.currentChapter.special === 'clearJournal') {
                        clearJournal(); // Clear the journal if the special flag is set
                    }
                    addJournalEntry(this.currentChapter.narrative);
                    this.waitForJournalEntryCompletion();
                }
            }
          }
    }

    // Handle objective completion for pop-up button press
    waitForPopupButtonPress() {
        const closeButton = document.querySelector('.popup-close-button');
        if (closeButton) {
        closeButton.addEventListener('click', () => {
            this.objectivesComplete = true; // Mark objective as complete when the button is pressed
        });
        }
    }

    // Wait for the journal entry to finish typing
    waitForJournalEntryCompletion() {
        const journalEntries = document.getElementById('journal-entries');
        
        // Listen for the event when the journal entry is fully typed
        journalEntries.addEventListener('journalTypedComplete', () => {
            this.objectivesComplete = true; // Mark the objective as complete
        });
    }
  
    // Move to the next chapter based on the current chapter's nextChapter property
    advanceToNextChapter() {
        if (this.effectsApplied) {
            this.objectivesComplete = false;
            this.effectsApplied = false; // Reset effectsApplied flag for the next chapter
            const nextChapterId = this.currentChapter.nextChapter;
            if (nextChapterId) {
                const nextChapter = this.chapters.find(chapter => chapter.id === nextChapterId);
                if (nextChapter) {
                    this.currentChapter = nextChapter;
                    console.log(`Advanced to: ${this.currentChapter.id}`);
                } else {
                    console.error(`Next chapter with ID ${nextChapterId} not found.`);
                }
            }
        }
        this.triggerCurrentChapter();
    }
  
    // Check if all objectives for the current chapter are complete
    checkObjectives() {
        // If the objective is related to a pop-up button press, return the objectivesComplete flag
        if (this.currentChapter.type === 'pop-up' && this.currentChapter.objectives.length === 0) {
            this.applyRewards();
            return this.objectivesComplete;
        } else {
            // For regular objectives, check each objective type
            const objectivesMet = this.currentChapter.objectives.every(objective => {
                return this.isObjectiveComplete(objective); // Check each objective using the helper function
            });

            if (this.currentChapter.type === 'journal') {
                if (objectivesMet && this.objectivesComplete) {
                    this.applyRewards();
                    return true;
                }
            } else {
                if (objectivesMet) {
                    this.objectivesComplete = true;
                    this.applyRewards();
                    return true;
                }
            }
        }
        return false;
    }


    // Helper function to check if a specific objective is complete
    isObjectiveComplete(objective) {
        switch (objective.type) {
        case 'collection':
            // Check if the player has collected enough of the target resource
            return resources[objective.resourceType][objective.resource].value >= objective.quantity;
        case 'building':
            // Check if the player has built enough of the target building
            const building = buildings[objective.buildingName];
            if (building) {
                return building.count >= objective.quantity;
            } else {
                console.error(`Building ${objective.buildingName} not found.`);
                return false;
            }
        case 'colony':
            // Check if the player has built enough of the target building
            const colony = colonies[objective.buildingName];
            if (colony) {
                return colony.count >= objective.quantity;
            } else {
                console.error(`Building ${objective.buildingName} not found.`);
                return false;
            }
        case 'terraforming':
            switch(objective.terraformingParameter){
                case 'tropicalTemperature':
                    if(terraforming.temperature.zones.tropical.value >= objective.value){
                        return true;
                    }
                    else{
                        return false;
                    }
                case 'pressure':
                    if(terraforming.atmosphere.value > objective.value){
                        return true;
                    }
                    else{
                        return false;
                    }
                case 'oxygenPressure':
                    if(calculateGasPressure('oxygen') > objective.value){
                        return true;
                    }
                    else{
                        return false;
                    }
                case 'inertPressure':
                    if(calculateGasPressure('inertGas') > objective.value){
                        return true;
                    }
                    else{
                        return false;
                    }
                case 'lowCO2Pressure':
                    if(calculateGasPressure('carbonDioxide') < objective.value){
                        return true;
                    }
                    else{
                        return false;
                    }
            }
        default:
            console.error(`Unknown objective type: ${objective.type}`);
            return false;
        }
    }

    applyRewards() {
        if (this.currentChapter.reward && this.currentChapter.reward.length > 0 && !this.applyingEffect) {
            const delay = this.currentChapter.rewardDelay || 0; // Get the delay for the current chapter
            let appliedCount = 0;

            this.applyingEffect = true;

            // Apply rewards with a delay in between each one
            this.currentChapter.reward.forEach((effect, index) => {
                setTimeout(() => {
                    // Skip effects with the oneTimeFlag for tracking
                    if (!effect.oneTimeFlag) {
                        this.appliedEffects.push(effect); // Track effect
                    }
                    addEffect(effect); // Apply the effect
                    console.log(`Applied reward: ${effect.type} to ${effect.targetId}`);

                    appliedCount++;
                    if (appliedCount === this.currentChapter.reward.length) {
                        this.effectsApplied = true; // Mark all effects as applied
                        this.applyingEffect = false;
                        this.advanceToNextChapter();  // Move to the next chapter
                    }
                }, index * delay);  // Multiply the index by the delay to stagger the rewards
            });
        } else {
            this.effectsApplied = true; // Mark all effects as applied if there are no rewards
            if(!this.applyingEffect){
                this.advanceToNextChapter();  // Move to the next chapter
            }
        }
    }

    // Save the current state of the story (chapter ID, objectives completed, and applied effects)
    saveState() {
        return {
        currentChapterId: this.currentChapter.id,
        objectivesComplete: this.objectivesComplete,
        appliedEffects: this.appliedEffects // Save the applied effects
        };
    }

    // Load the saved state into the story manager
    loadState(savedState) {
        const { currentChapterId, objectivesComplete, appliedEffects } = savedState;

        // Find and set the current chapter based on the saved state
        this.currentChapter = this.chapters.find(chapter => chapter.id === currentChapterId) || this.chapters[0];
        this.objectivesComplete = objectivesComplete || false;

        // Reapply all saved effects
        if (appliedEffects) {
        this.appliedEffects = appliedEffects; // Set the saved effects
        this.appliedEffects.forEach(effect => {
            addEffect(effect); // Reapply the effect
            console.log(`Reapplied reward: ${effect.type} to ${effect.targetId}`);
        });
        }

        console.log(`Loaded story at chapter: ${this.currentChapter.id}, objectives complete: ${this.objectivesComplete}`);
    }
}