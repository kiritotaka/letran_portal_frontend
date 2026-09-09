import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface CanProps {
  do?: string;
  anyOf?: string[];
  allOf?: string[];
  role?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  do: permissionCode,
  anyOf,
  allOf,
  role: requiredRole,
  fallback = null,
  children
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, role, user } = useAuth();

  if (requiredRole) {
    if (role?.id !== requiredRole && user?.roleId !== requiredRole && user?.roleId !== 'admin') {
      return <>{fallback}</>;
    }
  }

  if (permissionCode && !hasPermission(permissionCode)) {
    return <>{fallback}</>;
  }

  if (anyOf && anyOf.length > 0 && !hasAnyPermission(anyOf)) {
    return <>{fallback}</>;
  }

  if (allOf && allOf.length > 0 && !hasAllPermissions(allOf)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default Can;
