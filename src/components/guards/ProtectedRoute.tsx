import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ForbiddenPage from '../../pages/ForbiddenPage';

interface ProtectedRouteProps {
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  children
}) => {
  const { user, token, pendingFirstLoginUser, hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Đang xác thực quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // If user must change password first, route to change-password-first-login
  if (pendingFirstLoginUser || user?.is_first_login) {
    return <Navigate to="/change-password-first-login" replace state={{ from: location }} />;
  }

  // If not logged in, redirect to /login
  if (!user || !token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Check required single permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <ForbiddenPage missingPermission={requiredPermission} />;
  }

  // Check required array of permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);

    if (!hasAccess) {
      return <ForbiddenPage missingPermission={requiredPermissions.join(', ')} />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
