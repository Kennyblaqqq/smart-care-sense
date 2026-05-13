import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Public
import Auth    from "@/pages/Auth";
import Index   from "@/pages/Index";
import NotFound from "@/pages/NotFound";

// Patient
import Dashboard    from "@/pages/Dashboard";
import Alerts       from "@/pages/Alerts";
import Assistant    from "@/pages/Assistant";
import Devices      from "@/pages/Devices";
import Profile      from "@/pages/Profile";
import Appointments from "@/pages/patient/Appointments";
import Prescriptions from "@/pages/patient/Prescriptions";
import Messages     from "@/pages/patient/Messages";

// Doctor
import DoctorDashboard    from "@/pages/doctor/DoctorDashboard";
import PatientList        from "@/pages/doctor/PatientList";
import PatientDetail      from "@/pages/doctor/PatientDetail";
import DoctorAlerts       from "@/pages/doctor/DoctorAlerts";
import DoctorAppointments from "@/pages/doctor/DoctorAppointments";
import DoctorAvailability from "@/pages/doctor/DoctorAvailability";
import WeeklyReports      from "@/pages/doctor/WeeklyReports";
import DoctorProfile      from "@/pages/doctor/DoctorProfile";

// Admin
import AdminDashboard          from "@/pages/admin/AdminDashboard";
import UserManagement          from "@/pages/admin/UserManagement";
import DoctorVerification      from "@/pages/admin/DoctorVerification";
import DoctorPatientAssignment from "@/pages/admin/DoctorPatientAssignment";
import PlatformAlerts          from "@/pages/admin/PlatformAlerts";
import PlatformAnalytics       from "@/pages/admin/PlatformAnalytics";
import SystemSettings          from "@/pages/admin/SystemSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* ── Public ─────────────────────────────── */}
            <Route path="/auth"  element={<Auth />} />
            <Route path="/index" element={<Index />} />

            {/* ── Patient routes ──────────────────────── */}
            <Route path="/" element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/alerts" element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <Alerts />
              </ProtectedRoute>
            } />
            <Route path="/assistant" element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <Assistant />
              </ProtectedRoute>
            } />
            <Route path="/devices" element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <Devices />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/appointments" element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <Appointments />
              </ProtectedRoute>
            } />
            <Route path="/prescriptions" element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <Prescriptions />
              </ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <Messages />
              </ProtectedRoute>
            } />

            {/* ── Doctor routes ───────────────────────── */}
            <Route path="/doctor" element={
              <ProtectedRoute allowedRoles={["doctor"]}>
                <DoctorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/doctor/patients" element={
              <ProtectedRoute allowedRoles={["doctor"]}>
                <PatientList />
              </ProtectedRoute>
            } />
            <Route path="/doctor/patients/:id" element={
              <ProtectedRoute allowedRoles={["doctor"]}>
                <PatientDetail />
              </ProtectedRoute>
            } />
            <Route path="/doctor/alerts" element={
              <ProtectedRoute allowedRoles={["doctor"]}>
                <DoctorAlerts />
              </ProtectedRoute>
            } />
            <Route path="/doctor/appointments" element={
              <ProtectedRoute allowedRoles={["doctor"]}>
                <DoctorAppointments />
              </ProtectedRoute>
            } />
            <Route path="/doctor/availability" element={
              <ProtectedRoute allowedRoles={["doctor"]}>
                <DoctorAvailability />
              </ProtectedRoute>
            } />
            <Route path="/doctor/reports" element={
              <ProtectedRoute allowedRoles={["doctor"]}>
                <WeeklyReports />
              </ProtectedRoute>
            } />
            <Route path="/doctor/profile" element={
              <ProtectedRoute allowedRoles={["doctor"]}>
                <DoctorProfile />
              </ProtectedRoute>
            } />

            {/* ── Admin routes ────────────────────────── */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/verify" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <DoctorVerification />
              </ProtectedRoute>
            } />
            <Route path="/admin/assignments" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <DoctorPatientAssignment />
              </ProtectedRoute>
            } />
            <Route path="/admin/alerts" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <PlatformAlerts />
              </ProtectedRoute>
            } />
            <Route path="/admin/analytics" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <PlatformAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <SystemSettings />
              </ProtectedRoute>
            } />

            {/* ── Catch-all ───────────────────────────── */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
