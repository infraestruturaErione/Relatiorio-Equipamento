import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const menu = [
  { path: '/', label: 'Painel' },
  { path: '/new', label: 'Nova Configuracao' },
  { path: '/pending', label: 'Validacoes Pendentes' },
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
        <h1>Sistema de Campo</h1>
        <p>Analista: {user?.name}</p>
        <button type="button" onClick={toggleTheme}>
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
