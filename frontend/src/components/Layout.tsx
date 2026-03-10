import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const menu = [
  { path: '/', label: 'Dashboard' },
  { path: '/clients', label: 'Clientes' },
  { path: '/projects', label: 'Projetos' },
  { path: '/new', label: 'Nova Config' },
  { path: '/pending', label: 'Pendentes' },
  { path: '/history', label: 'Historico' },
  { path: '/reports', label: 'Relatorios' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo-erione-cor-768x218.png" alt="Relatorio-Campo" className="sidebar-logo" />
        </div>
        <p className="sidebar-user">Analista: {user?.name}</p>
        <button type="button" className="sidebar-toggle" onClick={toggleTheme}>
          Tema: {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
        <nav>
          {menu.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={pathname === item.path ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button className="danger" onClick={handleLogout} type="button">
          Sair
        </button>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
