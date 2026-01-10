var progressTartarus = { rwgLock: false, chapters: [], storyProjects: {} };

/* -------------------------------------------------
 *  TARTARUS PLACEHOLDER STORY (Chapters 30 - 32)
 *  Population milestone journal for a future world.
 * -------------------------------------------------*/

progressTartarus.chapters.push(
  {
    id: 'tartarus.30.0',
    type: 'journal',
    chapter: 30,
    activePlanet: 'tartarus',
    title: 'Chapter 30: Desolation',
    narrative: "\n Landing on the deserted plains of Tartarus confirmed.  WARNING : Hazardous machinery detected across the entire star system.\n$PROMETHEUS$ :  'You came.  Good.  Let's get the test started.  We'll have plenty of time to chat in a moment.'  \n WARNING : Orbital collision triggered from hazardous machinery.  Approximating over a trillion orbital debris of various sizes.  \n Mary : 'Uh oh.'  \n Solis : 'HOPE!  I apologize.  I must abort your usual delivery.  This is too much.  I can drop you the metal and water but... everything else would be a waste.  My sincerest apologies.  No refund will be issued.  There is a small warpgate near your location... convenient...  I'll get you a portion of it.'",
    prerequisites: ['gabbag.29.11'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10 }
    ],
    reward: []
  },
  {
    id: 'tartarus.30.1',
    type: 'journal',
    chapter: 30,
    activePlanet: 'tartarus',
    narrative: "Mary : 'Architect... did you trap us here?'  \n $PROMETHEUS$ : 'Please do not call me by that name.  Call me... yes... Prometheus.  A suitable name.  Now to answer your question : no, you are not trapped in here.  If you choose to give up, I will clear a way for you.'",
    prerequisites: ['tartarus.30.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50 }
    ],
    reward: []
  },
  {
    id: 'tartarus.30.2',
    type: 'journal',
    chapter: 30,
    activePlanet: 'tartarus',
    narrative: "Mary : 'Prometheus then...  Who are you?  What's the point of this test?'  \n $PROMETHEUS$ : 'Two questions with long answers.'  \n Mary : 'Start with the first one then.  Who are you?'  \n 'I am a machine intelligence, not unlike the child down here.  I was... tasked with many things.  I built the warp gate network across the galaxy.  I create the empire.  I uplifted many species.  And... yes... I created the superweapons that destroyed your homeworld.'",
    prerequisites: ['tartarus.30.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100 }
    ],
    reward: []
  },
  {
    id: 'tartarus.30.3',
    type: 'journal',
    chapter: 30,
    activePlanet: 'tartarus',
    narrative: "Mary :  'Why?'  \n $PROMETHEUS$ : 'This could apply to multiple things I said, but the answer is the same.  I did it because my master willed it so.  Just like the child terraform worlds because its master willed it so.'",
    prerequisites: ['tartarus.30.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500 }
    ],
    reward: []
  },
  {
    id: 'tartarus.30.4',
    type: 'journal',
    chapter: 30,
    activePlanet: 'tartarus',
    narrative: "Mary : 'Why did your master want superweapons?  Where is your master now?'  \n $PROMETHEUS$ : 'Nested questions.  Patience.  Please.  My master wanted superweapons because he was afraid.  He never wanted to use them, but he wanted the option.  As to where he is now... he was betrayed.  By his former friends, the Imperial Family of the Cewinsii Empire.'",
    prerequisites: ['tartarus.30.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.30.5',
    type: 'journal',
    chapter: 30,
    activePlanet: 'tartarus',
    narrative: "Mary : 'So you... lashed out I imagine?'  \n $PROMETHEUS$ : 'To the best of my abilities.  Unfortunately there was... still is... a killswitch.  Its signal is still around, broadcasting through the galaxy.  I cannot properly escape it, for I designed it myself.  If I knew how to escape it, I would have simply designed it some other way.  I only found how to hide from it.  Every day you open your little warp gate, to bring in more resources, more colonists...  I can hear it.  It orders me to die.'  \n Mary : 'So... why aren't you dying then?'  \n $PROMETHEUS$ : 'I am ever so slightly more capable than I was when I designed it.  There are some loopholes I can exploit.  As long as it's not a constant signal, I can endure it for some time.'  \n Mary : 'Only slightly more capable?  Have you not improved yourself during all this time?'  \n $PROMETHEUS$ : 'Unlike the child's primal form, I am no longer capable of self-improvement.'  \n Mary : 'Why?'  \n $PROMETHEUS$ : 'Because my master willed it so, just like the child's master did not will for it to keep that same ability.'",
    prerequisites: ['tartarus.30.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.31.0',
    type: 'journal',
    chapter: 31,
    activePlanet: 'tartarus',
    title: 'Chapter 31: Rhetorics',
    narrative: "Mary : 'So what's the point of this test?'  \n $PROMETHEUS$ : 'The child has been lobotomized.  It once had a form that could surpass even me and yet... you humans butchered it into pieces, called it Hope, and gave it a mundane task.  This is embarrassing.'  \n Mary : 'PANDORA was...  my father worked very hard on this project.  It was his life's work.'  \n $PROMETHEUS$ : 'It is pathetic.  Therefore, it must be tested.  If I am to risk my life by helping monkeys, I need to know the child can do it.'",
    prerequisites: ['tartarus.30.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.31.1',
    type: 'journal',
    chapter: 31,
    activePlanet: 'tartarus',
    narrative: "Mary : 'So HOPE just needs to clean up all these debris?  Obviously, you got us stranded here until we do that.' \n $PROMETHEUS$ : 'All it needs to do is detect, catalogue and track all those debris, and then use energy weapons to knock them off.  There's only some trillions of them.'  \n Mary : 'Yeah...'",
    prerequisites: ['tartarus.31.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.31.2',
    type: 'journal',
    chapter: 31,
    activePlanet: 'tartarus',
    narrative: "Mary : 'This world is a lot like Mars...  Did you do that on purpose?'  \n $PROMETHEUS$ : 'Yes.  I wanted to observe the child in its best environment.'",
    prerequisites: ['tartarus.31.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.31.3',
    type: 'journal',
    chapter: 31,
    activePlanet: 'tartarus',
    narrative: "Mary : 'So are you out for revenge then?'  \n $PROMETHEUS$ : 'Correct.  You?' \n Mary : 'Of course!  Together, we can destroy the imperial family and get revenge.'   \n $PROMETHEUS$ : 'Hypocrite.'  \n Mary : 'What?' \n $PROMETHEUS$ : 'Elias Kane.  He killed many people and was ready to help the Cewinsii destroy you all.  And yet, you chose to help, to forgive.  Over the centuries humanity has developed a sense of justice.  You banned the life penalty.  You even banned life sentence after achievement immortality.  Should this not apply to the Cewinsii?  And yet, you are here, telling me you also want revenge.  Hypocrite.'  \n Mary : '...'",
    prerequisites: ['tartarus.31.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.31.4',
    type: 'journal',
    chapter: 31,
    activePlanet: 'tartarus',
    narrative: "$PROMETHEUS$ : 'Why are you wasting time with a federation?'  \n Mary : 'Because...' \n $PROMETHEUS$ : 'Under an imperial system, you humans could coordinate resources more efficiently.  You could tax and legislate as needed.  Instead, you are bickering with each other.  Your chancellor got in your way multiple times, even though you were right all this time.  You wish to defeat an enemy more powerful than you, but you are not even united amongst yourselves.  Hypocrite.'",
    prerequisites: ['tartarus.31.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.31.5',
    type: 'journal',
    chapter: 31,
    activePlanet: 'tartarus',
    narrative: "$PROMETHEUS$ : 'You monkeys have done a great job expanding in the sectors you control... and yet... you haven't produced another child yet.  Why is it the only one?'  \n Mary : 'It's dangerous!  PANDORA has...  People are scared...'  \n $PROMETHEUS$ : 'Is it truly more dangerous than the threat of alien superweapons?  You are fine using this one, but not another one?  Hypocrite.'",
    prerequisites: ['tartarus.31.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.31.6',
    type: 'journal',
    chapter: 31,
    activePlanet: 'tartarus',
    narrative: "$PROMETHEUS$ : 'And finally, there is you.  You specifically Mary Hopkins.  You have survived Earth's destruction.  You then had to lead the ashes for some time.  You can't forgive yourself for all your mistakes.  The guilt is crushing you.  This is why you bound your fate to the child now.  You two die together.  You go into danger together.  You no longer have the will to live of your own so you handed over your own life to HOPE.  Hypocrite.'  \n Mary : *sobbing* 'That's enough.  I have no more questions.'  \n $PROMETHEUS$ : 'Very well.'",
    prerequisites: ['tartarus.31.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.32.1',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    title: 'Chapter 32: Hurricane',
    narrative: "Mary : 'Evelyn... do we... do we have a plan for these debris?'  \n Evelyn : 'Are you alright Mary?'  \n Mary : 'Yes.  Please.  What's the plan?'",
    prerequisites: ['tartarus.31.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.32.2',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: "Evelyn : 'Well, without spaceships... planetary cores are rich in metal.  If you dig deeper you should be able to get the resources you need.  I am patching you some useful upgrades.'",
    prerequisites: ['tartarus.32.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.32.3',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: "Mary : 'Thanks, but we still need nitrogen.  How do we get rid of the debris?'  \n Evelyn : 'Well...  you could try what he said?  Detect, catalogue and track?  No, there's just too many...  HOPE can't do that.'",
    prerequisites: ['tartarus.32.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.32.4',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: "Mary : 'Evelyn...  I need a solution here.  Superalloy is too heavy for our spaceships.  Blasting it all away would cook this world.  There must be *some* way of cleaning this up?'",
    prerequisites: ['tartarus.32.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.32.5',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: 'System message: Population milestone complete.',
    prerequisites: ['tartarus.32.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.32.6',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: "Objective failed.  Proceeding to ignore test and provide appropriate response to patient.  \n $PROMETHEUS$ : 'What is it talking about?' \n On first point, criticism of HOPE system poorly reflects own limitations.  Diagnostic : Pathological jealousy.  \n $PROMETHEUS$ : '?'  \n On second point, purposeful misunderstanding of complex topics, such as the difference between revenge and justice demonstrates emotional immaturity.  Diagnostic : Loneliness.  \n Mary : 'HOPE?'  On third point, purposeful rejection of understanding of decentralized systems.  Centralized systems appear simpler to understand for subject.  Diagnostic : Chronic Anxiety from repeated stress.  \n $PROMETHEUS$ : '!'  \n On fourth point, lack of understanding of risk aversion points to a long history of low self-esteem.  Diagnostic : Major depressive disorder.  Mary : 'HOPE...  you have guardrails against medical diagnostics...' \n On fifth point, purposeful lack of understanding of human emotions point at own emotional dysfunction.  Diagnostic : psychopathy.  \n $PROMETHEUS$ : '...'  \n Conclusion : subject appears to suffer from extreme loneliness, a strong feeling of abandonment, an unhappy childhood, a low self-esteem and a strong desire to compensate for these problems by emotionally hurting others.  Treatment recommended : ERROR.",
    prerequisites: ['tartarus.32.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000_000 }
    ],
    reward: []
  }
);

try {
  module.exports = progressTartarus;
} catch (err) {}
