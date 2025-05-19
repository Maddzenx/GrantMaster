'use client';

import React from 'react';
import RegisterForm from '@/components/auth/RegisterForm';
import LoginForm from '@/components/auth/LoginForm';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <RegisterForm />
    </div>
  );
}

export function LoginPage() {
  return <LoginForm />;
}

export function DashboardPage() {
  return (
    <ProtectedRoute>
      {/* Dashboard content here */}
    </ProtectedRoute>
  );
} 