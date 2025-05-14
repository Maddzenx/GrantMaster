"use client";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
      <p className="mb-6 text-gray-700">You do not have permission to view this page.</p>
      <Link href="/" className="text-blue-600 hover:underline">Return to Home</Link>
    </div>
  );
} 