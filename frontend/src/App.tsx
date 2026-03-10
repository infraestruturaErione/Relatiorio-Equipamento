import { Navigate, Route, Routes } from 'react-router-dom';
import ClientsPage from './pages/ClientsPage';
import ProtectedRoute from './components/ProtectedRoute';
import ConfigDetailsPage from './pages/ConfigDetailsPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import NewConfigPage from './pages/NewConfigPage';
import PendingPage from './pages/PendingPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import ProjectsPage from './pages/ProjectsPage';
import ReportsPage from './pages/ReportsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailsPage />} />
        <Route path="/new" element={<NewConfigPage />} />
        <Route path="/pending" element={<PendingPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/configs/:id" element={<ConfigDetailsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
