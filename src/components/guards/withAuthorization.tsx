import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ForbiddenPage from '../../pages/ForbiddenPage';

interface AuthorizationOptions {
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean;
}

/**
 * Higher-Order Component (HOC) for protecting routes and components with RBAC
 * Usage:
 *   const ProtectedUserList = withAuthorization(UserListPage, 'users.view');
 */
export function withAuthorization<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  optionsOrPermission?: string | AuthorizationOptions
) {
  const options: AuthorizationOptions =
    typeof optionsOrPermission === 'string'
      ? { requiredPermission: optionsOrPermission }
      : optionsOrPermission || {};

  const WithAuthorizationComponent: React.FC<P> = (props) => {
    const { user, token, pendingFirstLoginUser, hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Đang kiểm tra quyền...</p>
          </div>
        </div>
      );
    }

    if (pendingFirstLoginUser || user?.is_first_login) {
      return <Navigate to="/change-password-first-login" replace state={{ from: location }} />;
    }

    if (!user || !token) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (options.requiredPermission && !hasPermission(options.requiredPermission)) {
      return <ForbiddenPage missingPermission={options.requiredPermission} />;
    }

    if (options.requiredPermissions && options.requiredPermissions.length > 0) {
      const hasAccess = options.requireAll
        ? hasAllPermissions(options.requiredPermissions)
        : hasAnyPermission(options.requiredPermissions);

      if (!hasAccess) {
        return <ForbiddenPage missingPermission={options.requiredPermissions.join(', ')} />;
      }
    }

    return <WrappedComponent {...props} />;
  };

  WithAuthorizationComponent.displayName = `WithAuthorization(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithAuthorizationComponent;
}

export default withAuthorization;
