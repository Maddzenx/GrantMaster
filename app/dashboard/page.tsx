'use client';

import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>Dashboard content here</div>
    </ProtectedRoute>
  );
}