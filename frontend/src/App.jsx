import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const AppLayout = lazy(() => import("./layouts/AppLayout"));
const AuthLayout = lazy(() => import("./pages/auth/AuthLayout"));
const FindPasswordPage = lazy(() => import("./pages/auth/FindPasswordPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const SignupPage = lazy(() => import("./pages/auth/SignupPage"));
const CultivationCreatePage = lazy(() => import("./pages/cultivations/CultivationCreatePage"));
const CultivationDetailPage = lazy(() => import("./pages/cultivations/CultivationDetailPage"));
const CultivationHistoryPage = lazy(() => import("./pages/cultivations/CultivationHistoryPage"));
const CultivationListPage = lazy(() => import("./pages/cultivations/CultivationListPage"));
const NotificationSettingsPage = lazy(() => import("./pages/profile/NotificationSettingsPage"));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));
const SupportPage = lazy(() => import("./pages/support/SupportPage"));

export default function App() {
  return (
    <Suspense fallback={<div className="route-loading">화면을 준비하고 있어요…</div>}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/signup/nickname" element={<Navigate to="/signup" replace />} />
          <Route path="/signup-nickname" element={<Navigate to="/signup" replace />} />
          <Route path="/find-password" element={<FindPasswordPage />} />
          <Route path="/verify-code" element={<FindPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route path="/cultivations" element={<CultivationListPage />} />
          <Route path="/cultivations/new" element={<CultivationCreatePage />} />
          <Route path="/cultivations/history" element={<CultivationHistoryPage />} />
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
