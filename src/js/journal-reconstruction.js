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

    const completed = new Set([
      ...(sm.completedEventIds instanceof Set ? Array.from(sm.completedEventIds) : sm.completedEventIds || []),
      ...(sm.activeEventIds instanceof Set ? Array.from(sm.activeEventIds) : sm.activeEventIds || [])
    ]);

    const projects = pm && pm.projects ? pm.projects : {};
    const storyProjects = data.storyProjects || {};

    let currentChapter = null;
    data.chapters.forEach(ch => {
      if (completed.has(ch.id)) {
        if (currentChapter === null || ch.chapter !== currentChapter) {
          currentChapter = ch.chapter;
          entries.length = 0;
          sources.length = 0;
        }
        const lines = ch.narrativeLines || [ch.narrative];
        const text = ch.title ? joinLines([`${ch.title}:`, ...lines]) : joinLines(lines);
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
              const repeat = proj.repeatCount || 0;
              const steps = storyProjects[obj.projectId]?.attributes?.storyStepLines || storyProjects[obj.projectId]?.attributes?.storySteps || [];
              const needed = obj.repeatCount || steps.length;
              const count = Math.min(repeat, needed, steps.length);
              for (let i = 0; i < count; i++) {
                const stepText = steps[i];
                if (stepText != null) {
                  const textStr = joinLines(stepText);
                  entries.push(textStr);
                  sources.push({ type: 'project', id: obj.projectId, step: i });
                  historyEntries.push(textStr);
                  historySources.push({ type: 'project', id: obj.projectId, step: i });
                }
              }
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

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = reconstructJournalState;
  } else {
    globalThis.reconstructJournalState = reconstructJournalState;
  }
})();
