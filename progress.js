// progress.js (contains StoryManager)

class StoryManager {
    constructor(progressData) {
        this.allEvents = this.loadEvents(progressData);
        this.activeEventIds = new Set();
        this.completedEventIds = new Set();
        this.appliedEffects = [];
        this.waitingForJournalEventId = null; // <<< NEW: Track the ID of the journal event we're waiting for

        // --- Add event listener for journal completion ---
        document.addEventListener('storyJournalFinishedTyping', this.handleJournalFinished.bind(this));
        console.log("StoryManager initialized and listening for storyJournalFinishedTyping.");
    }

    // --- NEW: Event handler for journal completion ---
    handleJournalFinished(e) {
        const finishedId = e && e.detail ? e.detail.eventId : null;
        console.log("StoryManager received storyJournalFinishedTyping event.");
        if (this.waitingForJournalEventId !== null && this.waitingForJournalEventId === finishedId) {
            const completedEventId = this.waitingForJournalEventId;
            this.waitingForJournalEventId = null; // Clear the flag *before* processing

            if (this.activeEventIds.has(completedEventId)) {
                 console.log(`Journal finished for waiting event ${completedEventId}. Processing completion.`);
                 this.processEventCompletion(completedEventId);
            } else {
                 console.warn(`Journal finished, but event ${completedEventId} was no longer active?`);
            }
        }
    }

    // Method to clean up the listener if the StoryManager is ever destroyed
    destroy() {
        document.removeEventListener('storyJournalFinishedTyping', this.handleJournalFinished.bind(this));
        console.log("StoryManager listener removed.");
    }


    initializeStory(){ // Keep this as is
        clearJournal();

        const initialEvent = this.findEventById("chapter0.1");
        if(initialEvent && !this.completedEventIds.has(initialEvent.id) && !this.activeEventIds.has(initialEvent.id)){
             this.activateEvent(initialEvent);
        } else if (initialEvent) {
            console.log("Initial event already active or completed, skipping activation.");
        }
    }

    loadEvents(progressData) { // Keep as is
        const eventsMap = new Map();
        progressData.chapters.forEach(config => {
            const event = new StoryEvent(config);
            // --- Automatically add prerequisite based on nextChapter ---
            // Find the event that lists *this* event as its nextChapter
            const previousEvent = progressData.chapters.find(ch => ch.nextChapter === config.id);
            if (previousEvent && !config.prerequisites?.includes(previousEvent.id)) {
                 if (!event.prerequisites) {
                      event.prerequisites = [];
                 }
                 console.log(`Auto-adding prerequisite: ${previousEvent.id} for event ${event.id}`);
                 event.prerequisites.push(previousEvent.id);
            }
            // --------------------------------------------------------
            eventsMap.set(event.id, event);
        });
        return eventsMap;
    }

    findEventById(id) { // Keep as is
        return this.allEvents.get(id);
    }

