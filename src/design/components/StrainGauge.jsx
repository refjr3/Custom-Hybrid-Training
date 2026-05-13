import { colors, spacing, typography } from "../tokens";

const STRAIN_MAX = 21;

export const StrainGauge = ({ strain, headless = false }) => {
  const strainValue = Number(strain);
  const hasStrain = Number.isFinite(strainValue) && strainValue >= 0;

  const zones = [
    { label: "LIGHT", min: 0, max: 9, color: colors.strainZoneLight },
    { label: "MODERATE", min: 10, max: 13, color: colors.strainZoneModerate },
    { label: "HIGH", min: 14, max: 17, color: colors.strainZoneHigh },
    { label: "ALL-OUT", min: 18, max: 21, color: colors.strainZoneAllOut },
  ];

  const markerPos = hasStrain ? Math.min(strainValue, STRAIN_MAX) / STRAIN_MAX * 100 : 0;
  const currentZone = hasStrain
    ? zones.find((zone) => strainValue >= zone.min && strainValue <= zone.max) || zones[zones.length - 1]
    : null;

  return (
    <div
      style={{
        background: headless ? "transparent" : colors.bgCardSubtle,
        border: headless ? "none" : `0.5px solid ${colors.borderSubtle}`,
        borderRadius: headless ? 0 : spacing.cardRadius,
        padding: headless ? 0 : spacing.cardPaddingTight,
      }}
    >
      {!headless ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span style={{ fontSize: typography.sizeCaps, color: colors.textSecondary, letterSpacing: typography.trackingMicro, fontWeight: typography.weightMedium }}>
            STRAIN
          </span>
          <div>
            <span style={{ fontFamily: typography.fontDisplay, fontSize: 24, color: colors.textPrimary, letterSpacing: "-0.4px" }}>
              {hasStrain ? strainValue.toFixed(1) : "—"}
            </span>
            <span style={{ fontSize: 10, color: currentZone?.color || colors.textTertiary, marginLeft: 8, letterSpacing: "1.4px", fontWeight: typography.weightMedium }}>
              {currentZone?.label || "NO DATA"}
            </span>
          </div>
        </div>
      ) : null}

      <div style={{ position: "relative", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: headless ? 0 : 6, display: "flex" }}>
        {zones.map((zone) => (
          <div
            key={zone.label}
            style={{
              flex: zone.max - zone.min + 1,
              background: zone.color,
              opacity: 0.5,
            }}
          />
        ))}
        {hasStrain ? (
          <div
            style={{
              position: "absolute",
              left: `${markerPos}%`,
              top: -2,
              transform: "translateX(-50%)",
              width: 3,
              height: 12,
              background: colors.textPrimary,
              borderRadius: 1,
              boxShadow: "0 0 4px rgba(0,0,0,0.6)",
            }}
          />
        ) : null}
      </div>

      {!headless ? (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: colors.textTertiary, letterSpacing: "0.8px", fontWeight: typography.weightMedium }}>
          <span>0</span>
          <span>10</span>
          <span>14</span>
          <span>18</span>
          <span>21</span>
        </div>
      ) : null}
    </div>
  );
};
