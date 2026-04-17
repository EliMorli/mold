// Default durations by test category (in minutes).
// Fills one 2-hour slot by default for scheduling purposes.
const CATEGORY_DEFAULTS = {
  Initial: 120,
  Clearance: 120,
};

export const DEFAULT_DURATION_MINUTES = 120;

export const getJobDuration = (test) => {
  if (typeof test?.duration_minutes === 'number' && test.duration_minutes > 0) {
    return test.duration_minutes;
  }
  return CATEGORY_DEFAULTS[test?.test_category] ?? DEFAULT_DURATION_MINUTES;
};