    update() {
        // --- Prevent processing completions while waiting for a journal ---
        if (this.waitingForJournalEventId !== null) {
             // console.log(`StoryManager update paused: Waiting for journal event ${this.waitingForJournalEventId}`);
             return; // Don't process completions or activations while waiting
        }
        // --- End of addition ---


        // 1. Check completion conditions for currently active events
        const eventsReadyToComplete = new Map(); // Use a map to store event objects

        for (const eventId of this.activeEventIds) {
            const event = this.findEventById(eventId);
            // Make sure we aren't already waiting for this specific event
            if (event && this.checkObjectives(event)) {
                eventsReadyToComplete.set(eventId, event); // Store the event object itself
            }
        }


        // 2. Process events ready for completion
        const newlyCompletedIds = [];
        for (const [eventId, event] of eventsReadyToComplete.entries()) {

             // --- Check if we need to wait for journal animation ---
            const isJournal = event.type === 'journal';
            const pendingQueue = (typeof journalQueue !== 'undefined' && Array.isArray(journalQueue)) ? journalQueue.some(q => q.eventId === eventId) : false;
            const typingThisEvent = (typeof journalCurrentEventId !== 'undefined') && journalCurrentEventId === eventId;

            if (isJournal && (pendingQueue || typingThisEvent)) {
                 // The journal text for this event is still typing or queued.
                 this.waitingForJournalEventId = eventId;
                 console.log(`Event ${eventId} objectives met, waiting for journal text to finish.`);
                 return; // Wait until typing done
            } else {
                 newlyCompletedIds.push(eventId);
            }
             // --- End of check ---
        }

        // 3. Process the events that are *actually* completed (not waiting)
        for (const completedId of newlyCompletedIds) {
             // Ensure it wasn't set to wait in the loop above (shouldn't happen with the 'return' added)
             if (this.waitingForJournalEventId !== completedId) {
                 this.processEventCompletion(completedId);
             }
        }

        // 4. Check activation conditions for inactive events (only if not waiting)
        if (this.waitingForJournalEventId === null) { // Check again in case completion happened via handler
            for (const [eventId, event] of this.allEvents.entries()) {
                if (!this.activeEventIds.has(eventId) && !this.completedEventIds.has(eventId)) {
                    if (this.checkActivationConditions(event)) {
                        this.activateEvent(event);
                    }
                }
            }
        }

        // Update the displayed objective after processing events
        this.updateCurrentObjectiveUI();
    }

    activateEvent(event) { // Keep as is
        if (!event || this.activeEventIds.has(event.id) || this.completedEventIds.has(event.id)) {
            return;
        }
        console.log(`Activating event: ${event.id}`);
        this.activeEventIds.add(event.id);
        if (event.special === 'clearJournal') {
            clearJournal();
        }
        event.trigger(); // Calls addJournalEntry if it's a journal type
    }

    checkActivationConditions(event) { // Keep mostly as is (using prerequisites)
         if (!event) return false;
         // Use prerequisites (potentially auto-added in loadEvents)
         if (event.prerequisites && event.prerequisites.length > 0) {
             const allPrereqsMet = event.prerequisites.every(prereqId => this.completedEventIds.has(prereqId));
             if (!allPrereqsMet) {
                // console.log(`Event ${event.id} prerequisites not met: ${event.prerequisites.filter(id => !this.completedEventIds.has(id))}`);
             }
             return allPrereqsMet;
         }
         // If an event has NO prerequisites (like the very first one), it should be activatable.
         // Let's assume chapter0.1 has no prerequisites. Others get them from nextChapter.
         // This allows the first event to activate.
         return true;
     }


    processEventCompletion(eventId) { // Keep mostly as is
        const event = this.findEventById(eventId);
        if (!event || !this.activeEventIds.has(eventId)) {
             console.warn(`Attempted to process completion for non-active or non-existent event: ${eventId}`);
             return; // Don't process if not active
        };

        console.log(`Processing completion for event: ${event.id}`);

        // 1. Apply rewards
        this.applyRewards(event);

        // 2. Mark as completed and remove from active
        this.activeEventIds.delete(eventId);
        this.completedEventIds.add(eventId);
        console.log(`Event ${eventId} marked as completed. Active: ${Array.from(this.activeEventIds).join(',')}, Completed: ${Array.from(this.completedEventIds).join(',')}`);


        // 3. Trigger activation check in the next update cycle
        // The main update() loop will now naturally check if the completion
        // of this event satisfies prerequisites for any inactive events.
        // We no longer need to explicitly activate the 'nextChapter' here.
        // The prerequisite logic handles the sequence.

        // --- Removed explicit activation of nextChapter ---
        // if (event.nextChapter) { ... this.activateEvent(nextEvent); ... }
    }

    checkObjectives(event) { // Keep as is - checks GAME STATE objectives
        if (!event) return false;
        if (!event.objectives || event.objectives.length === 0) {
            // For this function's purpose (checking game state),
            // no objectives means the condition is met *pending other checks* (like journal animation).
            return true;
        }
        return event.objectives.every(objective => {
            return this.isObjectiveComplete(objective);
        });
    }

