import {lazy, Suspense} from "react";
import {Navigate, Route, Routes} from "react-router-dom";
import {useAutoSession} from "./utils/useAutoSession";

const AppLayout = lazy(() => import("./layouts/AppLayout"));
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AuthLayout = lazy(() => import("./pages/auth/AuthLayout"));
const FindPasswordPage = lazy(() => import("./pages/auth/FindPasswordPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const SignupPage = lazy(() => import("./pages/auth/SignupPage"));
const CultivationCreatePage = lazy(() => import("./pages/cultivations/CultivationCreatePage"));
const CultivationDetailPage = lazy(() => import("./pages/cultivations/CultivationDetailPage"));
const CultivationHistoryPage = lazy(() => import("./pages/cultivations/CultivationHistoryPage"));
const CultivationListPage = lazy(() => import("./pages/cultivations/CultivationListPage"));
const CultivationSensorSetupPage = lazy(
  () => import("./pages/cultivations/CultivationSensorSetupPage"),
);
const NotificationSettingsPage = lazy(() => import("./pages/profile/NotificationSettingsPage"));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));
const SupportPage = lazy(() => import("./pages/support/SupportPage"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminInquiriesPage = lazy(() => import("./pages/admin/AdminInquiriesPage"));
const AdminLoginPage = lazy(() => import("./pages/admin/AdminLoginPage"));
const AdminMembersPage = lazy(() => import("./pages/admin/AdminMembersPage"));
const AdminMushroomsPage = lazy(() => import("./pages/admin/AdminMushroomsPage"));
const AdminNotificationsPage = lazy(() => import("./pages/admin/AdminNotificationsPage"));
const AdminSensorsPage = lazy(() => import("./pages/admin/AdminSensorsPage"));

export default function App() {
  useAutoSession();
  return (
    <Suspense fallback={<div className="route-loading">화면을 준비하고 있어요…</div>}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/signup/nickname" element={<Navigate to="/signup" replace />} />
          <Route path="/signup-nickname" element={<Navigate to="/signup" replace />} />
          <Route path="/find-password" element={<FindPasswordPage />} />
          <Route path="/verify-code" element={<FindPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="members" element={<AdminMembersPage />} />
          <Route path="inquiries" element={<AdminInquiriesPage />} />
          <Route path="mushrooms" element={<AdminMushroomsPage />} />
          <Route path="sensors" element={<AdminSensorsPage />} />
          <Route path="notification-events" element={<AdminNotificationsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route path="/cultivations" element={<CultivationListPage />} />
          <Route path="/cultivations/new" element={<CultivationCreatePage />} />
          <Route path="/cultivations/history" element={<CultivationHistoryPage />} />
          <Route
            path="/cultivations/:cultivationId/setup"
            element={<CultivationSensorSetupPage />}
          />
          <Route
            path="/cultivations/:cultivationId/daily-feedbacks/:feedbackDate"
            element={<CultivationDetailPage />}
          />
          <Route path="/cultivations/:cultivationId" element={<CultivationDetailPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/mypage" element={<ProfilePage />} />
          <Route path="/mypage/notifications" element={<NotificationSettingsPage />} />
          <Route path="/dashboard" element={<Navigate to="/cultivations" replace />} />
        </Route>
        <Route path="/" element={<Navigate to="/cultivations" replace />} />
        <Route path="*" element={<Navigate to="/cultivations" replace />} />
      </Routes>
    </Suspense>
  );
}
