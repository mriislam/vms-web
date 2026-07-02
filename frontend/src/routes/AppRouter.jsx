import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import MainLayout from '../layouts/MainLayout';
import LoginPage from '../pages/Login';

// Page imports
import Dashboard from '../pages/Dashboard';
import Vehicles from '../pages/Vehicles';
import Drivers from '../pages/Drivers';
import Requisitions from '../pages/Requisitions';
import Dispatch from '../pages/Dispatch';
import Accidents from '../pages/Accidents';
import Routes_ from '../pages/Routes';
import Fuel from '../pages/Fuel';
import Maintenance from '../pages/Maintenance';
import Inventory from '../pages/Inventory';
import Expenses from '../pages/Expenses';
import Vendors from '../pages/Vendors';
import DriverLeave from '../pages/DriverLeave';
import Coordinators from '../pages/Coordinators';
import Parking from '../pages/Parking';
import Notices from '../pages/Notices';
import Reports from '../pages/Reports';
import VTSMap from '../pages/VTSMap';
import AllInsights from '../pages/AllInsights';
import UserAdmin from '../pages/UserAdmin';
import RolePermissions from '../pages/RolePermissions';
import Settings from '../pages/Settings';
import AuditLog from '../pages/AuditLog';
import Developer from '../pages/Developer';
import ServiceCenter from '../pages/ServiceCenter';
import SingleBooking from '../pages/SingleBooking';
import MultipleBooking from '../pages/MultipleBooking';
import ManageTrip from '../pages/ManageTrip';
import BookingLog from '../pages/BookingLog';
import ApprovalAuthority from '../pages/ApprovalAuthority';
import TPTRequisition from '../pages/TPTRequisition';
import PMMaintenance from '../pages/PMMaintenance';
import MaintenanceApproval from '../pages/MaintenanceApproval';
import DriverTrips from '../pages/DriverTrips';
import Employees from '../pages/Employees';
import Department from '../pages/Department';

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="requisitions" element={<Requisitions />} />
        <Route path="vehicle-requisition" element={<Dispatch />} />
        <Route path="accidents" element={<Accidents />} />
        <Route path="routes" element={<Routes_ />} />
        <Route path="fuel" element={<Fuel />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="driver-leave" element={<DriverLeave />} />
        <Route path="coordinators" element={<Coordinators />} />
        <Route path="parking" element={<Parking />} />
        <Route path="notices" element={<Notices />} />
        <Route path="reports" element={<Reports />} />
        <Route path="vts-map" element={<VTSMap />} />
        <Route path="insights" element={<AllInsights />} />
        <Route path="user-admin" element={<UserAdmin />} />
        <Route path="role-permissions" element={<RolePermissions />} />
        <Route path="audit-log" element={<AuditLog />} />
        <Route path="settings" element={<Settings />} />
        <Route path="developer"       element={<Developer />} />
        <Route path="service-centers" element={<ServiceCenter />} />
        <Route path="booking/single"     element={<SingleBooking />} />
        <Route path="booking/multiple"   element={<MultipleBooking />} />
        <Route path="booking/manage-trip" element={<ManageTrip />} />
        <Route path="booking/log"        element={<BookingLog />} />
        <Route path="booking/approval"   element={<ApprovalAuthority />} />
        <Route path="booking/tpt"        element={<TPTRequisition />} />
        <Route path="pm-maintenance"        element={<PMMaintenance />} />
        <Route path="maintenance-approval"  element={<MaintenanceApproval />} />
        <Route path="driver/trips"          element={<DriverTrips />} />
        <Route path="employees"             element={<Employees />} />
        <Route path="departments"           element={<Department />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
