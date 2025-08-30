// progress.js (contains StoryManager)

function getChapterNumber(id) {
    const m = /^chapter(\d+)/.exec(id);
    return m ? parseInt(m[1], 10) : null;
}

function joinLines(text) {
    return Array.isArray(text) ? text.join('\n') : text;
}

function getWGCTeamLeaderName(index) {
    try {
        const leader = warpGateCommand.teams[index][0];
        const first = leader.firstName;
        const last = leader.lastName ? ` ${leader.lastName}` : '';
        const name = first ? first + last : '';
        return name || `Team Leader ${index + 1}`;
    } catch {
        return `Team Leader ${index + 1}`;
    }
}

function resolveStoryPlaceholders(text) {
    return text.replace(/\$WGC_TEAM1_LEADER\$/g, getWGCTeamLeaderName(0));
}

function compareValues(current, target, comparison = 'gte') {
    switch (comparison) {
        case 'gt':
            return current > target;
        case 'lt':
            return current < target;
        case 'lte':
            return current <= target;
        case 'gte':
        default:
            return current >= target;
    }
}

class StoryManager {
    constructor(progressData) {
        this.progressData = progressData;
        this.allEvents = this.loadEvents(progressData);
        this.activeEventIds = new Set();
        this.completedEventIds = new Set();
        this.appliedEffects = [];
        this.waitingForJournalEventId = null; // <<< NEW: Track the ID of the journal event we're waiting for
        this.currentChapter = null;

        // --- Add event listener for journal completion ---
        document.addEventListener('storyJournalFinishedTyping', this.handleJournalFinished.bind(this));
        console.log("StoryManager initialized and listening for storyJournalFinishedTyping.");
    }

    // --- NEW: Event handler for journal completion ---
    handleJournalFinished(e) {
        const finishedId = e && e.detail ? e.detail.eventId : null;
        if (!finishedId) {
            return;
        } // Ignore events without a specific ID

        // Only process this event if it corresponds to a known chapter event
        // that the story manager is actively waiting for. This prevents
        // journal entries from other systems (like story projects) from
        // prematurely completing a chapter.
        if (this.allEvents.has(finishedId) && this.waitingForJournalEventId === finishedId) {
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
            if (previousEvent) {
                 if (!event.prerequisites) {
                      event.prerequisites = [];
                 }
                 const already = event.prerequisites.some(p =>
                      (typeof p === 'string' && p === previousEvent.id) ||
                      (p && typeof p === 'object' && p.id === previousEvent.id)
                 );
                 if (!already) {
                      console.log(`Auto-adding prerequisite: ${previousEvent.id} for event ${event.id}`);
                      event.prerequisites.push(previousEvent.id);
                 }
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
        // If a pop-up is active or the journal is busy typing, pause all story progression.
        if ((typeof window !== 'undefined' && window.popupActive) || (typeof journalTyping !== 'undefined' && journalTyping)) {
            return;
        }

        // 1. Check completion conditions for currently active events
        const eventsToComplete = [];
        for (const eventId of this.activeEventIds) {
            const event = this.findEventById(eventId);
            if (event && this.checkObjectives(event)) {
                // For journal events without other objectives, we need to ensure they have had a chance
                // to trigger their typing animation before we complete them in this same tick.
                // We add a 'completedThisTick' flag to handle this.
                if (event.type === 'journal' && (!event.objectives || event.objectives.length === 0)) {
                    if (event.completedThisTick) {
                        // If the flag is already set, it means we've waited a tick, so it's safe to complete.
                        eventsToComplete.push(eventId);
                        delete event.completedThisTick; // Clean up the flag
                    } else {
                        // If the flag is not set, we set it and wait for the next tick.
                        // This gives the journal time to start typing.
                        event.completedThisTick = true;
                    }
                } else {
                    // For all other events, complete them immediately if objectives are met.
                    eventsToComplete.push(eventId);
                }
            }
        }

        // 2. Process completions
        for (const eventId of eventsToComplete) {
            this.processEventCompletion(eventId);
        }

        // 3. Check activation conditions for inactive events
        for (const [eventId, event] of this.allEvents.entries()) {
            if (!this.activeEventIds.has(eventId) && !this.completedEventIds.has(eventId)) {
                if (this.checkActivationConditions(event)) {
                    this.activateEvent(event);
                }
            }
        }

        // 4. Update the displayed objective after processing events
        this.updateCurrentObjectiveUI();
    }

    activateEvent(event) { // Keep as is
        if (!event || this.activeEventIds.has(event.id) || this.completedEventIds.has(event.id)) {
            return;
        }
        const eventChapter = event.chapter;
        let chapterChanged = false;

        // Chapter -1 indicates the event should not change the current chapter
        if (eventChapter !== -1) {
            if (this.currentChapter === null) {
                this.currentChapter = eventChapter;
            } else if (eventChapter > this.currentChapter) {
                clearJournal();
                this.currentChapter = eventChapter;
                chapterChanged = true;
            }
        }
        console.log(`Activating event: ${event.id}`);
        if (!event.activePlanet && typeof spaceManager !== 'undefined' && typeof spaceManager.getCurrentPlanetKey === 'function') {
            event.activePlanet = spaceManager.getCurrentPlanetKey();
        }
        this.activeEventIds.add(event.id);
        event.trigger(); // Calls addJournalEntry if it's a journal type
    }

    checkActivationConditions(event) { // extended to support typed prerequisites
         if (!event) return false;
         if (event.prerequisites && event.prerequisites.length > 0) {
             const allPrereqsMet = event.prerequisites.every(pr => this.isPrerequisiteMet(pr, event));
             return allPrereqsMet;
         }
         return true;
     }

    isPrerequisiteMet(prereq, event = null) {
        if (typeof prereq === 'string') {
            return this.completedEventIds.has(prereq);
        }
        if (!prereq || typeof prereq !== 'object') return false;
        if (prereq.type === 'event' && prereq.id) {
            return this.completedEventIds.has(prereq.id);
        }
        return this.isObjectiveComplete(prereq, event);
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
            return this.isObjectiveComplete(objective, event);
        });
    }

