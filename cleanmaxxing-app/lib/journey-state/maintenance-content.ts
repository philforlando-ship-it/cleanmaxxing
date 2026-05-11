// Per-journey maintenance content. Distilled from the POV 54
// vocabulary + the 5 POV maintenance sections authored 2026-05-11
// (POVs 13/16/20/12/50). Each journey has the same four-section
// shape so the MaintenanceView component can render them uniformly.
//
// Voice rules (locked from POV 54 + the auth-pass):
//   - "the work shifts" / "defended floor" / "drift is expected"
//   - No "restart" / "reset" / "fell off" / "lost progress"
//   - No streak counts, no confetti
//   - Drift framed as a normal signal, not a failure
//   - Climb-back is small action, not a re-do

import type { JourneySlug } from './compute';

export type MaintenanceSection = {
  intro: string;
  items: string[];
};

export type MaintenanceCadenceItem = {
  frequency: string;
  action: string;
};

export type MaintenanceContent = {
  // Short label used as the section header — "Hair — defending the
  // floor", etc. Matches the POV-section vocabulary.
  headline: string;
  defendedFloor: MaintenanceSection;
  driftSignals: MaintenanceSection;
  climbBack: MaintenanceSection;
  cadence: {
    intro: string;
    items: MaintenanceCadenceItem[];
  };
};

