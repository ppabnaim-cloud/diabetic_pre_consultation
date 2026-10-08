# Clinical specification and verification checklist

This document exists for one reason: **every clinical number in this
application was written from memory of the two guidelines, not read out of
them.** The sandbox this was built in could not reach `mems.my`,
`moh.gov.my`, or any mirror of the PDFs — the network policy refused all of
them — so the thresholds below are a careful transcription awaiting a human
check against the published documents.

Until that check is done, the application says so, loudly:

- `npm run build` prints the count of unverified values and will not let you
  forget it;
- the Summary tab shows a red notice while any remain;
- the generated doctor's note carries the same notice in its provenance block.

None of that is cosmetic. A pre-consultation summary that tells a doctor a
blood pressure is "above the CPG target" is making a clinical claim, and the
claim is only as good as the number behind it.

## The two sources, and nothing else

| Tag | Document |
|---|---|
| `[T2DM]` | Clinical Practice Guidelines: **Management of Type 2 Diabetes Mellitus, 6th Edition**. Ministry of Health Malaysia / Academy of Medicine Malaysia / MEMS / Diabetes Malaysia / FMSA. December 2020. MOH/P/PAK/447.20(GU)-e. |
| `[OBES]` | Clinical Practice Guidelines: **Management of Obesity, 2nd Edition**. Ministry of Health Malaysia / MEMS / FMSA / MDA / MASO. 2023. ISBN 978-967-2887-53-9. |

The build enforces this. It fails if any source file mentions another
guideline body, and it fails if a quiz item cites anything but `T2DM` or
`OBES`.

## How to do the verification

Everything lives in **`src/cpg.js`**, and nothing downstream hard-codes a
number — `schema.js`, `quiz.js`, `summary.js` and `app.js` all read `CPG.*`.
So verification is a single-file job:

1. Open the two PDFs beside `src/cpg.js`.
2. For each row below, read the value out of the PDF.
3. If it matches, change that entry's `v: 'verify'` to `v: 'cpg'` and put the
   page number in its `cl:` string.
4. If it does not match, **change the value**. Everywhere that uses it —
   chart bands, flag rules, care gaps, the quiz explanations, the note —
   follows automatically.
5. Run `npm test`. The build will tell you how many are left.

When the count reaches zero the build prints a tick instead of a warning and
the red notice disappears from the summary.

## The checklist

### Glycaemic targets — `[T2DM]`

| | Key | Value | Clause to check |
|---|---|---|---|
| ☐ | `hba1c.general` | 6.5 % | Targets for control. **Note this is the Malaysian target and is tighter than the <7% many clinicians carry in their head.** |
| ☐ | `hba1c.tight` | 6.1 % | Individualisation — newly diagnosed, younger, no CVD |
| ☐ | `hba1c.relaxed` | 7.0 % | Individualisation — comorbidity, hypoglycaemia risk |
| ☐ | `hba1c.frail` | 8.0 % | Individualisation — severe comorbidity, limited life expectancy |
| ☐ | `cap.fasting` | 4.4–7.0 mmol/L | Fasting / pre-prandial capillary target |
| ☐ | `cap.post` | 4.4–8.5 mmol/L | 2-hour post-prandial capillary target |

The two capillary bands shade the home-glucose chart and drive the
"% within the CPG target" figure, which is the single most-used number this
application produces. Get these right before anything else.

### Hypoglycaemia — `[T2DM]`

| | Key | Value | Clause to check |
|---|---|---|---|
| ☐ | `hypo.l1` | < 3.9 and ≥ 3.0 mmol/L | Level 1, alert value |
| ☐ | `hypo.l2` | < 3.0 mmol/L | Level 2, clinically significant |
| ☐ | `hypo.l3` | no glucose threshold | Level 3, severe — defined by needing another person's help |
| ☐ | `hypo.rule15` | 15 g carbohydrate, recheck at 15 min | Management of hypoglycaemia |

`hypo.rule15` is quoted verbatim to patients in quiz item 2 and in the flag
raised when a patient says they do nothing for a hypo. If the guideline
states a different quantity or interval, the patient-facing teaching changes
with it.

### Blood pressure and lipids — `[T2DM]`

| | Key | Value | Clause to check |
|---|---|---|---|
| ☐ | `bp` | < 135/75 mmHg | **Highest priority to verify.** The nursing tab colours every reading against this, and the note tells the doctor whether the patient is at target. |
| ☐ | `lipid.ldl` | < 2.6 mmol/L | LDL-C, standard |
| ☐ | `lipid.ldlHigh` | < 1.8 mmol/L | LDL-C, established CVD / very high risk |
| ☐ | `lipid.tg` | < 1.7 mmol/L | Triglycerides |
| ☐ | `lipid.hdlMale` | > 1.0 mmol/L | HDL-C, men |
| ☐ | `lipid.hdlFemale` | > 1.2 mmol/L | HDL-C, women |

### Anthropometry — `[OBES]`

| | Key | Value | Clause to check |
|---|---|---|---|
| ☐ | `bmi.bands` | <18.5 / 18.5–22.9 / 23.0–27.4 / 27.5–34.9 / 35.0–39.9 / ≥40 | BMI classification, **Asian** cut-offs |
| ☐ | `bmi.obeseFrom` | 27.5 kg/m² | Where the weight-management pathway begins |
| ☐ | `waist` | 90 cm men, 80 cm women | Waist circumference, Asian cut-offs |
| ☐ | `weightLoss` | 5 % and 10 % | Weight-reduction targets |
| ☐ | `energyDeficit` | 500–750 kcal/day | Dietary intervention |

