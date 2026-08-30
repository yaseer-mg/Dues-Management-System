import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrgList from './pages/OrgList';
import Members from './pages/Members';
import ManagePeriods from './pages/ManagePeriods';
import MemberContributions from './pages/MemberContributions';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/members" element={<Members />} />
            <Route path="/members/:id/contributions" element={<MemberContributions />} />
            <Route path="/periods" element={<ManagePeriods />} />
            <Route path="/zones" element={<OrgList title="Zones" endpoint="/api/zones" />} />
            <Route path="/units" element={<OrgList title="Units" endpoint="/api/units" />} />
            <Route path="/sub-units" element={<OrgList title="Sub-Units" endpoint="/api/sub-units" />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}