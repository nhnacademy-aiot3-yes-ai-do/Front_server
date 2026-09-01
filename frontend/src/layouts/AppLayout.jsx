import { Outlet } from "react-router-dom";
import AppHeader from "../components/AppHeader";

export default function AppLayout() {
  return (
    <div className="app-shell">
      <AppHeader />
      <Outlet />
    </div>
  );
}