    isObjectiveComplete(objective) { // Keep as is
       // ... (your existing logic) ...
        switch (objective.type) {
            case 'collection':
                // Check if the target resource exists before accessing value
                const resourceCategory = resources[objective.resourceType];
                if (!resourceCategory || !resourceCategory[objective.resource]) {
                    console.error(`Resource check failed: ${objective.resourceType}.${objective.resource} not found.`);
                    return false;
                }
                return resourceCategory[objective.resource].value >= objective.quantity;
            case 'building':
                const building = buildings[objective.buildingName];
                return building ? building.count >= objective.quantity : false;
            case 'colony':
                 const colony = colonies[objective.buildingName];
                 return colony ? colony.count >= objective.quantity : false;
           case 'terraforming':
                 // Add checks to ensure terraforming object and properties exist
                 if (!terraforming) return false;
                 switch(objective.terraformingParameter){
                    case 'complete':
                        if (typeof spaceManager !== 'undefined') {
                            return spaceManager.isPlanetTerraformed(spaceManager.getCurrentPlanetKey());
                        }
                        return false;
                    case 'tropicalTemperature':
                         return terraforming.temperature?.zones?.tropical?.value >= objective.value;
                    case 'tropicalNightTemperature':
                         return terraforming.temperature?.zones?.tropical?.night >= objective.value;
                    case 'tropicalDayTemperature':
                         return terraforming.temperature?.zones?.tropical?.day >= objective.value;
                    case 'pressure':
                         return terraforming.calculateTotalPressure() > objective.value;
                    // ... etc
                 }
                 return false; // Default for terraforming if parameter not matched
           case 'currentPlanet':
                if (typeof spaceManager !== 'undefined' &&
                    typeof spaceManager.getCurrentPlanetKey === 'function') {
                    return spaceManager.getCurrentPlanetKey() === objective.planetId;
                }
                return false;
           case 'project':
                 if (typeof projectManager !== 'undefined' && projectManager.projects) {
                     const proj = projectManager.projects[objective.projectId];
                     return proj ? proj.repeatCount >= objective.repeatCount : false;
                 }
                 return false;
           default:
                console.error(`Unknown objective type: ${objective.type}`);
                return false;
       }
   }

    // Convert an objective object into a progress string
    describeObjective(objective) {
        if (!objective) return '';
        const format = typeof formatNumber === 'function' ? formatNumber : (n => n);
        switch (objective.type) {
            case 'collection': {
                const resCat = resources[objective.resourceType] || {};
                const resObj = resCat[objective.resource] || {};
                const current = resObj.value || 0;
                const name = resObj.displayName || objective.resource;
                return `${name}: ${format(Math.floor(current), true)}/${format(objective.quantity, true)}`;
            }
            case 'building': {
                const b = buildings[objective.buildingName];
                const current = b ? b.count : 0;
                const name = b ? b.displayName : objective.buildingName;
                return `${name}: ${format(current, true)}/${format(objective.quantity, true)}`;
            }
            case 'colony': {
                const c = colonies[objective.buildingName];
                const current = c ? c.count : 0;
                const name = c ? c.displayName : objective.buildingName;
                return `${name}: ${format(current, true)}/${format(objective.quantity, true)}`;
            }
           case 'terraforming': {
                if (!terraforming) return '';
                let current = 0;
                const names = {
                    tropicalTemperature: 'Equatorial Temp',
                    tropicalNightTemperature: 'Equatorial Night Temp',
                    tropicalDayTemperature: 'Equatorial Day Temp',
                    pressure: 'Atmospheric Pressure',
                    complete: 'All Terraforming Parameters Stable'
                };
                switch (objective.terraformingParameter) {
                    case 'tropicalTemperature':
                        current = terraforming.temperature?.zones?.tropical?.value || 0;
                        break;
                    case 'tropicalNightTemperature':
                        current = terraforming.temperature?.zones?.tropical?.night || 0;
                        break;
                    case 'tropicalDayTemperature':
                        current = terraforming.temperature?.zones?.tropical?.day || 0;
                        break;
                    case 'pressure':
                        current = terraforming.calculateTotalPressure ? terraforming.calculateTotalPressure() : 0;
                        break;
                    case 'complete':
                        return names.complete;
                    default:
                        return '';
                }
                const name = names[objective.terraformingParameter] || objective.terraformingParameter;
               return `${name}: ${format(current, false, 2)}/${format(objective.value, false, 2)}`;
           }
            case 'project': {
                if (typeof projectManager !== 'undefined' && projectManager.projects) {
                    const proj = projectManager.projects[objective.projectId];
                    const current = proj ? proj.repeatCount : 0;
                    const name = proj ? proj.displayName : objective.projectId;
                    return `${name}: ${format(current, true)}/${format(objective.repeatCount, true)}`;
                }
                return '';
            }
           default:
                return '';
       }
   }

