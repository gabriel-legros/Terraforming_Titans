const DAGON_SCENES = [
  'contact', 'antimatter', 'tachyon', 'retaliation', 'split',
  'spectrum', 'counter', 'catalogue', 'preparation', 'strike', 'aftermath'
];

const progressDagon = { chapters: [
  { id: 'chapterA.0', title: '', narrative: '', prerequisites: [{ type: 'dagonState', state: 'started' }], objectives: [] },
  { id: 'chapterA.reboot', type: 'pop-up', parameters: {
    title: '', text: '', buttonText: '',
    onClose: () => revealDagonOnGalaxyMap()
  }, prerequisites: ['chapterA.0'], objectives: [] },
  { id: 'chapterA.1', narrative: '', prerequisites: ['chapterA.reboot'], objectives: [{ type: 'galaxySectorControl', sectorLabel: 'R4-05' }] },
  { id: 'chapterA.2', narrative: '', prerequisites: ['chapterA.1'], objectives: [{ type: 'dagonState', state: 'prometheusRepaired' }] },
  { id: 'chapterA.3', narrative: '', prerequisites: ['chapterA.2'], objectives: [] },
  ...Array.from({ length: 5 }, (_, index) => ({
    id: `chapterA.tentacles${index + 1}`, narrative: '',
    prerequisites: [index === 0 ? 'chapterA.3' : `chapterA.tentacles${index}`],
    objectives: [{ type: 'dagonTentacles', count: index + 1 }]
  })),
  { id: 'chapterA.4', narrative: '', prerequisites: ['chapterA.tentacles5'], objectives: [{ type: 'dagonState', state: 'tentaclesSevered' }, { type: 'galaxySectorControl', sectorLabel: 'R3-13' }] },
  { id: 'chapterA.5', narrative: '', prerequisites: ['chapterA.4'], objectives: [{ type: 'dagonState', state: 'completed' }] },
  { id: 'chapterA.6', narrative: '', prerequisites: ['chapterA.5'], objectives: [] }
].map(event => ({ type: 'journal', chapter: 51, branch: 'dagon', reward: [], ...event })) };

progressData.chapters.push(...progressDagon.chapters);
