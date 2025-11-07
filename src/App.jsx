// src/App.jsx
import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contextproviders/AuthContext";
import { ContactCenterProvider } from "./contextproviders/ContactCenterContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { Toaster } from "@/components/ui/sonner"





function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <></>;
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
}

function PublicRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div></div>;
  }
  return isAuthenticated ? <Navigate to="/dashboard" /> : <Outlet />;
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ContactCenterProvider>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<div>Page not found</div>} />
          </Routes>
        </ContactCenterProvider>
      </AuthProvider>
      <Toaster />
    </HashRouter>
  );
}

export default App;