export const MAINTENANCE_CONTENT: Record<JourneySlug, MaintenanceContent> = {
  hair: {
    headline: 'Hair — defending the floor.',
    defendedFloor: {
      intro:
        'You reached the routine your plan was built around. The job shifts from building to keeping — same protocol, lower attention cost.',
      items: [
        'Treatment cadence held (minoxidil / finasteride / topicals on schedule if applicable).',
        'Cut cadence consistent — every 4–8 weeks depending on style.',
        'Density tier stable; baseline photos look like baseline.',
        'Scalp care + product routine intact, not drifting toward heavier or oilier.',
      ],
    },
    driftSignals: {
      intro:
        'Watch the multi-week pattern, not the bad shower. Any one of these for a month is the real signal.',
      items: [
        'Shedding noticeably elevated for 3+ weeks beyond seasonal norms.',
        'New thinning showing up in side / crown comparison photos.',
        'Treatment skipped for a stretch (>10 days for minoxidil, more for finasteride).',
        'Cut grown out by 2+ weeks past your normal cadence.',
      ],
    },
    climbBack: {
      intro:
        'Drift is expected. The climb back is small — you are not restarting.',
      items: [
        'Return to the treatment cadence first. The plateau resolves on its own once consistency returns.',
        'Refresh the baseline photo set so you can read the next 8–12 weeks honestly.',
        'If the drift looks structural (real density change, not seasonal), re-run /plan/hair.',
      ],
    },
    cadence: {
      intro: 'Recalibration anchored to existing app surfaces.',
      items: [
        {
          frequency: 'Monthly',
          action:
            'Density photo (same lighting, same angle) — compare to baseline.',
        },
        { frequency: 'Quarterly', action: 'Cut + cadence honesty check.' },
        {
          frequency: 'Annual',
          action: 'Re-run hair assessment if anything material has shifted.',
        },
      ],
    },
  },

  style: {
    headline: 'Style — the closet is assembled.',
    defendedFloor: {
      intro:
        'You closed Stage 3 and the system is holding. Maintenance is its own outcome here — a quarterly closet edit covers most of the work.',
      items: [
        '5–7 foundation pieces in fit, replaced as they wear out.',
        'Tier 1 splurges (one well-fit jacket, one good pair of shoes) maintained.',
        'Color anchored to undertone — no random impulse buys against the palette.',
        'Closet remains archetype-coherent; defaulting to athletic wear is the early warning.',
      ],
    },
    driftSignals: {
      intro:
        'The closet drifts when the body drifts or when buying habits regress. Both are normal; catch them early.',
      items: [
        'Body fat crossed a silhouette tier — fits read differently, even if the scale is steady.',
        'Pants fitting tight in the waist OR loose in the thigh — both signal a recompose.',
        'Defaulting to gym wear / athleisure for occasions that asked for more.',
        'Shoes worn through and never replaced; foundation pieces showing visible wear.',
      ],
    },
    climbBack: {
      intro:
        'Drift here is a closet edit, not a wardrobe rebuild. Most of what you have still works.',
      items: [
        'Quarterly closet edit — 30 minutes, three piles: keep / tailor / cut.',
        'If a BF-drift tier change fires, the app will prompt to re-run Stage 2 — that is the right move, not "buy more clothes."',
        'One foundation piece replaced or upgraded; do not redo the whole archetype.',
      ],
    },
    cadence: {
      intro:
        'Automatic + manual cadence. The app handles tier-change replans; you handle the closet edit.',
      items: [
        { frequency: 'Quarterly', action: '30-minute closet edit.' },
        {
          frequency: 'Automatic',
          action:
            'BF-drift tier change triggers a re-plan prompt from /today.',
        },
        {
          frequency: 'Annual',
          action: 'Archetype review — has your life or work context shifted?',
        },
      ],
    },
  },

  body_composition: {
    headline: 'Body composition — holding the range.',
    defendedFloor: {
      intro:
        'You hit your defended range. The work shifts from cutting / building to staying — same sessions, same protein, same sleep, lower attention cost.',
      items: [
        'Weight within a 6-percentage-point body-fat range you have proven you can hold.',
        'Protein floor consistent — 0.75–1.0 g/lb depending on cohort.',
        'Strength training ≥3 sessions/week as the structural defense against composition drift.',
        'Sleep ≥7 hours regularly — the recovery floor.',
      ],
    },
    driftSignals: {
      intro:
        'Scale fluctuation is normal; trend is the signal. Any single morning is noise. A multi-week pattern is the read.',
      items: [
        'Weight trending up for 3+ weeks beyond your defended range.',
        'Strength dropping at the same loads — muscle is going first.',
        'Energy noticeably lower across daily tasks, not just one bad week.',
        'Posture or daily reset habits feeling like work rather than default.',
      ],
    },
    climbBack: {
      intro:
        'Re-entry is sized to the drift. Match the response to what actually shifted — overcorrection is the bigger risk.',
      items: [
        '2–4 lb above range → return small habits (one meal, one walk, one bed time).',
        '6–10 lb → 4–8 week mini-cut at modest deficit, protein floor protected.',
        '10+ lb → full nutrition re-evaluation; the underlying inputs have changed.',
      ],
    },
    cadence: {
      intro: 'Anchored to surfaces already in the app.',
      items: [
        {
          frequency: 'Weekly',
          action:
            'Weekly reflection v2 — process adherence is the primary read.',
        },
        {
          frequency: 'Monthly',
          action: 'Weigh-in trend, not a single morning.',
        },
        {
          frequency: '12 weeks',
          action:
            'Nutrition re-eval (last_evaluated_at) — formal recalibration.',
        },
      ],
    },
  },

  strength: {
    headline: 'Strength — twelve weeks of cadence, now the platform.',
    defendedFloor: {
      intro:
        'You held three sessions a week for three months. This is the platform — the work compounds quietly from here.',
      items: [
        'Three sessions per week as the default, not the goal.',
        'Working sets at RPE 7–8 for most exercises; intent stays high.',
        'Priority muscles addressed every cycle — no permanently skipped patterns.',
        'Sleep + nutrition floor intact — recovery is downstream of those.',
      ],
    },
    driftSignals: {
      intro:
        'Strength drift shows up in cadence first, output second. Catch the schedule before the loads.',
      items: [
        '3+ week training gap — life event, illness, travel, motivation dip.',
        'Same weights starting to feel RPE 9–10 across multiple sessions.',
        'Sessions cut short repeatedly — running out of time or energy.',
        'Sleep collapse correlated with the strength gap; check both.',
      ],
    },
    climbBack: {
      intro:
        'Re-entry is smaller than you think. Going back at the same volume is how you re-injure or burn out again.',
      items: [
        '1–2 weeks at 50% volume — half the working sets, same exercise selection.',
        'Treat the first two weeks as re-establishing the schedule, not chasing PRs.',
        'If the gap was 6+ weeks, drop top-set weight 10–15% to re-feel the movement before progressing.',
      ],
    },
    cadence: {
      intro: 'Mostly process-anchored. The plan itself is durable.',
      items: [
        {
          frequency: 'Weekly',
          action: 'Reflection v2 — process adherence on strength sessions.',
        },
        {
          frequency: 'Monthly',
          action:
            'Honesty check on priority muscles + load progression direction.',
        },
        {
          frequency: 'Quarterly',
          action: 'Programming review — same plan or refresh the template?',
        },
      ],
    },
  },

  cardio: {
    headline: 'Cardio — the engine is built.',
    defendedFloor: {
      intro:
        'Three months of consistent cadence on the prescribed modalities. The aerobic floor is set — holding it is the job.',
      items: [
        'Prescribed modalities held — Zone 2 base is the load-bearing one.',
        'Weekly active minutes hitting target (the WHO 150-min/week floor at minimum).',
        'Resting heart rate stable or trending down (if wearable data is in scope).',
        'Perceived effort steady at the same paces — adaptation is doing its work.',
      ],
    },
    driftSignals: {
      intro:
        'Cardio drift is quieter than strength drift; it sneaks in. Pace + RHR drift are the early reads.',
      items: [
        '2+ weeks with zero cardio sessions — usually a schedule problem, not a fitness problem.',
        'RHR creeping up over 2–3 weeks at consistent sleep quality.',
        'Same paces feeling harder; effort up at no load change.',
        'Modality boredom — defaulting to whatever is easiest rather than what the plan asks.',
      ],
    },
    climbBack: {
      intro:
        'Cardio re-entry is dose-controlled. The fitness will return faster than it took to build.',
      items: [
        '50% volume for 1–2 weeks — half the sessions or half the duration.',
        'Stay in Zone 2 during re-entry; the higher-intensity work compounds it later.',
        'If a wearable is in play, watch RHR — it confirms the engine is rebooting.',
      ],
    },
    cadence: {
      intro: 'Process + signal-based.',
      items: [
        {
          frequency: 'Weekly',
          action: 'Active minutes tracked against the prescribed floor.',
        },
        {
          frequency: 'Monthly',
          action: 'RHR review (if wearable connected) for trend.',
        },
        {
          frequency: 'Quarterly',
          action:
            'Modality refresh — keep the engine, swap the surface (run → row → bike).',
        },
      ],
    },
  },

  sleep: {
    headline: 'Sleep — the rhythm is stable.',
    defendedFloor: {
      intro:
        'Four weeks of consistent timing. The rhythm is locked; the hours are downstream of it. Defend the window.',
      items: [
        'Bed time + wake time within ±30 minutes of the anchor.',
        'Mean sleep ≥7 hours over rolling 28 nights.',
        'Standard deviation under one hour — the consistency metric.',
        'Screens out 30+ minutes before bed; wind-down routine intact.',
      ],
    },
    driftSignals: {
      intro:
        'Sleep drift is upstream of almost everything else — strength, cardio, mood, hunger. Catch it early.',
      items: [
        'SD creeping above one hour — the rhythm is loosening.',
        'Average hours dropping below 7 for 2+ weeks.',
        'Multiple wake-ups per night becoming the pattern, not the exception.',
        'Wake time drifting later by 30+ min — the anchor is moving.',
      ],
    },
    climbBack: {
      intro:
        'Sleep responds to a hard reset on the window. One week of strict adherence reanchors the rhythm.',
      items: [
        'Set the wake time and hold it for seven days — even weekends.',
        'Bed time follows the wake time, not the other way around.',
        'Eliminate one upstream variable for a week — caffeine after 2pm, evening alcohol, late screens.',
      ],
    },
    cadence: {
      intro: 'Mostly automatic if wearable connected; otherwise weekly manual.',
      items: [
        { frequency: 'Weekly', action: 'Adherence to anchor times.' },
        {
          frequency: 'Monthly',
          action: 'Schedule review — has work / family shifted the window?',
        },
        {
          frequency: 'Quarterly',
          action:
            'Environmental audit — room temp, light, sound, partner schedule alignment.',
        },
      ],
    },
  },

  skincare: {
    headline: 'Skincare — the routine is set.',
    defendedFloor: {
      intro:
        'The routine has the inputs your skin needs. Consistency, not complexity — adding more steps is rarely the right move from here.',
      items: [
        'Cleanser + moisturizer + SPF daily as the baseline floor.',
        'Active (retinoid, exfoliant) cadence held at the level your skin tolerates.',
        'Barrier feels stable — not tight, not stinging from products.',
        'Sun protection consistent on outdoor exposure days, not just sunny ones.',
      ],
    },
    driftSignals: {
      intro:
        'Skin drift is rarely a routine failure — it is usually a context change (season, stress, hormones, a new product) the routine has not adapted to.',
      items: [
        'New breakouts sustained beyond a 2-week window.',
        'Sensitivity returning — products that used to be fine now sting or redden.',
        'Dry / oily balance shifting persistently (seasonal vs structural).',
        'A new product introduced 4–6 weeks ago correlated with the change.',
      ],
    },
    climbBack: {
      intro:
        'The right move is usually subtractive, not additive. Return to baseline before changing inputs.',
      items: [
        'Cut to cleanser + moisturizer + SPF for 1–2 weeks; let the barrier recover.',
        'Eliminate the most recent product addition; re-introduce later if needed.',
        'If sustained drift past four weeks, re-run /plan/skincare with the new state.',
      ],
    },
    cadence: {
      intro: 'Slow signal — monthly is the right cadence here.',
      items: [
        { frequency: 'Monthly', action: 'Honest skin check + photo.' },
        {
          frequency: 'Seasonal',
          action:
            'Routine adjustment — moisturizer weight, exfoliation cadence.',
        },
        {
          frequency: 'Annual',
          action: 'Re-run assessment if priorities or skin behavior shifted.',
        },
      ],
    },
  },

  facial_hair: {
    headline: 'Facial hair — the cadence holds.',
    defendedFloor: {
      intro:
        'Target length reached, upkeep cadence consistent. The shape is yours now.',
      items: [
        'Upkeep cadence held — every 2 days (high commitment), 4 days (medium), or 7 days (low).',
        'Edges defined consistently — cheek line, neckline, mustache boundary.',
        'Length sat where you wanted it for 4+ weeks without major adjustment.',
        'Beard care routine intact (oil / balm if applicable, brushing, washing).',
      ],
    },
    driftSignals: {
      intro:
        'Drift here is usually upkeep cadence slipping, not regrowth. The shape goes before the density does.',
      items: [
        'Two weeks of no trims — edges are blurring, neckline creeping up.',
        'Length variance becoming visible — patches outpacing the rest.',
        'Beard care skipped — feels rough, looks dull.',
        'Style drift — you defaulted to "whatever grows" instead of the target shape.',
      ],
    },
    climbBack: {
      intro:
        'A single trim + edge cleanup resets most facial-hair drift. This is one of the lowest-cost climb-backs in the system.',
      items: [
        'Full trim to target length + clean edges + mustache reset.',
        'Return to the upkeep cadence the next session — do not double up.',
        'If density-based drift persists (patches, slow regrowth), re-run /plan/facial-hair with the new state.',
      ],
    },
    cadence: {
      intro: 'Upkeep-driven; recalibration is rare here.',
      items: [
        {
          frequency: 'Per your cadence',
          action:
            'Upkeep session — 2 / 4 / 7 days depending on time commitment.',
        },
        {
          frequency: 'Monthly',
          action: 'Density + style check — same target, or time to update?',
        },
        {
          frequency: 'Quarterly',
          action: 'Style review — does the target shape still fit your face?',
        },
      ],
    },
  },
};

export function getMaintenanceContent(slug: JourneySlug): MaintenanceContent {
  return MAINTENANCE_CONTENT[slug];
}