    isObjectiveComplete(objective, event = null) { // Keep as is but allow event context
       // ... (your existing logic) ...
        switch (objective.type) {
            case 'collection':
                // Check if the target resource exists before accessing value
                const resourceCategory = resources[objective.resourceType];
                if (!resourceCategory || !resourceCategory[objective.resource]) {
                    console.error(`Resource check failed: ${objective.resourceType}.${objective.resource} not found.`);
                    return false;
                }
                return compareValues(resourceCategory[objective.resource].value, objective.quantity, objective.comparison);
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
                            const planet = objective.planetId || (event && event.activePlanet) || spaceManager.getCurrentPlanetKey();
                            return spaceManager.isPlanetTerraformed(planet);
                        }
                        return false;
                    case 'tropicalTemperature':
                         return compareValues(terraforming.temperature?.zones?.tropical?.value || 0, objective.value, objective.comparison);
                    case 'tropicalNightTemperature':
                         return compareValues(terraforming.temperature?.zones?.tropical?.night || 0, objective.value, objective.comparison);
                    case 'tropicalDayTemperature':
                         return compareValues(terraforming.temperature?.zones?.tropical?.day || 0, objective.value, objective.comparison);
                    case 'pressure':
                         return compareValues(terraforming.calculateTotalPressure(), objective.value, objective.comparison);
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
          case 'solisPoints':
               if (typeof solisManager !== 'undefined') {
                   return solisManager.solisPoints >= (objective.points || 0);
               }
               return false;
          case 'condition': {
               const fn = globalThis[objective.conditionId];
               if (typeof fn === 'function') {
                   try {
                       return fn();
                   } catch (e) {
                       console.error('Condition function threw', e);
                       return false;
                   }
               }
               console.warn(`Condition function not found: ${objective.conditionId}`);
               return false;
          }
          case 'wgcHighestDifficulty': {
               if (typeof warpGateCommand !== 'undefined') {
                    const current = warpGateCommand.highestDifficulty;
                    return compareValues(current, objective.difficulty || 0, objective.comparison);
               }
               return false;
          }
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
                const isTemp = ['tropicalTemperature','tropicalNightTemperature','tropicalDayTemperature'].includes(objective.terraformingParameter);
                if (isTemp && typeof toDisplayTemperature === 'function' && typeof getTemperatureUnit === 'function') {
                    const unit = getTemperatureUnit();
                    const currentDisp = format(toDisplayTemperature(current), false, 2);
                    const targetDisp = format(toDisplayTemperature(objective.value), false, 2);
                    return `${name}: ${currentDisp}${unit}/${targetDisp}${unit}`;
                }

                if (objective.terraformingParameter === 'pressure') {
                    const currentDisp = format(current, false, 2);
                    const targetDisp = format(objective.value, false, 2);
                    return `${name}: ${currentDisp} kPa/${targetDisp} kPa`;
                }

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
          case 'currentPlanet': {
                let name = objective.planetId || '';
                if (typeof planetParameters !== 'undefined' && planetParameters[name] && planetParameters[name].name) {
                    name = planetParameters[name].name;
                } else if (name) {
                    name = name.charAt(0).toUpperCase() + name.slice(1);
                }
                const current = (typeof spaceManager !== 'undefined' && typeof spaceManager.getCurrentPlanetKey === 'function')
                    ? spaceManager.getCurrentPlanetKey()
                    : null;
                if (current === objective.planetId) {
                    return `Currently on ${name}`;
                }
                return `Travel to ${name}`;
          }
          case 'solisPoints': {
               const current = solisManager ? solisManager.solisPoints || 0 : 0;
               return `Solis Points: ${format(current, true)}/${format(objective.points, true)}`;
           }
          case 'condition': {
               return objective.description || '';
          }
          case 'wgcHighestDifficulty': {
               const current = typeof warpGateCommand !== 'undefined'
                    ? warpGateCommand.highestDifficulty : -1;
               const target = objective.difficulty || 0;
               const dispCurrent = Math.max(0, current);
               return `Complete an Operation of Difficulty ${format(target, true)} (Highest Completed: ${format(dispCurrent, true)})`;
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
                if (!this.isObjectiveComplete(obj, ev)) {
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
    // without triggering their journal entries. Also marks required special
    // projects as completed and reconstructs the journal instantly.
    jumpToChapter(chapterId) {
        const targetEvent = this.findEventById(chapterId);
        if (!targetEvent) {
            console.warn(`Chapter not found: ${chapterId}`);
            return;
        }

        // Gather all prerequisite chapters recursively, including handling
        // project prerequisites as we discover them.
        const completedChapterIds = new Set();
        const handleProjectObjective = (obj) => {
            if (!obj || obj.type !== 'project') return;
            if (typeof projectManager !== 'undefined' && projectManager.projects) {
                const proj = projectManager.projects[obj.projectId];
                if (proj) {
                    proj.unlocked = true;
                    proj.repeatCount = Math.max(proj.repeatCount || 0, obj.repeatCount || 1);
                    proj.isCompleted = true;
                }
            }
        };

        const collectPrereqs = (eventId) => {
            const ev = this.findEventById(eventId);
            if (!ev || completedChapterIds.has(ev.id)) return;
            completedChapterIds.add(ev.id);

            if (ev.prerequisites) {
                ev.prerequisites.forEach(pr => {
                    if (typeof pr === 'string') {
                        collectPrereqs(pr);
                    } else if (pr && typeof pr === 'object') {
                        if (pr.type === 'event' && pr.id) {
                            collectPrereqs(pr.id);
                        } else {
                            handleProjectObjective(pr);
                        }
                    }
                });
            }
        };

        collectPrereqs(chapterId);
        completedChapterIds.delete(chapterId); // target should not be auto-completed

        // Reset state
        this.activeEventIds.clear();
        this.completedEventIds.clear();
        this.waitingForJournalEventId = null;
        clearJournal();

        // Remove all previously applied effects
        this.appliedEffects.forEach(effect => removeEffect(effect));
        this.appliedEffects = [];

        // Re-apply rewards and mark project objectives for completed chapters
        this.progressData.chapters.forEach(cfg => {
            if (completedChapterIds.has(cfg.id)) {
                const ev = this.findEventById(cfg.id);
                if (!ev) return;
                this.completedEventIds.add(ev.id);

                if (ev.objectives) {
                    ev.objectives.forEach(handleProjectObjective);
                }

                if (ev.reward && ev.reward.length > 0) {
                    ev.reward.forEach(effect => {
                        if (!effect.oneTimeFlag) {
                            this.appliedEffects.push(effect);
                        }
                        addEffect(effect);
                    });
                }
            }
        });

        // Ensure project prerequisites of the target itself are fulfilled
        if (targetEvent.prerequisites) {
            targetEvent.prerequisites.forEach(handleProjectObjective);
        }

        console.log(`Jumping to ${chapterId}. Required completed chapters:`, Array.from(completedChapterIds));
        this.activateEvent(targetEvent);

        this.updateCurrentObjectiveUI();

        if (typeof reconstructJournalState === 'function') {
            reconstructJournalState(this, projectManager);
        }
    }

    saveState() { // Keep as is
        const state = {
            activeEventIds: Array.from(this.activeEventIds),
            completedEventIds: Array.from(this.completedEventIds),
            appliedEffects: this.appliedEffects,
            currentChapter: this.currentChapter,
             // Save waiting state too!
            waitingForJournalEventId: this.waitingForJournalEventId,
            activeEventPlanets: {}
        };
        this.activeEventIds.forEach(id => {
            const ev = this.findEventById(id);
            if (ev && ev.activePlanet) {
                state.activeEventPlanets[id] = ev.activePlanet;
            }
        });
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
        this.currentChapter = savedState.currentChapter || 0;

        const activePlanets = savedState.activeEventPlanets || {};
        Object.keys(activePlanets).forEach(id => {
            const ev = this.findEventById(id);
            if (ev) ev.activePlanet = activePlanets[id];
        });

        // ... (rest of loadState for effects) ...
         this.appliedEffects = savedState.appliedEffects || [];
         // Re-applying effects logic remains...
         const uniqueEffectsToApply = new Map();
         this.appliedEffects.forEach(effect => {
             const effectKey = JSON.stringify(effect);
             if (!effect.oneTimeFlag) { uniqueEffectsToApply.set(effectKey, effect); }
         });

         // Ensure completed chapter rewards are applied even if not saved
         this.completedEventIds.forEach(eventId => {
             const event = this.findEventById(eventId);
             if (!event || event.type !== 'journal' || !Array.isArray(event.reward)) return;
             event.reward.forEach(effect => {
                 if (effect && !effect.oneTimeFlag) {
                     const effectKey = JSON.stringify(effect);
                     if (!uniqueEffectsToApply.has(effectKey)) {
                         uniqueEffectsToApply.set(effectKey, effect);
                         this.appliedEffects.push(effect);
                     }
                 }
             });
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

// StoryEvent class
class StoryEvent {
    constructor(config) {
        this.id = config.id;
        this.chapter = config.chapter !== undefined ? config.chapter : getChapterNumber(config.id);
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

    // Check if this event should skip journal entry due to being on an outdated chapter
    shouldSkipJournalForOutdatedChapter() {
        // Chapter -1 should always show journal entries
        if (this.chapter === -1) {
            return false;
        }

        // Check if StoryManager exists and has currentChapter
        if (!window.storyManager || window.storyManager.currentChapter === null) {
            return false;
        }

        // Skip journal entry if this event's chapter is less than current chapter
        return this.chapter < window.storyManager.currentChapter;
    }

    trigger() { // Modified to skip journal entries for outdated chapters
        switch (this.type) {
            case "pop-up":
                createPopup(
                    this.parameters.title,
                    joinLines(this.parameters.text),
                    this.parameters.buttonText
                );
                break;
            case "system-pop-up":
                createSystemPopup(
                    this.parameters.title,
                    joinLines(this.parameters.text),
                    this.parameters.buttonText
                );
                break;
            case "journal":
                 // Check if this event is on an outdated chapter (except -1)
                 const shouldSkipJournal = this.shouldSkipJournalForOutdatedChapter();
                 if (shouldSkipJournal) {
                     console.log(`Skipping journal entry for outdated chapter event: ${this.id} (chapter ${this.chapter}, current: ${window.storyManager?.currentChapter})`);
                     // Mark event as completed immediately since no journal typing is needed
                     if (window.storyManager && window.storyManager.activeEventIds.has(this.id)) {
                         window.storyManager.processEventCompletion(this.id);
                     }
                     break;
                 }

                 const raw = joinLines(this.narrative);
                 const text = resolveStoryPlaceholders(raw);
                 if (this.title) {
                    addJournalEntry([`${this.title}`, text], this.id, { type: 'chapter', id: this.id });
                 } else {
                    addJournalEntry(text, this.id, { type: 'chapter', id: this.id });
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