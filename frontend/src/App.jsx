import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrgList from './pages/OrgList';
import Members from './pages/Members';
import ManagePeriods from './pages/ManagePeriods';
import SubUnitRecords from './pages/SubUnitRecords';
import UnitRecords from './pages/UnitRecords';
import MemberContributions from './pages/MemberContributions';
import CollectCash from './pages/CollectCash';
import PayLink from './pages/PayLink';
import ReceiptVerify from './pages/ReceiptVerify';
import Reports from './pages/Reports';
import RegionSummary from './pages/RegionSummary';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/pay/:token" element={<PayLink />} />
          <Route path="/receipt/verify/:verification_code" element={<ReceiptVerify />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/zones" element={<OrgList title="Zones" endpoint="/api/zones" createKind="zone" />} />
            <Route path="/units" element={<OrgList title="Units" endpoint="/api/units" createKind="unit" />} />
            <Route path="/sub-units" element={<OrgList title="Sub-Units" endpoint="/api/sub-units" createKind="subUnit" />} />
            <Route path="/members" element={<Members />} />
            <Route path="/members/:id/contributions" element={<MemberContributions />} />
            <Route path="/periods" element={<ManagePeriods />} />
            <Route path="/collect" element={<CollectCash />} />
            <Route path="/sub-unit" element={<SubUnitRecords />} />
            <Route path="/unit-records" element={<UnitRecords />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/regions" element={<RegionSummary />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}