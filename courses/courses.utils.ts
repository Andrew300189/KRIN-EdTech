export function formatCourseDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

export function getCourseLevelLabel(level: string) {
  return level.charAt(0).toUpperCase() + level.slice(1);
}
