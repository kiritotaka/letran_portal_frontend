import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import GlobalNotification from './components/common/GlobalNotification';
import GlobalLoadingOverlay from './components/common/GlobalLoadingOverlay';
import ProtectedRoute from './components/guards/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';

// Pages
import LoginPage from './pages/LoginPage';
import FirstLoginChangePasswordPage from './pages/FirstLoginChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import PermissionsPage from './pages/PermissionsPage';
import UsersPage from './pages/UsersPage';
import HRPage from './pages/HRPage';
import ReportsPage from './pages/ReportsPage';
import DocumentsPage from './pages/DocumentsPage';
import SettingsPage from './pages/SettingsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          {/* Centralized Global Notification Toast (powered by Zustand & Axios Interceptor) */}
          <GlobalNotification />

          {/* Global API Loading Overlay with Anti-flicker Debounce & Multi-request Counter */}
          <GlobalLoadingOverlay />

          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/change-password-first-login"
              element={<FirstLoginChangePasswordPage />}
            />
            <Route path="/forbidden" element={<ForbiddenPage />} />

            {/* Protected Application Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard: default home */}
              <Route index element={<DashboardPage />} />
              <Route path="dashboard" element={<Navigate to="/" replace />} />

              {/* Permissions & Roles Management (RBAC Tree View) */}
              <Route
                path="permissions"
                element={
                  <ProtectedRoute requiredPermission="PERM_VIEW">
                    <PermissionsPage />
                  </ProtectedRoute>
                }
              />

              {/* Users Management */}
              <Route
                path="users"
                element={
                  <ProtectedRoute requiredPermission="USER_VIEW">
                    <UsersPage />
                  </ProtectedRoute>
                }
              />

              {/* HR Management (Quản lý nhân sự) */}
              <Route path="hr" element={<HRPage />} />

              {/* Reports (Protected by withAuthorization HOC inside the page) */}
              <Route path="reports" element={<ReportsPage />} />

              {/* Documents (Protected by withAuthorization HOC inside the page) */}
              <Route path="documents" element={<DocumentsPage />} />

              {/* Settings (Protected by withAuthorization HOC inside the page) */}
              <Route path="settings" element={<SettingsPage />} />

              {/* Audit Logs (Protected by withAuthorization HOC inside the page) */}
              <Route path="audit-logs" element={<AuditLogsPage />} />

              {/* 404 Fallback within layout */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