    // Determine the first incomplete objective from active events
    getCurrentObjectiveText() {
        for (const id of this.activeEventIds) {
            const ev = this.findEventById(id);
            if (!ev || !ev.objectives) continue;
            for (const obj of ev.objectives) {
                if (!this.isObjectiveComplete(obj)) {
                    return this.describeObjective(obj);
                }
            }
        }
        return '';
    }

    updateCurrentObjectiveUI() {
        if (typeof document === 'undefined') return;
        const el = document.getElementById('current-objective');
        if (!el) return;
        const text = this.getCurrentObjectiveText();
        el.textContent = text ? `Objective: ${text}` : '';
    }

    applyRewards(event) { // Keep as is
        if (!event || !event.reward || event.reward.length === 0) {
            return;
        }
        const delay = event.rewardDelay || 0;
        let effectiveIndex = 0; // Use separate index for delay timing if filtering rewards

        event.reward.forEach((effect) => {
            if (effect && effect.type) {
                setTimeout(() => {
                    if (!window.storyManager) {
                        console.warn("StoryManager gone, skipping delayed reward application.");
                        return;
                    }
                    if (!effect.oneTimeFlag) {
                        this.appliedEffects.push(effect);
                    }
                    addEffect(effect);
                    console.log(`Applied reward for ${event.id}: ${effect.type}`);
                }, effectiveIndex * delay);
                effectiveIndex++;
            } else {
                console.warn(`Skipping invalid reward object for event ${event.id}:`, effect);
            }
        });
    }

    // Reapply stored effects to newly created game objects. Used when
    // resetting the game state while keeping the existing story progress.
    reapplyEffects() {
        const uniqueEffectsToApply = new Map();
        this.appliedEffects.forEach(effect => {
            const effectKey = JSON.stringify(effect);
            if (!effect.oneTimeFlag) {
                uniqueEffectsToApply.set(effectKey, effect);
            }
        });
        uniqueEffectsToApply.forEach(effect => {
            addEffect(effect);
        });
    }

    // Jump directly to a chapter by id, applying rewards of previous chapters
    // without triggering their journal entries. This allows moving backward or
    // forward in the story for debugging.
    jumpToChapter(chapterId) {
        const index = progressData.chapters.findIndex(ch => ch.id === chapterId);
        if (index === -1) {
            console.warn(`Chapter not found: ${chapterId}`);
            return;
        }

        // Reset current state
        this.activeEventIds.clear();
        this.completedEventIds.clear();
        this.waitingForJournalEventId = null;

        // Remove previously applied effects
        this.appliedEffects.forEach(effect => removeEffect(effect));
        this.appliedEffects = [];

        clearJournal();

        // Apply rewards from earlier chapters so game state roughly matches
        for (let i = 0; i < index; i++) {
            const cfg = progressData.chapters[i];
            const ev = this.findEventById(cfg.id);
            if (!ev) continue;
            if (ev.special === 'clearJournal') {
                clearJournal();
            }
            if (ev.reward && ev.reward.length > 0) {
                ev.reward.forEach(effect => {
                    if (!effect.oneTimeFlag) {
                        this.appliedEffects.push(effect);
                    }
                    addEffect(effect);
                });
            }
            this.completedEventIds.add(ev.id);
        }

        const targetEvent = this.findEventById(chapterId);
        if (targetEvent) {
            if (targetEvent.special === 'clearJournal') {
                clearJournal();
            }
            this.activeEventIds.add(targetEvent.id);
            targetEvent.trigger();
        }
    }

