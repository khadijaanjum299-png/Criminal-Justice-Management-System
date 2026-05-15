import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Contact from "@/pages/Contact";
import Features from "@/pages/Features";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import FIRs from "@/pages/FIRs";
import FIRNew from "@/pages/FIRNew";
import FIRDetail from "@/pages/FIRDetail";
import Cases from "@/pages/Cases";
import Investigator from "@/pages/Investigator";
import Suspects from "@/pages/Suspects";
import Evidence from "@/pages/Evidence";
import Forensic from "@/pages/Forensic";
import Court from "@/pages/Court";
import Judge from "@/pages/Judge";
import Blockchain from "@/pages/Blockchain";
import Analytics from "@/pages/Analytics";
import ActivityLogs from "@/pages/ActivityLogs";
import Users from "@/pages/Users";
import Fraud from "@/pages/Fraud";
import Admin from "@/pages/Admin";
import NotificationSettings from "@/pages/NotificationSettings";
import AICrimePredictor from "@/pages/AICrimePredictor";
import SmartContract from "@/pages/SmartContract";
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
  if (allow && !allow.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/features" element={<Features />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/notifications" element={<NotificationSettings />} />
            <Route
              path="/firs"
              element={
                <Protected allow={["citizen", "police", "judge", "admin"]}>
                  <FIRs />
                </Protected>
              }
            />
            <Route
              path="/firs/new"
              element={
                <Protected allow={["citizen"]}>
                  <FIRNew />
                </Protected>
              }
            />
            <Route
              path="/firs/:firId"
              element={
                <Protected allow={["citizen", "police", "investigator", "forensic", "court_officer", "judge", "admin"]}>
                  <FIRDetail />
                </Protected>
              }
            />
            <Route
              path="/cases"
              element={
                <Protected allow={["citizen", "police"]}>
                  <Cases />
                </Protected>
              }
            />
            <Route
              path="/investigator"
              element={
                <Protected allow={["investigator"]}>
                  <Investigator />
                </Protected>
              }
            />
            <Route
              path="/suspects"
              element={
                <Protected allow={["police", "investigator", "forensic", "court_officer", "judge"]}>
                  <Suspects />
                </Protected>
              }
            />
            <Route
              path="/evidence"
              element={
                <Protected allow={["judge", "court_officer"]}>
                  <Evidence />
                </Protected>
              }
            />
            <Route
              path="/forensic"
              element={
                <Protected allow={["police", "forensic", "judge"]}>
                  <Forensic />
                </Protected>
              }
            />
            <Route
              path="/court"
              element={
                <Protected allow={["court_officer"]}>
                  <Court />
                </Protected>
              }
            />
            <Route
              path="/judge"
              element={
                <Protected allow={["judge"]}>
                  <Judge />
                </Protected>
              }
            />
            <Route
              path="/blockchain"
              element={
                <Protected allow={["citizen", "police", "investigator", "forensic", "court_officer", "judge", "admin"]}>
                  <Blockchain />
                </Protected>
              }
            />
            <Route
              path="/analytics"
              element={
                <Protected allow={["citizen", "police", "investigator", "forensic", "court_officer", "admin", "judge"]}>
                  <Analytics />
                </Protected>
              }
            />
            <Route
              path="/ai-predictor"
              element={
                <Protected>
                  <AICrimePredictor />
                </Protected>
              }
            />
            <Route
              path="/smart-contract"
              element={
                <Protected allow={["police", "investigator", "forensic", "court_officer", "judge"]}>
                  <SmartContract />
                </Protected>
              }
            />
            <Route
              path="/activity"
              element={
                <Protected allow={["admin", "judge"]}>
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
            <Route
              path="/fraud"
              element={
                <Protected allow={["admin"]}>
                  <Fraud />
                </Protected>
              }
            />
            <Route
              path="/admin"
              element={
                <Protected allow={["admin"]}>
                  <Admin />
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
