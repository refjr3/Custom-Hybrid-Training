export const metricExplainers = {
  hrv: {
    title: "Heart Rate Variability",
    short:
      "HRV measures the tiny variations between each heartbeat. Higher HRV means your body is recovered and ready to train hard. Lower HRV means you're stressed, tired, or fighting something.",
    detailed:
      'Your autonomic nervous system has two sides: the "go" system (sympathetic) and the "rest" system (parasympathetic). When you\'re recovered, the rest system has the upper hand, creating more variability between heartbeats. When you\'re stressed or accumulating fatigue, the go system stays on, heartbeats become more uniform, and HRV drops.\n\nHRV is deeply individual — there\'s no "normal" number across people. What matters is YOUR baseline and how today compares. We track your 30-day rolling average and flag days that deviate significantly.\n\nA big drop usually precedes feeling bad by 24-48 hours. That\'s why it\'s one of the best early-warning signals in training.',
    userContext: (profile, metric, baseline) => {
      if (!metric || !baseline) return null;
      const pct = ((metric - baseline) / baseline) * 100;
      if (pct >= 5)
        return `Your HRV of ${Math.round(metric)}ms is ${pct.toFixed(0)}% above your 30-day baseline of ${Math.round(baseline)}ms. Good sign — your body is recovered.`;
      if (pct >= -5)
        return `Your HRV of ${Math.round(metric)}ms is right at your baseline of ${Math.round(baseline)}ms. Normal day.`;
      if (pct >= -15)
        return `Your HRV of ${Math.round(metric)}ms is ${Math.abs(pct).toFixed(0)}% below baseline. Slight stress signal — proceed with planned training but watch for other flags.`;
      return `Your HRV of ${Math.round(metric)}ms is ${Math.abs(pct).toFixed(0)}% below baseline. That's a real signal of accumulated fatigue or stress. Consider easing today's intensity.`;
    },
  },

  rhr: {
    title: "Resting Heart Rate",
    short:
      "Resting heart rate is how many times your heart beats per minute when you're fully at rest (usually measured during sleep). Lower generally means more aerobically fit and well-recovered.",
    detailed:
      "Endurance training strengthens your heart — each beat pumps more blood, so it needs fewer beats to supply your body at rest. Elite endurance athletes often have RHR below 50 bpm.\n\nBut the daily signal is about YOUR baseline. An elevated RHR (5+ bpm above your normal) is a classic sign of: accumulated fatigue, illness coming on, dehydration, or poor sleep. If it's elevated two days in a row, something's off.\n\nWe compare today against your 30-day average, not against population norms, because what's \"normal\" for you is what matters.",
    userContext: (profile, metric, baseline) => {
      if (!metric || !baseline) return null;
      const delta = metric - baseline;
      if (delta <= 2) return `Your RHR of ${metric} bpm is right at your baseline of ${Math.round(baseline)}. Normal.`;
      if (delta <= 5)
        return `Your RHR of ${metric} bpm is slightly elevated (+${delta.toFixed(0)} from baseline). Minor signal — often sleep quality or partial dehydration.`;
      return `Your RHR of ${metric} bpm is ${delta.toFixed(0)} bpm above baseline. That's meaningful — could be illness starting, accumulated fatigue, or life stress. Keep an eye on it.`;
    },
  },

  readiness: {
    title: "Recovery Score",
    short:
      "Your recovery score is a 0-100 rating of how prepared your body is to handle training today. It combines HRV, resting heart rate, sleep quality, and recent training load.",
    detailed:
      'Recovery scores are directional, not absolute. A "67" doesn\'t mean you\'re 67% recovered — it means today is at the 67th percentile of your own history.\n\nGreen (67+): Your body is primed. Execute hard sessions as planned.\nYellow (34-66): Compromised. You can still train but proceed with awareness. Consider Z2 or moderate work over intensity.\nRed (below 34): Your body needs recovery more than stimulus. A rest day or very light movement is the right call.\n\nRemember: recovery scores can be fooled by alcohol, travel, late meals, or a missing wearable night. Use them as one data point, not gospel.',
    userContext: (profile, metric) => {
      if (!metric) return null;
      if (metric >= 67) return `Your score of ${metric} means your body is ready. Train as planned.`;
      if (metric >= 34)
        return `Your score of ${metric} is in the middle zone. You can still train — just lean toward planned work, skip the heroics.`;
      return `Your score of ${metric} is low. Your body is giving you a clear signal. A rest day or very easy Z2 today will set up tomorrow better than forcing intensity now.`;
    },
  },

  z2: {
    title: "Zone 2 Training",
    short:
      "Zone 2 is steady, conversational-pace cardio. You should be able to talk in full sentences. It builds your aerobic base — the foundation of endurance.",
    detailed:
      "Zone 2 targets your fat-burning energy system — slow, sustainable, efficient. It builds mitochondrial density (more cellular power plants) and improves blood flow without creating much fatigue.\n\nMost athletes undertrain Zone 2 because it feels too easy. That's the point. Elite endurance athletes spend 70-80% of their volume here.\n\nFor hybrid athletes: Zone 2 is what lets you recover between hard efforts. More Zone 2 = more capacity for HYROX, threshold work, or race day.\n\nHow to know you're in Zone 2: heart rate in your designated bpm range (typically 60-70% of max HR), you can hold a conversation, and you could keep going for another hour.",
    userContext: (profile, weeklyMins, target) => {
      const t = target || 240;
      const pct = (weeklyMins / t) * 100;
      if (pct >= 100)
        return `You're at ${weeklyMins} minutes this week — past your ${t}-minute target. Strong aerobic week.`;
      if (pct >= 75) return `You're at ${weeklyMins} of ${t} minutes. Close to target. One more session does it.`;
      if (pct >= 40) return `You're at ${weeklyMins} of ${t} minutes. Half way. Push the second half of the week.`;
      return `You're at ${weeklyMins} of ${t} minutes. Zone 2 is the biggest leverage point for hybrid performance — prioritize it.`;
    },
  },

  z3: {
    title: "Zone 3 Training",
    short:
      'Zone 3 is moderately hard — tempo pace. You can talk but only in short phrases. It sits between aerobic base (Z2) and threshold (Z4), often called the "gray zone."',
    detailed:
      "Zone 3 is controversial in endurance training. Too much time here can blunt your aerobic development (because it's harder than Z2 but not stimulating enough to drive real threshold gains) — the dreaded \"gray zone\" problem.\n\nBut for hybrid athletes, Zone 3 has real utility: it builds sustainable race pace, improves your ability to clear lactate at moderate intensities, and bridges the gap between easy and hard work.\n\nThe key is keeping Zone 3 intentional. 30-60 min per week of targeted tempo work (like sustained efforts or steady climbs) is productive. Spending hours in Z3 by accident because you're pushing your Z2 too hard is a common mistake.",
    userContext: (profile, weeklyMins, target) => {
      const t = target || 60;
      if (weeklyMins === 0)
        return `You have no Zone 3 time yet this week. Target is ${t} minutes — one tempo session typically gets you most of the way there.`;
      const pct = (weeklyMins / t) * 100;
      if (pct >= 100)
        return `You're at ${weeklyMins} minutes, past your ${t}-minute target. For most athletes that's enough Zone 3 for the week.`;
      if (pct >= 50) return `You're at ${weeklyMins} of ${t} minutes. On pace — don't force more unless it's a specific tempo session.`;
      return `You're at ${weeklyMins} of ${t} minutes. Light tempo volume this week. One intentional tempo session would get you to target.`;
    },
  },

  z4_plus: {
    title: "Zone 4+ Training",
    short:
      "Zone 4 and above is threshold and max-effort work — intervals, race pace, all-out efforts. Building this zone directly improves your top-end performance and lactate tolerance.",
    detailed:
      "Zone 4 is threshold — the intensity just below where lactate builds faster than you can clear it. Zone 5 and above is max effort, VO2max territory, where you can only sustain for minutes.\n\nThreshold and VO2max work build race-specific fitness. They teach your body to perform when things get hard — which is the entire game in HYROX, intervals, or sprint finishes.\n\nThe trade-off: high-intensity work creates significant fatigue and needs long recovery. Too much and your aerobic base suffers. Too little and your ceiling never raises.\n\nMost hybrid athletes only need 20-40 minutes per week of true Zone 4+ work. Quality over quantity. A properly executed 4x4 minutes at threshold beats an hour of vaguely hard effort.",
    userContext: (profile, weeklyMins, target) => {
      const t = target || 30;
      if (weeklyMins === 0)
        return `No Zone 4+ time yet this week. Target is ${t} minutes. One interval session (e.g. 4x4 min at threshold) gets you there.`;
      const pct = (weeklyMins / t) * 100;
      if (pct >= 100)
        return `You have ${weeklyMins} minutes — past your ${t}-minute target. That's meaningful intensity this week. Prioritize recovery.`;
      if (pct >= 60) return `You're at ${weeklyMins} of ${t} minutes. On track. More is rarely better at this intensity.`;
      return `You're at ${weeklyMins} of ${t} minutes. One quality interval session would get you to target.`;
    },
  },

  deep_sleep: {
    title: "Deep Sleep",
    short:
      "Deep sleep is the phase where your body does its physical repair — muscle recovery, hormone release, immune system function. 60-90 minutes per night is the typical healthy range.",
    detailed:
      "Sleep has four stages that cycle through the night: Light, Deep, REM, and Awake. Deep sleep happens mostly in the first half of the night. It's when growth hormone peaks, muscle protein synthesis happens, and waste gets cleared from your brain.\n\nAthletes need MORE deep sleep than sedentary people because recovery demands are higher. Low deep sleep (below your baseline by 15+ minutes) correlates with slower recovery, higher injury risk, and worse next-day performance.\n\nWhat hurts deep sleep: alcohol within 3 hours of bed, training too late, high room temperature, late caffeine (even 8 hours before), inconsistent bedtime.",
    userContext: (profile, metric, baseline) => {
      if (!metric || !baseline) return null;
      const delta = metric - baseline;
      if (delta >= -5)
        return `You got ${Math.round(metric)} minutes of deep sleep, right around your baseline of ${Math.round(baseline)}. Solid.`;
      if (delta >= -15)
        return `${Math.round(metric)} minutes was slightly below your baseline of ${Math.round(baseline)}. Not a concern unless it becomes a pattern.`;
      return `Only ${Math.round(metric)} minutes of deep sleep — ${Math.abs(delta).toFixed(0)} below your baseline. That's a real hit to recovery. Look for the cause: alcohol, late training, or stress.`;
    },
  },

  sleep_duration: {
    title: "Sleep Duration",
    short:
      "Total time asleep (not including time awake in bed). Most adults need 7-9 hours. Athletes training hard often need more.",
    detailed:
      "Sleep duration is the single biggest lever for recovery, body composition, and performance. Studies show athletes who sleep under 7 hours have 1.7x higher injury risk and measurably worse reaction time, decision making, and power output.\n\nConsistency matters almost as much as duration. Going to bed at wildly different times (more than 90 minutes variation) reduces sleep quality even if total hours look fine.",
    userContext: (profile, minutes) => {
      if (!minutes) return null;
      const hours = minutes / 60;
      if (hours >= 8) return `${hours.toFixed(1)} hours is excellent. Your body has all the recovery window it needs.`;
      if (hours >= 7) return `${hours.toFixed(1)} hours is adequate. Fine for most days. Aim for 8+ during heavy training weeks.`;
      if (hours >= 6) return `${hours.toFixed(1)} hours is short. Can work for one night but becomes a problem if it persists.`;
      return `${hours.toFixed(1)} hours is below the threshold where recovery starts to compound. Performance and injury risk both take a hit.`;
    },
  },

  strain: {
    title: "Strain",
    short:
      "Strain measures the cardiovascular load you put on your body during the day — both workouts and life. Higher = more stress on your system.",
    detailed:
      "Strain is calculated from time spent in elevated heart rate zones. A 30-minute HYROX workout and a 4-hour Z2 run might produce similar strain numbers through different mechanisms.\n\nStrain pairs with Recovery as a day-to-day training guide: high recovery = capacity for high strain; low recovery = strain should be moderate.\n\nThere's no \"target\" strain number — it depends on your fitness, goals, and weekly structure. What matters is the relationship: are you producing strain that's proportional to your recovery?",
    userContext: null,
  },

  threshold: {
    title: "Threshold Training",
    short:
      "Threshold is the pace you could sustain for about an hour all-out. It's the edge of sustainable effort. Improving it means improving how fast you can go before you crack.",
    detailed:
      "Technically: the intensity just below where lactate accumulates faster than your body can clear it. Above threshold, fatigue compounds fast. At threshold, you're riding the edge.\n\nFor training, threshold work is often done in intervals — 2x20 minutes, 4x10 minutes, etc. — because doing an hour straight at true threshold is brutally hard.\n\nThreshold is highly trainable. 8-12 weeks of consistent threshold work can improve your sustainable pace by 5-10% for most athletes.",
    userContext: null,
  },
};
