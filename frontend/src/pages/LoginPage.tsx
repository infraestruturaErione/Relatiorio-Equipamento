import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('admin1');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (_err) {
      setError('Usuario ou senha invalidos.');
    }
  };

  return (
    <div className="login-page login-page-centered">
      <form className="card login-card login-card-compact" onSubmit={handleSubmit}>
        <img src="/logo-erione-cor-768x218.png" alt="Relatorio-Campo" className="login-logo" />
        <input
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          placeholder="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
