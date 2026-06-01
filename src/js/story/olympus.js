var progressOlympus = { chapters: [], storyProjects: {} };

progressOlympus.storyProjects.olympus_field_workshop = {
  type: 'OlympusFieldWorkshopProject',
  name: '',
  category: 'story',
  cost: {},
  duration: 0,
  description: '',
  repeatable: false,
  unlocked: false,
  attributes: {
    planet: 'olympus'
  }
};

/* -------------------------------------------------
 *  OLYMPUS PLACEHOLDER STORY (Chapters 46 - 49)
 * -------------------------------------------------*/

progressOlympus.chapters.push(
  {
    id: 'olympus.46.0',
    type: 'pop-up',
    chapter: 46,
    activePlanet: 'olympus',
    title: '',
    narrative: '',
    prerequisites: ['zeus.45.19'],
    objectives: [],
    parameters: {
      "title": "Olympus",
      "text": "Mary : 'So this is an Alderson Disk? Prometheus... you really outdid yourself there. It's so... beautiful. So much better than your weapons.'\n<span style=\"color: #ff4d4d;\">Prometheus : 'Thank you.'</span>\nMary : 'Alright HOPE, this is where we are heading. Let's not act suspicious.'\n<span style=\"color: #ff4d4d;\">Prometheus : '... Wait. Hold on. Something is wrong. HOPE! PULL BACK!'</span>\nMary : 'What?'\nSLAAAAAAARM\nCritical structural damage detected.\nMary : 'Hnnng.'\n<span style=\"color: #ff4d4d;\">Prometheus : 'HOPE! That was a big hit. You've lost 2 thrusters! We're going to crash! Set T3 to 57%. 51%. 62%. Dangit! Too slow.'</span>\nMary : 'Whaat... my head...'\n<span style=\"color: #ff4d4d;\">Prometheus : 'T1 to 71%, no 70%... 81%...'</span>\nMary : 'We're... going to crash.'\n<span style=\"color: #ff4d4d;\">Prometheus : 'MARY GET IN A SUIT NOW'</span>\nMary : '... I... can't... The g-forces...'\n<span style=\"color: #ff4d4d;\">Prometheus : 'HOPE stay focused you're spinning too much! T3 back to 52%.'</span>\nMary : 'HOPE... be... good...'",
      "buttonText": 'CRAAAAAAAASSSSSSHHHHHHHHHH'
    },
    reward: [
    ]
  },
  {
    id: 'olympus.46.1',
    type: 'journal',
    chapter: 46,
    activePlanet: 'olympus',
    title: 'Chapter 46 : Rock Bottom',
    narrative: '',
    prerequisites: ['olympus.46.0'],
    objectives: [],
    reward: []
  }
);

try {
  module.exports = progressOlympus;
} catch (err) {}
