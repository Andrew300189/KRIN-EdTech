export type LessonAttemptForResult = {
  exerciseId: string;
  isCorrect: boolean;
  scoreAwarded: number;
  attemptNumber: number;
  createdAt?: Date;
};

export function gradeForPercent(percent: number) {
  if (percent >= 90) return 5;
  if (percent >= 75) return 4;
  if (percent >= 60) return 3;
  return 2;
}

export function calculateLessonResult(attempts: LessonAttemptForResult[]) {
  const latestByExercise = new Map<string, LessonAttemptForResult>();
  for (const attempt of attempts) {
    const previous = latestByExercise.get(attempt.exerciseId);
    if (!previous || attempt.attemptNumber > previous.attemptNumber || (attempt.attemptNumber === previous.attemptNumber && (attempt.createdAt?.getTime() ?? 0) > (previous.createdAt?.getTime() ?? 0))) {
      latestByExercise.set(attempt.exerciseId, attempt);
    }
  }
  const latest = [...latestByExercise.values()];
  const correctAnswers = latest.filter((attempt) => attempt.isCorrect).length;
  const incorrectAnswers = latest.length - correctAnswers;
  const completionPercent = latest.length === 0 ? 0 : Math.round((correctAnswers / latest.length) * 100);
  return {
    correctAnswers,
    incorrectAnswers,
    score: latest.reduce((sum, attempt) => sum + attempt.scoreAwarded, 0),
    completionPercent,
    grade: gradeForPercent(completionPercent),
  };
}
