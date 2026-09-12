const woodGrain = (base) =>
  `linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 30%, rgba(0,0,0,0.08) 100%), ${base}`;

export const boardTheme = {
  lightSquareStyle: {
    backgroundColor: '#e9d3a7',
    backgroundImage: woodGrain('#e9d3a7'),
  },
  darkSquareStyle: {
    backgroundColor: '#9c6b3e',
    backgroundImage: woodGrain('#9c6b3e'),
  },
  lightSquareNotationStyle: { color: '#8a5a2b', fontWeight: 700 },
  darkSquareNotationStyle: { color: '#f1dfc0', fontWeight: 700 },
  boardStyle: {
    borderRadius: '8px',
    boxShadow: '0 12px 28px rgba(0,0,0,0.35), inset 0 0 0 4px rgba(0,0,0,0.15)',
  },
  animationDurationInMs: 200,
};
