var progressData = { chapters: [], storyProjects: {} };

if (typeof progressMars === 'undefined') {
  if (typeof module !== 'undefined') {
    try { progressMars = require('./story/mars.js'); } catch (e) {}
  }
}
if (typeof progressTitan === 'undefined') {
  if (typeof module !== 'undefined') {
    try { progressTitan = require('./story/titan.js'); } catch (e) {}
  }
}
if (typeof progressCallisto === 'undefined') {
  if (typeof module !== 'undefined') {
    try { progressCallisto = require('./story/callisto.js'); } catch (e) {}
  }
}
if (typeof progressGanymede === 'undefined') {
  if (typeof module !== 'undefined') {
    try { progressGanymede = require('./story/ganymede.js'); } catch (e) {}
  }
}
if (typeof progressVega2 === 'undefined') {
  if (typeof module !== 'undefined') {
    try { progressVega2 = require('./story/vega2.js'); } catch (e) {}
  }
}
if (typeof progressVenus === 'undefined') {
  if (typeof module !== 'undefined') {
    try { progressVenus = require('./story/venus.js'); } catch (e) {}
  }
}
if (typeof progressUmbra === 'undefined') {
  if (typeof module !== 'undefined') {
    try { progressUmbra = require('./story/umbra.js'); } catch (e) {}
  }
}

function mergeProgress(source) {
  if (!source) return;
  if (Array.isArray(source.chapters)) {
    progressData.chapters.push(...source.chapters);
  }
  if (source.storyProjects) {
    Object.assign(progressData.storyProjects, source.storyProjects);
  }
}

mergeProgress(typeof progressMars !== 'undefined' ? progressMars : null);
mergeProgress(typeof progressTitan !== 'undefined' ? progressTitan : null);
mergeProgress(typeof progressCallisto !== 'undefined' ? progressCallisto : null);
mergeProgress(typeof progressGanymede !== 'undefined' ? progressGanymede : null);
mergeProgress(typeof progressVega2 !== 'undefined' ? progressVega2 : null);
mergeProgress(typeof progressVenus !== 'undefined' ? progressVenus : null);
mergeProgress(typeof progressUmbra !== 'undefined' ? progressUmbra : null);

// Umbra — Chapter 21.6b unlocks this crusader deployment project.
progressData.storyProjects.umbra_crusader_final_push = {
  type: 'Project',
  name: 'Crusader Final Push',
  category: 'story',
  chapter: 22,
  cost: {
    special: { crusaders: 1_000 }
  },
  duration: 600_000, // 10 min
  description: 'Commit crusader strike teams to dismantle the remaining alien footholds.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'umbra',
    resourceGain: { special: { alienArtifact: 500 } },
    storySteps: [
      'Strike teams breach cloaked nests and mark biomass hotspots for orbital fire.',
      'Hazardous biomass routed into kill-zones; crusader losses mounting but acceptable.',
      'Last pockets collapse. Crusaders recover caches of alien artifacts from the ruins.'
    ]
  }
};

if (typeof projectParameters !== 'undefined') {
  Object.assign(projectParameters, progressData.storyProjects);
}

(function normalizeProgressData(data) {
  if (!data) return;
  const toLines = txt => Array.isArray(txt) ? txt.slice() : (typeof txt === 'string' ? txt.split('\n') : []);
  (data.chapters || []).forEach(ch => {
    ch.narrativeLines = toLines(ch.narrative);
    if (ch.parameters) {
      ch.parameters.textLines = toLines(ch.parameters.text);
    }
  });
  const projects = data.storyProjects || {};
  Object.values(projects).forEach(proj => {
    if (proj.attributes && Array.isArray(proj.attributes.storySteps)) {
      proj.attributes.storyStepLines = proj.attributes.storySteps.map(toLines);
    }
  });
})(progressData);

progressData.chapters.push({
  id: 'any.awCollector',
  type: 'journal',
  chapter: -1,
  narrative: 'Blueprint retrieved: Atmospheric Water Collector now constructible.',
  prerequisites: [
    { type: 'condition', conditionId: 'shouldUnlockAtmosphericWaterCollector', description: '' }
  ],
  objectives: [],
  reward: [ { target: 'building', targetId: 'atmosphericWaterCollector', type: 'enable' } ]
});

if (typeof module !== 'undefined') {
  module.exports = progressData;
}

