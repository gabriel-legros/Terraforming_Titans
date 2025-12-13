var progressGabbag = { rwgLock: false, chapters: [], storyProjects: {} };

/* -------------------------------------------------
 *  GABBAG PLACEHOLDER STORY (Chapters 27 - 29)
 *  Population milestone journal for a future world.
 * -------------------------------------------------*/

progressGabbag.chapters.push(
  {
    id: 'gabbag.27.0',
    type: 'journal',
    chapter: 27,
    activePlanet: 'gabbag',
    title: 'Chapter 27: Placeholder Landing',
    narrative: "System log: Placeholder world Gabbag registered. Sustain ten colonists to prove the site is viable.",
    prerequisites: ['solisPrime.3h'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10 }
    ],
    reward: []
  },
  {
    id: 'gabbag.27.1',
    type: 'journal',
    chapter: 27,
    activePlanet: 'gabbag',
    narrative: "Status: first habitats filled. Push to fifty colonists to map stable ground.",
    prerequisites: ['gabbag.27.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50 }
    ],
    reward: []
  },
  {
    id: 'gabbag.27.2',
    type: 'journal',
    chapter: 27,
    activePlanet: 'gabbag',
    narrative: "Checkpoint: one hundred colonists. Expand corridors and keep redundancy simple.",
    prerequisites: ['gabbag.27.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100 }
    ],
    reward: []
  },
  {
    id: 'gabbag.27.3',
    type: 'journal',
    chapter: 27,
    activePlanet: 'gabbag',
    narrative: "Five hundred colonists on-site. Log supply latency and tighten routing.",
    prerequisites: ['gabbag.27.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500 }
    ],
    reward: []
  },
  {
    id: 'gabbag.27.4',
    type: 'journal',
    chapter: 27,
    activePlanet: 'gabbag',
    narrative: "One thousand colonists triggered baseline services. Verify throughput before scaling again.",
    prerequisites: ['gabbag.27.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.27.5',
    type: 'journal',
    chapter: 27,
    activePlanet: 'gabbag',
    narrative: "Five thousand colonists mark the end of the first surge. Prepare for dense habitation.",
    prerequisites: ['gabbag.27.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000 }
    ],
    reward: []
  },

  {
    id: 'gabbag.28.0',
    type: 'journal',
    chapter: 28,
    activePlanet: 'gabbag',
    title: 'Chapter 28: Growing Blocks',
    narrative: "Ten thousand colonists needed to lay out the first formal blocks.",
    prerequisites: ['gabbag.27.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.28.1',
    type: 'journal',
    chapter: 28,
    activePlanet: 'gabbag',
    narrative: "Fifty thousand colonists will stress-test transit lanes and clinics.",
    prerequisites: ['gabbag.28.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.28.2',
    type: 'journal',
    chapter: 28,
    activePlanet: 'gabbag',
    narrative: "One hundred thousand colonists: draft proper districting maps.",
    prerequisites: ['gabbag.28.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.28.3',
    type: 'journal',
    chapter: 28,
    activePlanet: 'gabbag',
    narrative: "Five hundred thousand colonists call for inter-district redundancies.",
    prerequisites: ['gabbag.28.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.28.4',
    type: 'journal',
    chapter: 28,
    activePlanet: 'gabbag',
    narrative: "One million colonists anchor the second chapter. Keep morale steady.",
    prerequisites: ['gabbag.28.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.28.5',
    type: 'journal',
    chapter: 28,
    activePlanet: 'gabbag',
    narrative: "Five million colonists complete the mid-scale target set.",
    prerequisites: ['gabbag.28.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000 }
    ],
    reward: []
  },

  {
    id: 'gabbag.29.0',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    title: 'Chapter 29: Megacity Draft',
    narrative: "Ten million colonists open the megacity playbook for Gabbag.",
    prerequisites: ['gabbag.28.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.1',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "Fifty million colonists: compress freight, expand services.",
    prerequisites: ['gabbag.29.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.2',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "One hundred million colonists set the tone for the skyline.",
    prerequisites: ['gabbag.29.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.3',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "Five hundred million colonists demand precision logistics across the crust.",
    prerequisites: ['gabbag.29.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.4',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "One billion colonists logged. Keep the expansion stable and modular.",
    prerequisites: ['gabbag.29.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.5',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "Five billion colonists cap the placeholder arc. Future directives will build on this density.",
    prerequisites: ['gabbag.29.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000_000 }
    ],
    reward: []
  }
);

if (typeof module !== 'undefined') {
  module.exports = progressGabbag;
}
