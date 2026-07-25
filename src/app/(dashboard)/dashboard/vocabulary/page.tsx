export default function VocabularyPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Vocabulary</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm text-center">
          <p className="text-3xl font-bold text-primary">342</p>
          <p className="text-gray-600 text-sm mt-2">Words Learned</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm text-center">
          <p className="text-3xl font-bold text-yellow-500">45</p>
          <p className="text-gray-600 text-sm mt-2">To Review</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm text-center">
          <p className="text-3xl font-bold text-green-500">89</p>
          <p className="text-gray-600 text-sm mt-2">Mastered</p>
        </div>
      </div>
    </div>
  );
}
