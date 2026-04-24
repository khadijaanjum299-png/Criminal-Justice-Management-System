import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import FIRs from "@/pages/FIRs";
import FIRNew from "@/pages/FIRNew";
import FIRDetail from "@/pages/FIRDetail";
import Suspects from "@/pages/Suspects";
import Evidence from "@/pages/Evidence";
import Forensic from "@/pages/Forensic";
import Blockchain from "@/pages/Blockchain";
import Analytics from "@/pages/Analytics";
import ActivityLogs from "@/pages/ActivityLogs";
import Users from "@/pages/Users";
import "@/App.css";

function Protected({ children, allow }) {
  const { user, loading } = useAuth();
  if (loading || user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="micro-label">Loading…</div>
      </div>
    );
  }
  if (user === false) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(user.role) && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/firs" element={<FIRs />} />
            <Route path="/firs/new" element={<FIRNew />} />
            <Route path="/firs/:firId" element={<FIRDetail />} />
            <Route
              path="/suspects"
              element={
                <Protected allow={["police", "forensic"]}>
                  <Suspects />
                </Protected>
              }
            />
            <Route path="/evidence" element={<Evidence />} />
            <Route
              path="/forensic"
              element={
                <Protected allow={["police", "forensic"]}>
                  <Forensic />
                </Protected>
              }
            />
            <Route path="/blockchain" element={<Blockchain />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route
              path="/activity"
              element={
                <Protected allow={["admin", "police"]}>
                  <ActivityLogs />
                </Protected>
              }
            />
            <Route
              path="/users"
              element={
                <Protected allow={["admin"]}>
                  <Users />
                </Protected>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
