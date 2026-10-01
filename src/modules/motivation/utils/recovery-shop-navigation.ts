/** Keep the shop return link on a lesson page, never an arbitrary URL. */
export function lessonRecoveryShopHref(lessonPath: string, brokenStreak: number) {
  const params = new URLSearchParams({ returnTo: lessonPath, streak: String(brokenStreak) });
  return `/student/shop?${params.toString()}#shop-recovery`;
}

export function parseLessonRecoveryShopQuery(search: string) {
  const params = new URLSearchParams(search);
  const returnTo = params.get("returnTo");
  const streak = Number(params.get("streak"));
  if (!returnTo || !/^\/(?:en\/|ru\/|uk\/)?courses\/[a-z0-9-]+\/lessons\/[a-z0-9-]+$/i.test(returnTo)) return null;
  if (!Number.isSafeInteger(streak) || streak < 1 || streak > 10_000) return null;
  return { returnTo, streak };
}
