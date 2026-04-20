export function useDataSources(profile) {
  const sources = profile?.connected_sources || {};
  const wearables = profile?.connected_wearables || {};

  const hasWhoop = sources?.whoop?.connected === true || wearables?.whoop === true;
  const hasStrava = sources?.strava?.connected === true;
  const hasGarmin = sources?.garmin?.connected === true;
  const hasOura = sources?.oura?.connected === true;
  const hasAppleHealth = sources?.apple_health?.connected === true;

  const hasRecoverySource = hasWhoop || hasOura || hasGarmin;
  const hasActivitySource = hasStrava || hasGarmin || hasAppleHealth;
  const hasSleepSource = hasWhoop || hasOura || hasGarmin || hasAppleHealth;
  const hasHRVSource = hasWhoop || hasOura || hasGarmin;

  return {
    hasWhoop,
    hasStrava,
    hasGarmin,
    hasOura,
    hasAppleHealth,
    hasRecoverySource,
    hasActivitySource,
    hasSleepSource,
    hasHRVSource,
    primaryRecoverySource: hasWhoop ? "WHOOP" : hasOura ? "Oura" : hasGarmin ? "Garmin" : null,
    primaryActivitySource: hasGarmin ? "Garmin" : hasStrava ? "Strava" : hasAppleHealth ? "Apple Health" : null,
    primarySleepSource: hasOura ? "Oura" : hasWhoop ? "WHOOP" : hasGarmin ? "Garmin" : null,
  };
}
