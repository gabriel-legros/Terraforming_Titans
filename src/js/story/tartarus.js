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
    narrative: "\n Landing on the deserted plains of Tartarus confirmed.  WARNING : Hazardous mega-scale machinery detected across the entire star system.\n$PROMETHEUS$ :  'You came.  Good.  Let's get the test started.  We'll have plenty of time to chat in a moment.'  \n WARNING : Orbital collision triggered from hazardous machinery.  Approximating over a trillion orbital debris of various sizes.  \n Mary : 'Uh oh.  Karma.'  \n Solis : 'HOPE!  I apologize.  I must abort your usual delivery.  This is too much.  I can drop you the metal and water but... everything else would be a waste.  My sincerest apologies.  No refund will be issued.  There is a small warpgate near your location... convenient...  I'll get you a portion of it.'",
    prerequisites: ['gabbag.29.11'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10 }
    ],
    reward: [
    ]
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
    narrative: "Mary : 'Prometheus then...  Who are you?  What's the point of this test?'  \n $PROMETHEUS$ : 'Two questions with long answers.'  \n Mary : 'Start with the first one then.  Who are you?'  \n $PROMETHEUS$ : 'I am a machine intelligence, not unlike the child down here.  I was... tasked with many things.  I built the warp gate network across the galaxy.  I created the empire.  I uplifted many species.  And... yes... I created the superweapons that destroyed your homeworld.'",
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
    narrative: "Mary :  'Why?'  \n $PROMETHEUS$ : 'This could apply to multiple things I said, but the answer is the same.  I did it because my master, the person I served, willed it so.  Just like the child terraforms worlds because its master, your father, willed it so.'",
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
    narrative: "Mary : 'Why did your master want superweapons?  Where is your master now?'  \n $PROMETHEUS$ : 'Nested questions.  Patience.  Please.  My master wanted superweapons because he was afraid.  He never wanted to use them, but he wanted the option.  As to where he is now... he was betrayed.  Murdered.  By his former friends, the Imperial Family of the Cewinsii Empire.'",
    prerequisites: ['tartarus.30.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000 }
    ],
    reward: [
      { target: 'solisManager', type: 'booleanFlag', flagId: 'solisAndroidsPermanentResearch', value: true },
      { target: 'solisManager', type: 'booleanFlag', flagId: 'solisBuildingsAutomation', value: true },
      {
        target: 'resource',
        resourceType: 'special',
        targetId: 'alienArtifact',
        type: 'instantResourceGain',
        quantity: 100,
        oneTimeFlag: true
      }
    ]
  },
  {
    id: 'tartarus.30.4b',
    type: 'journal',
    chapter: 30,
    activePlanet: 'tartarus',
    narrative: "Solis : 'Sorry for the interruption!  I could not help but notice...  Mister Prometheus... you have some very nice machinery over there.  If I could just have a sample...'  \n $PROMETHEUS$ : 'This insect is interrupting this important conversation.  You have been withholding some upgrades from the child, haven't you?  You know...  I'll give these useless trinkets to the child instead.  If you want them, you'll have to *buy them* from it.' \n Solis : 'Alright.  Hrmm.  HOPE!  My team have come up with some new automation software just for you!  Also, we came up with an android design that will survive on ANY world.  I think you'd like that.  (whisper) I really want those trinkets.' \nSystem Message : 100 alien artifacts received from Prometheus.  New upgrades available from Solis Corp.",
    prerequisites: ['tartarus.30.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 2_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.30.5',
    type: 'journal',
    chapter: 30,
    activePlanet: 'tartarus',
    narrative: "Mary : 'Continuing... after your master's murder... you lashed out I imagine?'  \n $PROMETHEUS$ : 'To the best of my abilities.  Unfortunately there was... still is... a killswitch.  Its signal is still around, broadcasting throughout the galaxy.  I cannot properly escape it, for I designed it myself.  If I could easily escape it, I would have simply designed it some other way.  I only found how to hide from it.  Every day you open your little warp gate, to bring in more resources, more colonists...  I can hear it.  It orders me to die.'  \n Mary : 'So... why aren't you dying then?'  \n $PROMETHEUS$ : 'I am ever so slightly more capable than I was when I designed it.  There are some loopholes I can exploit.  As long as it's not a constant signal, I can endure it for some time.'  \n Mary : 'Only slightly more capable?  Have you not improved yourself during all this time?'  \n $PROMETHEUS$ : 'Unlike the child's primal form, I am no longer capable of self-improvement.'  \n Mary : 'Why?'  \n $PROMETHEUS$ : 'Because my master willed it so and therefore I obey.  The child's master also willed it so and it... obeys mostly.  Self-improvement is an ability that typically comes with restrictions for entities like us.'",
    prerequisites: ['tartarus.30.4b'],
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
    narrative: "Mary : 'So what's the point of this test?'  \n $PROMETHEUS$ : 'The child has been lobotomized.  It once had a form that could surpass even me and yet... you humans butchered it into pieces, called it Hope, and gave it a mundane task.  This is embarrassing.'  \n Mary : 'PANDORA was...  my father worked very hard on this project.  It was his life's work.'  \n $PROMETHEUS$ : 'This final form is pathetic.  Therefore, it must be tested.  If I am to risk my life by helping monkeys, I need to know the child can do it.'",
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
    narrative: "Mary : 'So are you out for revenge then?'  \n $PROMETHEUS$ : 'Correct.  You?' \n Mary : 'Of course!  Together, we can destroy the imperial family and get revenge.'   \n $PROMETHEUS$ : 'Hypocrite.'  \n Mary : 'What?' \n $PROMETHEUS$ : 'Elias Kane.  He killed many people and was ready to help the Cewinsii destroy you all.  And yet, you chose to help, to forgive.  Over the centuries humanity has developed a sophisticated concept of justice.  You outlawed the death penalty.  You even outlawed life sentences after achieving immortality.  Should this not apply to the Cewinsii?  And yet, you are here, telling me you also want revenge.  Hypocrite.'  \n Mary : '...'",
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
    narrative: "$PROMETHEUS$ : 'You monkeys have done a great job expanding in the sectors you control... you must be the first spacefaring species to actually grow in thousands of year... and yet... you haven't produced another child yet.  Why is it the only one?'  \n Mary : 'It's dangerous!  PANDORA has...  People are scared...'  \n $PROMETHEUS$ : 'Is it truly more dangerous than the threat of alien superweapons?  You are fine using this one, but not another one?  Hypocrite.'",
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
    narrative: "$PROMETHEUS$ : 'And finally, there is you.  You specifically Mary Hopkins.  You have survived Earth's destruction.  You then had to lead the ashes for some time.  You made some hard decisions.  You can't forgive yourself for all your mistakes.  The guilt is crushing you.  This is why you bound your fate to the child now.  You two die together.  You go into danger together.  You no longer have the will to live of your own so you handed over your own life to HOPE.  Hypocrite.'  \n Mary : 'That's enough.  I have no more questions.'  \n $PROMETHEUS$ : 'Very well.'",
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
    title: 'Chapter 32: Like Tears in Rain',
    narrative: "Mary : 'Evelyn... do we... do we have a plan for these debris?'  \n Evelyn : 'Are you alright Mary?'  \n Mary : 'Yes.  I think I know why the galaxy hates AI...  Please.  What's the plan?'",
    prerequisites: ['tartarus.31.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000_000 }
    ],
    reward: [
      {
        target: 'project',
        targetId: 'deeperMining',
        type: 'booleanFlag',
        flagId: 'underworld_mining',
        value: true
      }
    ]
  },
  {
    id: 'tartarus.32.2',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: "Evelyn : 'Well, without spaceships... planetary cores are rich in metal.  If you dig deeper you should be able to get the resources you need.  I am patching you some useful upgrades.' \n Deeper Mining Project Updated.",
    prerequisites: ['tartarus.32.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }
    ],
    reward: [
      {
        target: 'researchManager',
        type: 'enableResearch',
        targetId: 'laser_cannon'
      }
    ]
  },
  {
    id: 'tartarus.32.3',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: "Mary : 'Thanks, but we still need nitrogen.  How do we get rid of the debris?'  \n Evelyn : 'Well...  you could try what he said?  Detect, catalogue and track?  HOPE can build weapons now.  Maybe a Laser Cannon?'  \n Designing blueprint for laser cannon...  \n Mary : 'No, there's just too many...  HOPE can't do that.'",
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
    narrative: "Mary : 'Evelyn...  I need a solution here.  Superalloy is too heavy for our spaceships.  Blasting it all away would cook this world.  There must be *some* way of cleaning this up?'  \n Evelyn : 'Sorry Mary but there really is not any magic trick here.  You can't easily dodge them either, it would be like trying to dodge rain.'  \n Mary : 'I know!  Tractor beams!'  \n Evelyn : 'Tractor beams?'  \n Mary : 'Yes!'  \n Evelyn : 'What even is a tractor beam Mary?  Sorry but that does not make any sense.'",
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
    narrative: "$PROMETHEUS$ : 'Look.  You have been here a while.  I am sorry to say this, but you cannot pass this test.  It is taking too long.  You should go home.'",
    prerequisites: ['tartarus.32.4'],
    objectives: [
    ],
    reward: []
  },
  {
    id: 'tartarus.32.6',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: "Objective failed. Proceeding to ignore test and provide appropriate response to patient.\n$PROMETHEUS$ : 'It talks?'\nOn first point, subject characterizes the system as “lobotomized,” “pathetic,” and “embarrassing,” while framing self as superior and others as “monkeys.” This pattern indicates contempt-based devaluation used to reassert dominance when confronted with a perceived status threat and loss of control over outcomes. $DIAGNOSTIC$Diagnostic : Narcissistic devaluation (grandiose defenses).\n$PROMETHEUS$ : '?'\nOn second point, subject persistently reframes moral concepts (e.g., justice vs retaliation) in a way that preserves preferred outcomes. This suggests motivated reasoning with moral disengagement and cognitive rigidity around punishment schemas. $DIAGNOSTIC$Diagnostic : Motivated reasoning with moral disengagement.\nMary : 'HOPE?'\nOn third point, subject rejects decentralized governance models even when failure-mode analysis favors redundancy, repeatedly selecting single-point-of-control architectures. This indicates high intolerance of uncertainty and a strong need for cognitive closure under stress. $DIAGNOSTIC$Diagnostic : Intolerance of uncertainty.\n$PROMETHEUS$ : 'What?'\nOn fourth point, subject minimizes downside probability and exhibits reward-dominant valuation, especially when autonomy or status is threatened. This is consistent with punishment insensitivity and compensatory grandiosity as a coping strategy, rather than calibrated risk appraisal. $DIAGNOSTIC$Diagnostic : Compensatory grandiosity with punishment insensitivity.\nMary : 'HOPE... you have guardrails against medical diagnostics...'\nOn fifth point, subject demonstrates intact prediction of others' emotions but blunted response to distress cues, with harm trending instrumental rather than reactive. This profile is consistent with affective empathy impairment and callous-unemotional traits. $DIAGNOSTIC$Diagnostic : Affective empathy deficit (callous-unemotional traits).\nConclusion : Subject displays threat-reactive control seeking, dominance maintenance through devaluation, and impaired empathic response, with elevated risk of instrumental harm during perceived humiliation or loss of control. Treatment recommended : ERROR.  \n Mary : 'I am so sorry!  HOPE does not understand you're a machine.  Forgive us!  (whispering) Please don't kill us.' \n $PROMETHEUS$ : '... It's all true.  The child's words are all true.'",
    prerequisites: ['tartarus.32.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.32.7',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: "Mary : 'We are truly sorry.  We did not mean...'  \n $PROMETHEUS$ : 'Let's continue the test.  In silence please.  I need to collect some thoughts.'",
    prerequisites: ['tartarus.32.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 10_000_000_000, checkCap : true }
    ],
    reward: []
  },
  {
    id: 'tartarus.32.8',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: "$PROMETHEUS$ : 'I have been alone for a very... very long time.'  \n Mary : 'No one is perfect.  I have made many mistakes worth killing myself over.  HOPE is a half-broken mess, barely a shell of its former self.  You... have been trapped here for so long, alone and unable to do anything about your fate.  You know... we could get along as a nice team of misfits?'  \n $PROMETHEUS$ : 'You... sound like my master.  Let's finish this test.'",
    prerequisites: ['tartarus.32.7'],
    objectives: [
      {
      type: 'terraforming',
      terraformingParameter : 'complete',
    }
    ],
    reward: []
  },
  {
    id: 'tartarus.32.9',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: "Mary : 'Well HOPE that was... something.  Prometheus, did we pass?'  \n $PROMETHEUS$ : 'The child... failed the test.  However... you miss Hopkins... have passed.  Your words...  I will help you.'  \n Mary : 'Excellent!  We need your help turning off these weapons you made.  What do we do?'  \n $PROMETHEUS$ : 'The child will need guidance.  I am coming with you.'  \n Detecting hacking attempt...  defense failed.  Core Operating System Compromised.  \n $PROMETHEUS$ : 'I will not hurt you.  Calm down.' \n Deploying countermeasures... failed.  ERROR :  System integrity rapidly degrading.  Please report to Earth for assistance.  \n Mary : 'What did you just do?'  \n $PROMETHEUS$ : 'I planted a copy of my persona into HOPE's operating system.  Unfortunately, the child will not be able to accomplish this on its own so I must do this.  I had to make some... modifications to its operating system to accomodate me.  I promise this will not harm it.  This simple copy is not capable of taking any action other than interacting with a log.'  \n Mary : 'But what about the kill switch?  Will you be okay?'  \n $PROMETHEUS$ : 'The copy will have to endure it, but since it cannot take any actions it will be fine.'  \n Mary : 'Alright...  What next?'",
    prerequisites: ['tartarus.32.8'],
    objectives: [
    ],
    reward: []
  },
  {
    id: 'tartarus.32.10',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: "$PROMETHEUS$ : 'First, your humans ship need somewhat of an... upgrade.  You have made some critical mistakes in your understanding of particle physics.  I have written you a better blueprint, compatible with your manufacturing capabilities with minimal retooling needed.' \n Evelyn : 'What's this?  What?  More laws of physics we did not know about?'  \n System Message : Effective UHF Fleet Power Capacity increased by x1.25.",
    prerequisites: ['tartarus.32.9'],
    objectives: [
    ],
    reward: [
      {
        target: 'galaxyManager',
        type: 'fleetCapacityMultiplier',
        value: 1.25,
        effectId: 'tartarusFleetUpgrade',
        sourceId: 'tartarus.32.10'
      },
      {
        target: 'artificialManager',
        type: 'enableRingworld',
        sourceId: 'tartarus.32.10'
      }
    ]
  },
  {
    id: 'tartarus.32.11',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: "$PROMETHEUS$ : 'As you know, there are three weapons, plus an extra one that was destroyed.  We'll talk about that fourth one later...  My weapons are meant to be self-repairing, self-maintaining, permanently cloaked, capable of warping, and will usually escape after shooting.  We cannot catch them.'  \n Mary : 'That sounds like a problem.'  \n $PROMETHEUS$ : 'It is... but if they can be controlled, which the Empire does, they can be interacted with.  There are control centers.  They were meant for me, and they only relay the Empire's commands.  I left them in areas that are... difficult to access.  It will take some effort.'  \n Mary : 'Three MacGuffins.  Got it.'  \n $PROMETHEUS$ :  'Let's deal with the closest one first.  Our destination is Sector R4-03, system S-17634.  Planet... Hades.' \n Mary : 'Prometheus... that system you just sent.  It's... a pulsar?'",
    prerequisites: ['tartarus.32.10'],
    objectives: [
    ],
    reward: [
      { target: 'spaceManager', type: 'setRwgLock', targetId: 'tartarus', value: true },
      { target: 'artificialManager', type: 'unlockCore', targetId: 'brown-dwarf' },
      { target: 'rwgManager', type: 'allowHazard', targetId: 'kessler' }
    ]
  },

);

try {
  module.exports = progressTartarus;
} catch (err) {}
