import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', activation_code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data =
        mode === 'login'
          ? await api.login({ email: form.email, password: form.password })
          : await api.register(form);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-paper">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold text-ink tracking-wide">渐步进化共同体</h1>
          <p className="text-ink/50 text-sm mt-2">一周一枚策印，持续52周的进化路径</p>
        </div>

        <div className="flex mb-8 border-b border-vermilion/15">
          <button
            className={`flex-1 pb-3 text-sm ${mode === 'login' ? 'text-vermilion border-b-2 border-vermilion font-semibold' : 'text-ink/40'}`}
            onClick={() => setMode('login')}
          >
            登录
          </button>
          <button
            className={`flex-1 pb-3 text-sm ${mode === 'register' ? 'text-vermilion border-b-2 border-vermilion font-semibold' : 'text-ink/40'}`}
            onClick={() => setMode('register')}
          >
            激活码注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="激活码"
              value={form.activation_code}
              onChange={(e) => update('activation_code', e.target.value)}
              className="w-full border border-vermilion/20 bg-white/60 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-vermilion"
              required
            />
          )}
          <input
            type="email"
            placeholder="邮箱"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full border border-vermilion/20 bg-white/60 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-vermilion"
            required
          />
          <input
            type="password"
            placeholder="密码（至少6位）"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="w-full border border-vermilion/20 bg-white/60 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-vermilion"
            required
            minLength={6}
          />

          {error && <p className="text-vermilion text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-vermilion text-paper rounded-lg py-3 text-sm font-medium tracking-wide disabled:opacity-50"
          >
            {loading ? '处理中…' : mode === 'login' ? '登录' : '注册并开始'}
          </button>
        </form>
      </div>
    </div>
  );
}
