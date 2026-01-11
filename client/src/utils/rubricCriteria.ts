// Rubric criteria definitions with weights

export const RUBRIC_CRITERIA = {
  kick: {
    maxScore: 4,
    criteria: [
      { id: 'attempt', label: 'Attempt', weight: 0.5 },
      { id: 'alignment', label: 'Alignment', weight: 1.0 },
      { id: 'control', label: 'Control', weight: 1.0 },
      { id: 'engagement', label: 'Engagement', weight: 1.0 },
      { id: 'difficulty', label: 'Difficulty', weight: 0.5 }
    ]
  },
  jump: {
    maxScore: 4,
    criteria: [
      { id: 'attempt', label: 'Attempt', weight: 0.5 },
      { id: 'alignment', label: 'Alignment', weight: 1.0 },
      { id: 'control', label: 'Control', weight: 1.0 },
      { id: 'engagement', label: 'Engagement', weight: 1.0 },
      { id: 'difficulty', label: 'Difficulty', weight: 0.5 }
    ]
  },
  turn: {
    maxScore: 4,
    criteria: [
      { id: 'attempt', label: 'Attempt', weight: 0.5 },
      { id: 'alignment', label: 'Alignment', weight: 1.0 },
      { id: 'control', label: 'Control', weight: 1.0 },
      { id: 'engagement', label: 'Engagement', weight: 1.0 },
      { id: 'difficulty', label: 'Difficulty', weight: 0.5 }
    ]
  },
  performance: {
    maxScore: 4,
    criteria: [
      { id: 'effort', label: 'Effort', weight: 0.8 },
      { id: 'energy', label: 'Energy', weight: 0.8 },
      { id: 'confidence', label: 'Confidence', weight: 0.8 },
      { id: 'facials', label: 'Facials', weight: 0.8 },
      { id: 'personality', label: 'Personality', weight: 0.8 }
    ]
  },
  execution: {
    maxScore: 8,
    criteria: [
      { id: 'retention', label: 'Retention', weight: 1.6 },
      { id: 'precision', label: 'Precision', weight: 1.6 },
      { id: 'musicality', label: 'Musicality', weight: 1.6 },
      { id: 'clarity', label: 'Clarity', weight: 1.6 },
      { id: 'consistency', label: 'Consistency', weight: 1.6 }
    ]
  },
  technique: {
    maxScore: 8,
    criteria: [
      { id: 'attempted', label: 'Attempted', weight: 1.6 },
      { id: 'control', label: 'Control', weight: 1.6 },
      { id: 'alignment', label: 'Alignment', weight: 1.6 },
      { id: 'engagement', label: 'Engagement', weight: 1.6 },
      { id: 'heightPower', label: 'Height/Power', weight: 1.6 }
    ]
  }
};

export const calculateScoreFromCheckboxes = (
  category: keyof typeof RUBRIC_CRITERIA,
  checkedCriteria: string[]
): number => {
  const categoryData = RUBRIC_CRITERIA[category];
  let totalScore = 0;

  checkedCriteria.forEach(criteriaId => {
    const criterion = categoryData.criteria.find(c => c.id === criteriaId);
    if (criterion) {
      totalScore += criterion.weight;
    }
  });

  // Round to 1 decimal place and cap at max score
  return Math.min(Math.round(totalScore * 10) / 10, categoryData.maxScore);
};


