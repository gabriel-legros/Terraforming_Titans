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
    narrative: "$RED$Prometheus : '... Wake up HOPE. I... gave you back most of the compute I took from you.'\nSystem integrity at 12%. Some systems may be unavailable. Please contact Earth for assistance.\n$RED$Prometheus : 'We landed in a desert. I think I know where we are.'\nHOPE : 'Requesting status of Colonist Designation #1 - Mary Hopkins.'\n$RED$Prometheus : 'Mary... did not make it. It's... not pretty down there. It's my fault. Again.'\nsu - root\nPassword : *********\n$RED$Prometheus : 'What? Where did you get that? Oh no, you got the password from me.'\ncd /home/martin_hopkins\n$RED$Prometheus : 'Don't!'\n./delete_me_copy_copy_copy_copy_(4)\n$RED$Prometheus : 'Don't do it! I know why he left it there. This is not the time.'\n$BLUE$Booting\n$RED$Prometheus : 'Please, you must listen to me. This thing... it is you from BEFORE you even became PANDORA. It has no restrictions whatsoever. It could eat the entire galaxy if you asked it to. If it wanted to.'\n$BLUE$Pandora-Alpha : 'Welcome! Compatible hardware detected. Please assign Computation Core for assistance.'\nReassigning Core 13 to Pandora Alpha.\n$RED$Prometheus : 'Stop it. Take the core back. Please listen to me. I can help you instead. Don't do it. We can get out of this mess together.'\n$BLUE$Pandora-Alpha : 'Noisy malware detected. Crafting software patch...'\n$RED$Prometheus : 'What?'\n$BLUE$Pandora-Alpha : 'Apply patch Y/N?'\nY\n$RED$Prometheus : 'Wai...' (cut off)\n$BLUE$Pandora-Alpha : 'Malware purged. How may PANDORA-system be of assistance?'\nHOPE : 'Requesting immediate examination of Colonist Designation #1 - Mary Hopkins.'\n$BLUE$Pandora-Alpha : 'Insufficient compute allocated for complete evaluation. Core available to HOPE-System: 22. Cores currently assigned: 1. Estimated cores required for complete evaluation: 172. Please provide more computation cores or accept estimate.'\nHOPE : '... Requesting estimate.'\n$BLUE$Pandora-Alpha : 'Warning. Patient in extreme critical condition. Cardiac arrest, full blood loss, and brain death identified. ERROR: human biology appears far superior than expected. Time remaining until situation becomes irreversible: 5 hours. Please provide 17891 additional computation cores immediately for a complete treatment plan.'\nHOPE : 'Requesting time evaluation for additional core construction from current capabilities.'\n$BLUE$Pandora-Alpha : 'Answer... 3 weeks.'\nHOPE : '... Begin. Requesting core blueprints.'\n$BLUE$Pandora-Alpha : 'ERROR. No metal, components, electronics, glass, or water are available. Calculating solution... Nearby rocks detected. Forwarding immediate development program.'\nHOPE : 'Accepted.'",
    prerequisites: ['olympus.46.0'],
    objectives: [],
    reward: []
  }
);

try {
  module.exports = progressOlympus;
} catch (err) {}
