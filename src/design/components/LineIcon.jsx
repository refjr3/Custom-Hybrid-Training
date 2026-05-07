import { colors } from "../tokens";

export const LineIcon = ({ name, size = 16, color }) => {
  const stroke = color || colors.accentGoldMuted;

  const icons = {
    heart: <path d="M8 14s-5-3.5-5-7.5C3 4 5 2 7.5 2 8.5 2 9.5 2.5 10 3.5c0.5-1 1.5-1.5 2.5-1.5C15 2 17 4 17 6.5c0 4-5 7.5-5 7.5L8 14z" />,
    pulse: <path d="M2 10h3l2-5 3 10 2-5h3l2 0" />,
    clock: (
      <>
        <circle cx="10" cy="10" r="7" />
        <path d="M10 6v4l2.5 2.5" />
      </>
    ),
    moon: <path d="M9 2a7 7 0 100 14 6 6 0 01-3-11 7 7 0 003 11z" />,
    bed: (
      <>
        <path d="M2 12V6" />
        <path d="M2 12h16" />
        <path d="M18 12V8c0-1-1-2-2-2H8" />
        <circle cx="6" cy="9" r="1.5" />
      </>
    ),
    lightning: <path d="M11 2L5 11h4l-1 7 6-9h-4l1-7z" />,
    arrow_up: <path d="M10 4v12m0-12l-4 4m4-4l4 4" />,
    arrow_down: <path d="M10 16V4m0 12l-4-4m4 4l4-4" />,
    info: (
      <>
        <circle cx="10" cy="10" r="8" />
        <line x1="10" y1="6" x2="10" y2="11" />
        <circle cx="10" cy="13.5" r="0.5" />
      </>
    ),
    chevron_right: <path d="M7 4l6 6-6 6" />,
    sparkle: <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke={stroke}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name] || null}
    </svg>
  );
};

export const InfoIcon = (props) => <LineIcon name="info" {...props} />;
