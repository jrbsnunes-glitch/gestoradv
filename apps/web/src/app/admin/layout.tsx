'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('admin_user') || '{}');
      if (u.name) setAdminName(u.name);
    } catch { /* ignore */ }
  }, []);

  const menuItems = [
    { label: 'Dashboard', href: '/admin', icon: '📊' },
    { label: 'Escritórios', href: '/admin/escritorios', icon: '🏢' },
    { label: 'Licenças', href: '/admin/licencas', icon: '🔑' },
    { label: 'Planos', href: '/admin/planos', icon: '📋' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/admin/login';
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-5 border-b border-gray-700">
          <h1 className="text-lg font-bold text-white">GestorAdv Admin</h1>
          <p className="text-xs text-gray-400 mt-1">Painel do Fornecedor</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-gray-300">{adminName}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-red-400 hover:text-red-300 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
