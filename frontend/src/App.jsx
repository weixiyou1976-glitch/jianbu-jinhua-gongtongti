import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import UpdatePrompt from './components/UpdatePrompt';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Skills from './pages/Skills';
import SkillDetail from './pages/SkillDetail';
import TagSkills from './pages/TagSkills';
import Stamp from './pages/Stamp';
import Progress from './pages/Progress';
import Admin from './pages/Admin';

function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <UpdatePrompt />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/skills" element={<ProtectedRoute><Skills /></ProtectedRoute>} />
        <Route path="/skill/:id" element={<ProtectedRoute><SkillDetail /></ProtectedRoute>} />
        <Route path="/tag/:tag" element={<ProtectedRoute><TagSkills /></ProtectedRoute>} />
        <Route path="/stamp" element={<ProtectedRoute><Stamp /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