Using the international cut-offs here (25 / 30, 102 / 88 cm) would
systematically under-call obesity in exactly the population this clinic
serves. The quiz tests the patient on the waist figure, so an error is also
taught to patients.

### Physical activity — `[T2DM]`, `[OBES]`

| | Key | Value | Clause to check |
|---|---|---|---|
| ☐ | `activity.minPerWeek` | 150 min/week | Moderate-intensity aerobic activity |
| ☐ | `activity.maxGapDays` | 2 days | No more than this many consecutive days without activity |
| ☐ | `activity.resistanceSessions` | 2 per week | Resistance training |
| ☐ | `activity.sedentaryBreakMin` | 30 min | Breaking sedentary time |
| ☐ | `activity.weightMinPerWeek` | 300 min/week | `[OBES]` — for weight loss and its maintenance |

### Screening intervals — `[T2DM]`

| | Key | Value | Clause to check |
|---|---|---|---|
| ☐ | `screening.eye` | 12 months, from diagnosis | Retinopathy screening |
| ☐ | `screening.renal` | 12 months, from diagnosis | Urine albumin and eGFR |
| ☐ | `screening.foot` | 12 months, from diagnosis | Foot examination |
| ☐ | `screening.lipid` | 12 months | Lipid profile |
| ☐ | `screening.dental` | 12 months | Dental examination |

Each one generates a line on the doctor's care-gap list whenever the patient
answers "more than a year ago", "more than two years", or "never".

### Nutrition — `[T2DM]`

| | Key | Value | Clause to check |
|---|---|---|---|
| ☐ | `diet.saltMaxG` | 5 g/day | Salt |
| ☐ | `diet.vegServings` | 3 servings/day | Vegetables |
| ☐ | `diet.fruitServings` | 2 servings/day | Fruit |

Also check the **plate method** as quiz item 5 states it — half the plate
vegetables, a quarter protein, a quarter carbohydrate.

## Values that are deliberately NOT CPG figures

Two groups carry a different marker and need a different kind of review.
They are not part of the unverified count, because they are not claims about
what the guidelines say.

### `steps` — marked `v: 'proxy'`

5 000 / 7 500 / 10 000 steps a day. **The guidelines prescribe minutes of
activity, not steps.** These bands exist only to turn a figure the patient
already has on their phone into a rough statement about whether they are
near the 150-minute prescription. Every place they appear says so, and the
doctor's note repeats the caveat whenever it prints a step count. Do not
promote them to a target.

### `escalate` — marked `v: 'clinical'`

| Key | Value | What it does |
|---|---|---|
| `rbgLow` / `rbgVeryLow` | 4.0 / 3.0 mmol/L | Red banner on a counter glucose |
| `rbgHigh` | 20.0 mmol/L | Red banner on a counter glucose |
| `bpSys` / `bpDia` | 180 / 110 mmHg | Red banner on a counter blood pressure |
| `pulseLow` / `pulseHigh` | 50 / 120 per min | Amber flag |
| `spo2Low` | 94 % | Red banner |
| `tempHigh` | 38.0 °C | Amber flag |

These are **local operational safety thresholds**, not guideline clauses.
They decide when the application stops being a questionnaire and puts a red
banner on the screen telling the patient to speak to staff immediately. They
are set conservatively on purpose: the cost of a false alarm is a nurse
spending a minute; the cost of a miss is a patient sitting in a waiting room
with something acute.

**They should be signed off by the clinic's own clinical lead against local
escalation policy**, not against a CPG. If your department's policy differs,
change them here.

## The red flags

Thirty-six questions carry a flag rule. They are written beside the question
they belong to in `src/schema.js`, never in a separate list, so a question
cannot be added without someone deciding whether it can raise a flag.

Flags are deliberately over-inclusive, and every one is phrased to the
patient as *"tell the staff"*, never as a diagnosis. The red ones are:

- chest pain at rest, present now, or new/increasing on exertion;
- breathlessness at rest; orthopnoea or waking short of breath;
- sudden focal neurological symptoms;
- rest pain in the legs;
- sudden visual loss, a curtain across vision, or new floaters;
- an active foot wound, black area, inflammation or discharge;
- vomiting, abdominal pain, drowsiness or breathlessness today;
- severe (Level 3) hypoglycaemia, or more than five episodes in four weeks;
- a lowest recorded glucose below 3.0 mmol/L;
- impaired hypoglycaemia awareness, and driving with it;
- not knowing how to treat a hypo while on insulin or a sulphonylurea;
- a near-miss falling asleep while driving;
- being pregnant;
- stating they can no longer cope with their diabetes;
- and, from the counter: glucose below 4.0 or above 20.0, BP at or above
  180/110, SpO₂ below 94 %, a foot ulcer seen on examination.

The build runs every one of these rules against an empty patient, a fully
populated male case and a female case, and fails if any throws. The browser
tests assert that a red answer reaches both the on-screen banner and the
doctor's note.

## What this application does not do

It does not diagnose. It does not triage. It does not stage retinopathy,
calculate cardiovascular risk, suggest a drug, or set an individualised
HbA1c target — the note explicitly says that choosing the target band is a
clinical decision it is not making.

It is a history-taking aid that writes down what the patient says, measures
it against the two guidelines, and hands the result to a doctor. It is not a
medical device, and the note says so every time it is generated.
