'use client';

import AdminPanel from '../components/AdminPanel';

export default function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  return (
    <main className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Admin Panel</h1>
        <AdminPanel />
      </div>
    </main>
  );
}


