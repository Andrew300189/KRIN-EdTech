export default function AchievementsPage() {
  const achievements = [
    {
      id: 1,
      title: "First Steps",
      description: "Complete your first lesson",
      icon: "🎯",
    },
    {
      id: 2,
      title: "100 Words",
      description: "Learn 100 new words",
      icon: "📚",
    },
    {
      id: 3,
      title: "7 Day Streak",
      description: "Learn for 7 consecutive days",
      icon: "🔥",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Achievements</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className="bg-white p-6 rounded-lg shadow-sm text-center"
          >
            <p className="text-4xl mb-2">{achievement.icon}</p>
            <h3 className="font-semibold">{achievement.title}</h3>
            <p className="text-sm text-gray-600">{achievement.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