    saveState() { // Keep as is
        const state = {
            activeEventIds: Array.from(this.activeEventIds),
            completedEventIds: Array.from(this.completedEventIds),
            appliedEffects: this.appliedEffects,
             // Save waiting state too!
            waitingForJournalEventId: this.waitingForJournalEventId
        };
        // console.log("Saving StoryManager state:", JSON.stringify(state));
        return state;
    }

    loadState(savedState) { // Add loading for waiting state
        console.log("StoryManager.loadState received:", savedState);
        if (!savedState) {
            console.warn("StoryManager.loadState called with null/undefined state.");
            return;
        }

        this.activeEventIds = new Set(savedState.activeEventIds || []);
        this.completedEventIds = new Set(savedState.completedEventIds || []);
        this.waitingForJournalEventId = savedState.waitingForJournalEventId || null; // <<< Load waiting state

        // ... (rest of loadState for effects) ...
         this.appliedEffects = savedState.appliedEffects || [];
         // Re-applying effects logic remains...
         const uniqueEffectsToApply = new Map();
         this.appliedEffects.forEach(effect => {
             const effectKey = JSON.stringify(effect);
             if (!effect.oneTimeFlag) { uniqueEffectsToApply.set(effectKey, effect); }
         });
         uniqueEffectsToApply.forEach(effect => {
             addEffect(effect);
             // console.log(`Reapplied effect on load: ${effect.type} to ${effect.targetId}`);
         });


        console.log(`StoryManager state loaded. Active: [${Array.from(this.activeEventIds).join(', ')}], Completed: [${Array.from(this.completedEventIds).join(', ')}], Waiting: ${this.waitingForJournalEventId}`);

        // If loading while waiting for a journal event, the typing animation
        // will not resume. Immediately finalize the event so any rewards are
        // applied without delay.
        if (this.waitingForJournalEventId !== null) {
            const pendingId = this.waitingForJournalEventId;
            this.waitingForJournalEventId = null;

            if (this.activeEventIds.has(pendingId)) {
                console.warn(`Loaded game while waiting for journal event ${pendingId}. Completing it immediately.`);
                this.processEventCompletion(pendingId);
            } else {
                console.warn(`Loaded waiting event ${pendingId}, but it is no longer active.`);
            }
        }

    }
}

// StoryEvent class remains the same
class StoryEvent {
    constructor(config) {
        this.id = config.id;
        this.type = config.type;
        this.parameters = config.parameters || {};
        this.title = config.title || '';
        this.narrative = config.narrative || '';
        this.objectives = config.objectives || [];
        this.nextChapter = config.nextChapter || null; // Still useful for auto-prerequisites
        this.reward = config.reward || [];
        this.rewardDelay = config.rewardDelay || 0;
        this.special = config.special || null;
        this.prerequisites = config.prerequisites || [];
    }

    trigger() { // Keep as is
        switch (this.type) {
            case "pop-up":
                createPopup(
                    this.parameters.title,
                    this.parameters.text,
                    this.parameters.buttonText
                );
                break;
            case "journal":
                 if (this.title) {
                    addJournalEntry(`${this.title}:\n${this.narrative}`, this.id); // Combine if title exists
                 } else {
                    addJournalEntry(this.narrative, this.id);
                 }
                break;
            default:
                console.error(`Unknown event type: ${this.type}`);
        }
    }
}

// Expose jumpToChapter for browser console use
if (typeof module !== 'undefined' && module.exports) {
    // Node environment (tests) - export StoryManager class
    module.exports = { StoryManager };
} else {
    globalThis.jumpToChapter = function(id) {
        if (window.storyManager && typeof window.storyManager.jumpToChapter === 'function') {
            window.storyManager.jumpToChapter(id);
        } else {
            console.warn('storyManager not initialized');
        }
    };
}