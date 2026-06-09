(function(){
  function joinLines(text){
    return Array.isArray(text) ? text.join('\n') : text;
  }
  function reconstructJournalState(sm, pm, data = progressData, updateJournal = true) {
    const entries = [];
    const sources = [];
    const historyEntries = [];
    const historySources = [];
    if (!sm || !data) return { entries, sources, historyEntries, historySources };

    const resolve = typeof resolveStoryPlaceholders === 'function'
      ? resolveStoryPlaceholders
      : (t => t);

    const completedIds = sm.completedEventIds instanceof Set ? Array.from(sm.completedEventIds) : sm.completedEventIds || [];
    const activeIds = sm.activeEventIds instanceof Set ? Array.from(sm.activeEventIds) : sm.activeEventIds || [];
    if (gameCompleted) {
      for (let i = 0; i < data.chapters.length; i++) {
        const ch = data.chapters[i];
        completedIds.push(ch.id);
        if (ch.id === 'earth.50.9') {
          break;
        }
      }
    }
    const completedOnly = new Set(completedIds);
    const completed = new Set([
      ...completedIds,
      ...activeIds
    ]);

    const projects = pm && pm.projects ? pm.projects : {};
    const storyProjects = data.storyProjects || {};
    const projectStepProgress = new Map();

    let currentChapter = null;
    data.chapters.forEach(ch => {
      if (completed.has(ch.id)) {
        if (ch.chapter === -1) return; // Skip any-chapter events
        if (currentChapter === null || ch.chapter !== currentChapter) {
          currentChapter = ch.chapter;
          entries.length = 0;
          sources.length = 0;
        }
        const lines = ch.narrativeLines || [ch.narrative];
        const textRaw = ch.title ? joinLines([`${ch.title}:`, ...lines]) : joinLines(lines);
        const text = textRaw != null ? resolve(textRaw) : textRaw;
        if (text != null) {
          entries.push(text);
          sources.push({ type: 'chapter', id: ch.id });
          historyEntries.push(text);
          historySources.push({ type: 'chapter', id: ch.id });
        }
        if (ch.objectives) {
          ch.objectives.forEach(obj => {
            if (obj.type === 'project') {
              const proj = projects[obj.projectId] || {};
              if (typeof proj.getJournalObjectiveSteps === 'function') {
                const assumeCompleted = completedOnly.has(ch.id);
                const steps = proj.getJournalObjectiveSteps({
                  repeatCount: obj.repeatCount || 0,
                  assumeCompleted
                });
                const needed = steps.length;
                const targetCount = assumeCompleted ? Math.min(needed, steps.length) : Math.min(steps.length, needed);
                const projName = storyProjects[obj.projectId]?.name;
                const total = proj.getJournalStepTotal ? proj.getJournalStepTotal() : steps.length;
                const completedCount = projectStepProgress.get(obj.projectId) || 0;
                for (let i = completedCount; i < targetCount; i++) {
                  const stepEntry = steps[i];
                  const stepText = stepEntry && stepEntry.text != null ? stepEntry.text : stepEntry;
                  if (stepText != null) {
                    let textStr = joinLines(stepText);
                    if (projName) {
                      const stepLabel = stepEntry && stepEntry.stepLabel ? stepEntry.stepLabel : `${i + 1}/${total}`;
                      textStr = `${projName} ${stepLabel}: ${textStr}`;
                    }
                    textStr = resolve(textStr);
                    entries.push(textStr);
                    const source = {
                      type: 'project',
                      id: obj.projectId,
                      step: stepEntry && stepEntry.sourceStep != null ? stepEntry.sourceStep : i
                    };
                    if (stepEntry && stepEntry.stepLabel) {
                      source.stepLabel = stepEntry.stepLabel;
                    }
                    if (stepEntry && stepEntry.branchId) {
                      source.branchId = stepEntry.branchId;
                    }
                    sources.push(source);
                    historyEntries.push(textStr);
                    historySources.push(source);
                  }
                }
                projectStepProgress.set(obj.projectId, Math.max(completedCount, targetCount));
                return;
              }
              const projectAttributes = storyProjects[obj.projectId]?.attributes || {};
              const steps = projectAttributes.formattedStoryStepLines || projectAttributes.formattedStorySteps || projectAttributes.storyStepLines || projectAttributes.storySteps || [];
              const needed = obj.repeatCount || steps.length;
              const repeat = proj.repeatCount || 0;
              const assumeCompleted = completedOnly.has(ch.id);
              const targetCount = assumeCompleted ? Math.min(needed, steps.length) : Math.min(repeat, needed, steps.length);
              const projName = storyProjects[obj.projectId]?.name;
              const total = storyProjects[obj.projectId]?.attributes?.storySteps?.length || steps.length;
              const completedCount = projectStepProgress.get(obj.projectId) || 0;
              for (let i = completedCount; i < targetCount; i++) {
                const stepText = steps[i];
                if (stepText != null) {
                  let textStr = joinLines(stepText);
                  if (projName) {
                    textStr = `${projName} ${i + 1}/${total}: ${textStr}`;
                  }
                  textStr = resolve(textStr);
                  entries.push(textStr);
                  sources.push({ type: 'project', id: obj.projectId, step: i });
                  historyEntries.push(textStr);
                  historySources.push({ type: 'project', id: obj.projectId, step: i });
                }
              }
              projectStepProgress.set(obj.projectId, Math.max(completedCount, targetCount));
            }
          });
        }
      }
    });

    if (updateJournal && typeof loadJournalEntries === 'function') {
      loadJournalEntries(entries, historyEntries, sources, historySources);
    }

    return { entries, sources, historyEntries, historySources };
  }

  try {
    module.exports = reconstructJournalState;
  } catch (err) {
    window.reconstructJournalState = reconstructJournalState;
  }
})();
