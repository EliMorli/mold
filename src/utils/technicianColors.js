export const TECH_COLOR_BG = {
  Pink: 'bg-pink-400',
  Blue: 'bg-blue-400',
  Green: 'bg-green-400',
  Orange: 'bg-orange-400',
  Purple: 'bg-purple-400',
  Red: 'bg-red-400',
  Cyan: 'bg-cyan-400',
  Yellow: 'bg-yellow-400',
};

export const TECH_COLOR_TEXT = {
  Pink: 'text-pink-600',
  Blue: 'text-blue-600',
  Green: 'text-green-600',
  Orange: 'text-orange-600',
  Purple: 'text-purple-600',
  Red: 'text-red-600',
  Cyan: 'text-cyan-600',
  Yellow: 'text-yellow-600',
};

export const TECH_COLOR_SOFT = {
  Pink: 'bg-pink-50 border-pink-200',
  Blue: 'bg-blue-50 border-blue-200',
  Green: 'bg-green-50 border-green-200',
  Orange: 'bg-orange-50 border-orange-200',
  Purple: 'bg-purple-50 border-purple-200',
  Red: 'bg-red-50 border-red-200',
  Cyan: 'bg-cyan-50 border-cyan-200',
  Yellow: 'bg-yellow-50 border-yellow-200',
};

export const TECH_COLOR_BORDER = {
  Pink: 'border-l-pink-400',
  Blue: 'border-l-blue-400',
  Green: 'border-l-green-400',
  Orange: 'border-l-orange-400',
  Purple: 'border-l-purple-400',
  Red: 'border-l-red-400',
  Cyan: 'border-l-cyan-400',
  Yellow: 'border-l-yellow-400',
};

export const getTechColorClasses = (technician) => {
  const code = technician?.color_code || 'Purple';
  return {
    bg: TECH_COLOR_BG[code] || TECH_COLOR_BG.Purple,
    text: TECH_COLOR_TEXT[code] || TECH_COLOR_TEXT.Purple,
    soft: TECH_COLOR_SOFT[code] || TECH_COLOR_SOFT.Purple,
    border: TECH_COLOR_BORDER[code] || TECH_COLOR_BORDER.Purple,
  };
};
