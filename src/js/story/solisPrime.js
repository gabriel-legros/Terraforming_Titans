var progressSolisPrime = { chapters: [], storyProjects: {} };

/* -------------------------------------------------
 *  SOLIS PRIME STORY ARC
 * -------------------------------------------------*/

progressSolisPrime.chapters.push(
  {
    id: 'solisPrime.1',
    type: 'journal',
    chapter: 30,
    title: 'Solis Prime: Foundation',
    narrative: "System Briefing: Solis Prime colonists need stable footing before we scale population targets.",
    prerequisites: [],
    objectives: [],
    reward: []
  },
  {
    id: 'solisPrime.1a',
    type: 'journal',
    chapter: 30,
    narrative: 'Stabilize the first wave of settlers.',
    prerequisites: ['solisPrime.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.1b',
    type: 'journal',
    chapter: 30,
    narrative: 'Bring early logistics online for a modest colony.',
    prerequisites: ['solisPrime.1a'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.1c',
    type: 'journal',
    chapter: 30,
    narrative: 'Hold course as growth hits a hundred colonists.',
    prerequisites: ['solisPrime.1b'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.1d',
    type: 'journal',
    chapter: 30,
    narrative: 'Ramp services to support five hundred citizens.',
    prerequisites: ['solisPrime.1c'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.1e',
    type: 'journal',
    chapter: 30,
    narrative: 'Keep morale steady with a thousand residents.',
    prerequisites: ['solisPrime.1d'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.1f',
    type: 'journal',
    chapter: 30,
    narrative: 'Anchor infrastructure for five thousand colonists.',
    prerequisites: ['solisPrime.1e'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.2',
    type: 'journal',
    chapter: 31,
    title: 'Solis Prime: Expansion',
    narrative: "Directive: Expand logistics for mid-tier population waves while keeping morale stable.",
    prerequisites: ['solisPrime.1f'],
    objectives: [],
    reward: []
  },
  {
    id: 'solisPrime.2a',
    type: 'journal',
    chapter: 31,
    narrative: 'Scale housing to match the first five-digit population surge.',
    prerequisites: ['solisPrime.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.2b',
    type: 'journal',
    chapter: 31,
    narrative: 'Tune transit and supply chains for fifty thousand residents.',
    prerequisites: ['solisPrime.2a'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.2c',
    type: 'journal',
    chapter: 31,
    narrative: 'Lock in stability at one hundred thousand colonists.',
    prerequisites: ['solisPrime.2b'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.2d',
    type: 'journal',
    chapter: 31,
    narrative: 'Stress-test the grid at half a million population.',
    prerequisites: ['solisPrime.2c'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.2e',
    type: 'journal',
    chapter: 31,
    narrative: 'Manage morale as the colony reaches a million settlers.',
    prerequisites: ['solisPrime.2d'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1000000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.2f',
    type: 'journal',
    chapter: 31,
    narrative: 'Maintain continuity at five million colonists.',
    prerequisites: ['solisPrime.2e'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5000000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.3',
    type: 'journal',
    chapter: 32,
    title: 'Solis Prime: Ascension',
    narrative: "Finalize megacity protocols as the colony crosses late-stage population thresholds.",
    prerequisites: ['solisPrime.2f'],
    objectives: [],
    reward: []
  },
  {
    id: 'solisPrime.3a',
    type: 'journal',
    chapter: 32,
    narrative: 'Harden megacity protocols for ten million people.',
    prerequisites: ['solisPrime.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10000000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.3b',
    type: 'journal',
    chapter: 32,
    narrative: 'Expand orbital lifts and transit for fifty million citizens.',
    prerequisites: ['solisPrime.3a'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50000000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.3c',
    type: 'journal',
    chapter: 32,
    narrative: 'Stabilize services with a hundred million colonists online.',
    prerequisites: ['solisPrime.3b'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100000000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.3d',
    type: 'journal',
    chapter: 32,
    narrative: 'Protect throughput at half a billion population.',
    prerequisites: ['solisPrime.3c'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500000000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.3e',
    type: 'journal',
    chapter: 32,
    narrative: 'Finalize interplanetary support for a billion inhabitants.',
    prerequisites: ['solisPrime.3d'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1000000000 }
    ],
    reward: []
  }
);

if (typeof module !== 'undefined') {
  module.exports = progressSolisPrime;
}
