import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedAdminRoute({ children }) {
  const token = localStorage.getItem('adminToken');

  if (!token) {
    // Redirect to Admin Login if token doesn't exist
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}