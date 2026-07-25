export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Manage Users</h2>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="px-6 py-3">John Doe</td>
              <td className="px-6 py-3">john@example.com</td>
              <td className="px-6 py-3">Student</td>
              <td className="px-6 py-3">
                <button className="text-primary hover:underline">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
