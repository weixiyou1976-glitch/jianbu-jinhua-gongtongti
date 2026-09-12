import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import UpdatePrompt from './components/UpdatePrompt';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Skills from './pages/Skills';
import SkillDetail from './pages/SkillDetail';
import TagSkills from './pages/TagSkills';
import Modules from './pages/Modules';
import ModuleDetail from './pages/ModuleDetail';
import Stamp from './pages/Stamp';
import Progress from './pages/Progress';
import Admin from './pages/Admin';

const LAST_PATH_KEY = 'lastPath';

function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RootRedirect() {
  const saved = localStorage.getItem(LAST_PATH_KEY);
  const target = saved && saved !== '/' && saved !== '/login' ? saved : '/dashboard';
  return <Navigate to={target} replace />;
}

function PathRecorder() {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname !== '/login' && location.pathname !== '/') {
      localStorage.setItem(LAST_PATH_KEY, location.pathname);
    }
  }, [location.pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <UpdatePrompt />
      <PathRecorder />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/skills" element={<ProtectedRoute><Skills /></ProtectedRoute>} />
        <Route path="/skill/:id" element={<ProtectedRoute><SkillDetail /></ProtectedRoute>} />
        <Route path="/tag/:tag" element={<ProtectedRoute><TagSkills /></ProtectedRoute>} />
        <Route path="/modules" element={<ProtectedRoute><Modules /></ProtectedRoute>} />
        <Route path="/modules/:slug" element={<ProtectedRoute><ModuleDetail /></ProtectedRoute>} />
        <Route path="/stamp" element={<ProtectedRoute><Stamp /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
