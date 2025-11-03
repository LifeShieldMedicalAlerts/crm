// src/App.jsx
import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contextproviders/AuthContext";
import { ContactCenterProvider } from "./contextproviders/ContactCenterContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { Toaster } from "@/components/ui/sonner"





// Protected route component
function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <></>;
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
}

// Public route component
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
            {/* Public routes */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
            </Route>
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
            
            {/* Redirect root to dashboard or login based on auth state */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* 404 route */}
            <Route path="*" element={<div>Page not found</div>} />
          </Routes>
        </ContactCenterProvider>
      </AuthProvider>
      <Toaster />
    </HashRouter>
  );
}

export default App;