# Physiological Interpreter Rules (v1.0.0)

This document defines Layer 3 rule logic used by `interpretPhysiologicalStates`.
The goal is consistent, explainable coaching interpretation with explicit thresholds.

## Version

- Interpreter version: `1.0.0`

## Nervous System

### Rule: `NervousSystemSuppressed_v1`
- **Trigger:** `hrvDeltaPercent <= -10`
- **Meaning:** `suppressed`
- **Rationale:** Day-to-day HRV variation of ~5-8% is common noise; drops greater than 10% are a meaningful recovery warning.
- **Confidence:** medium (stronger when corroborated by elevated RHR or poor sleep)

### Rule: `NervousSystemFresh_v1`
- **Trigger:** `hrvDeltaPercent >= 5`
- **Meaning:** `fresh`
- **Rationale:** HRV materially above baseline often indicates positive recovery readiness.
- **Confidence:** medium

### Rule: `NervousSystemStable_v1`
- **Trigger:** between thresholds above
- **Meaning:** `stable`
- **Rationale:** No material HRV deviation from baseline.
- **Confidence:** medium

## Aerobic

### Rule: `AerobicStrained_v1`
- **Trigger:** `rhrDeltaBpm >= +5`
- **Meaning:** `strained`
- **Rationale:** Resting HR elevation by 5+ bpm is a common signal of incomplete recovery or elevated stress load.
- **Confidence:** medium-high

### Rule: `AerobicRecovering_v1`
- **Trigger:** `rhrDeltaBpm <= -3`
- **Meaning:** `recovering`
- **Rationale:** Meaningfully lower resting HR vs baseline is often a favorable recovery signal.
- **Confidence:** medium

### Rule: `AerobicStable_v1`
- **Trigger:** between thresholds above
- **Meaning:** `stable`
- **Rationale:** RHR remains inside expected baseline fluctuation.
- **Confidence:** medium

## Sleep

### Rule: `SleepInsufficient_v1`
- **Trigger:** `sleepHoursLastNight < 6.5`
- **Meaning:** `insufficient`
- **Rationale:** Short sleep reduces readiness and resilience to intensity.
- **Confidence:** high (when sleep source is fresh)

### Rule: `SleepExcellent_v1`
- **Trigger:** `sleepHoursLastNight >= 8`
- **Meaning:** `excellent`
- **Rationale:** Strong sleep duration supports adaptation and decision confidence.
- **Confidence:** high

### Rule: `SleepAdequate_v1`
- **Trigger:** otherwise
- **Meaning:** `adequate`
- **Rationale:** Sleep sits inside target range but is not a strong positive or negative outlier.
- **Confidence:** medium-high

## Fatigue (TSB Mapping)

### Rule: `FatigueFresh_v1`
- **Trigger:** `tsb > 25`
- **Meaning:** `fresh`
- **Rationale:** Athlete is very rested.
- **Confidence:** medium

### Rule: `FatigueRecovered_v1`
- **Trigger:** `5 <= tsb <= 25`
- **Meaning:** `recovered`
- **Rationale:** Recovery has absorbed recent load.
- **Confidence:** medium

### Rule: `FatigueNeutral_v1`
- **Trigger:** `-5 <= tsb < 5`
- **Meaning:** `neutral`
- **Rationale:** Balanced load and recovery.
- **Confidence:** medium

### Rule: `FatigueBuilding_v1`
- **Trigger:** `-25 <= tsb < -5`
- **Meaning:** `building`
- **Rationale:** Productive load accumulation phase.
- **Confidence:** medium

### Rule: `FatigueHeavy_v1`
- **Trigger:** `tsb < -25`
- **Meaning:** `heavy`
- **Rationale:** Fatigue load is likely too high for added intensity.
- **Confidence:** medium-high

## Subjective (Manual Check-In)

### Rule: `SubjectiveStrong_v1`
- **Trigger:** composite >= 4
- **Meaning:** `strong`
- **Rationale:** athlete self-report reflects high readiness.
- **Confidence:** medium (subjective by design)

### Rule: `SubjectiveFlat_v1`
- **Trigger:** composite <= 2
- **Meaning:** `flat`
- **Rationale:** low motivation/energy/heavy legs indicate caution.
- **Confidence:** medium

### Rule: `SubjectiveNeutral_v1`
- **Trigger:** otherwise
- **Meaning:** `neutral`
- **Rationale:** moderate subjective readiness.
- **Confidence:** medium

## Unknown State Handling

If required inputs are absent for a domain, interpreter returns:
- `state: "unknown"`
- `rule: null`
- a short reason string indicating missing data.

This avoids over-confident interpretation in sparse data scenarios.
