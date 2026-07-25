export default function CoursesPage() {
  const courses = [
    { id: 1, title: "English Basics", level: "Beginner", progress: 60 },
    { id: 2, title: "Business English", level: "Intermediate", progress: 45 },
    { id: 3, title: "Advanced Grammar", level: "Advanced", progress: 30 },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">My Courses</h2>

      <div className="grid gap-4">
        {courses.map((course) => (
          <div key={course.id} className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{course.title}</h3>
                <p className="text-sm text-gray-600">{course.level}</p>
              </div>
              <button className="btn btn-primary btn-sm">Continue</button>
            </div>
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${course.progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {course.progress}% Complete
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
