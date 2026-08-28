import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-900 mb-2">Dashboard</h1>
      <p className="text-gray-600">
        Welcome back, <span className="font-semibold text-emerald-800">{user?.name}</span> ({user?.role}).
      </p>
      <p className="text-gray-500 mt-1">
        Reporting and quick actions will appear here in later phases.
      </p>
    </div>
  );
}