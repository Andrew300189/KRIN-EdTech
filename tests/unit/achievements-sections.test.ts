import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { requireAuth } from "@/core/server/session";
import { LocaleProvider } from "@/core/i18n/locale";
import { listUserAchievements } from "@/modules/motivation/services/motivation.service";
import { listStreakQuestBooks } from "@/modules/motivation/services/streak-quest-book.service";
import { listOpenedMilestoneChests } from "@/modules/motivation/services/reward-economy.service";
import { AchievementsPageContent } from "@/app/profile/achievements/AchievementsPageContent";

jest.mock("@/core/server/session", () => ({ requireAuth: jest.fn() }));
jest.mock("@/modules/motivation/services/motivation.service", () => ({ listUserAchievements: jest.fn() }));
jest.mock("@/modules/motivation/services/streak-quest-book.service", () => ({ listStreakQuestBooks: jest.fn() }));
jest.mock("@/modules/motivation/services/reward-economy.service", () => ({ listOpenedMilestoneChests: jest.fn() }));
jest.mock("@/modules/motivation/components/MilestoneChestsPanel", () => ({ MilestoneChestsPanel: () => "reward-chests-panel" }));
jest.mock("@/modules/motivation/components/OpenedMilestoneChests", () => ({ OpenedMilestoneChests: () => "opened-chests-panel" }));
jest.mock("@/modules/motivation/components/FlowerCollection", () => ({ FlowerCollectionLink: () => "flower-collection-link" }));
jest.mock("@/modules/motivation/components/MistakeCorrectionAchievements", () => ({ MistakeCorrectionAchievements: () => "correction-achievements-panel" }));
jest.mock("@/modules/motivation/components/StreakQuestBooksPanel", () => ({ StreakQuestBooksPanel: () => "quest-books-panel" }));
jest.mock("@/app/profile/achievements/QuestActivationButton", () => ({ QuestActivationButton: () => "activate-quest-button" }));

async function renderSection(query: { section?: string; filter?: string }) {
  const page = await AchievementsPageContent({ searchParams: Promise.resolve(query), basePath: "/student/achievements" });
  return renderToStaticMarkup(createElement(LocaleProvider, null, page));
}

describe("achievement page sections", () => {
  beforeEach(() => {
    (requireAuth as jest.Mock).mockResolvedValue({ user: { id: "student-1" } });
    (listUserAchievements as jest.Mock).mockResolvedValue([{
      id: "goal-1", title: "Reading goal", description: "Finish a lesson", icon: "star", rarity: "COMMON",
      progress: 0, target: 1, activatedAt: null, completed: false, completedAt: null,
      experienceReward: 10, unlockShopItemId: null,
    }]);
    (listStreakQuestBooks as jest.Mock).mockResolvedValue([]);
    (listOpenedMilestoneChests as jest.Mock).mockResolvedValue([]);
  });

  it("shows one focused section at a time", async () => {
    const rewards = await renderSection({ section: "REWARDS" });
    expect(rewards).toContain("reward-chests-panel");
    expect(rewards).toContain("opened-chests-panel");
    expect(rewards).not.toContain("correction-achievements-panel");
    expect(rewards).not.toContain("flower-collection-link");

    const collections = await renderSection({ section: "COLLECTIONS" });
    expect(collections).toContain("flower-collection-link");
    expect(collections).toContain('href="/student/quests"');
    expect(collections).toContain("Quests");
    expect(collections).not.toContain("quest-books-panel");
    expect(collections).not.toContain("reward-chests-panel");

    const goals = await renderSection({ section: "GOALS", filter: "AVAILABLE" });
    expect(goals).toContain("Reading goal");
    expect(goals).toContain("correction-achievements-panel");
    expect(goals).toContain("section=GOALS&amp;filter=COMPLETED");
    expect(goals).not.toContain("reward-chests-panel");
  });
});
