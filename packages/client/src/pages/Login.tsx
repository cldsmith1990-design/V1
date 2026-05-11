import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login' ? { email, password } : { email, name, password };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Authentication failed');
      setAuth(data.user, data.token);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dungeon-900 px-4">
      {/* Background texture overlay */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, #d4871a 0%, transparent 50%), radial-gradient(circle at 75% 75%, #d4871a 0%, transparent 50%)',
        }}
      />

      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎲</div>
          <h1 className="fantasy-heading text-3xl font-bold tracking-wider">Tavern Table</h1>
          <p className="text-dungeon-400 text-sm mt-2">Your private D&D virtual tabletop</p>
        </div>

        {/* Card */}
        <div className="panel p-8">
          {/* Mode Toggle */}
          <div className="flex mb-6 bg-dungeon-900 rounded-lg p-1">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === m
                    ? 'bg-dungeon-600 text-parchment-100'
                    : 'text-dungeon-400 hover:text-parchment-300'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label block mb-1">Display Name</label>
                <input
                  className="input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Gandalf the Grey"
                  required
                  minLength={2}
                  maxLength={40}
                />
              </div>
            )}

            <div>
              <label className="label block mb-1">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="wizard@adventurers.guild"
                required
              />
            </div>

            <div>
              <label className="label block mb-1">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
                required
                minLength={mode === 'register' ? 8 : 1}
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : mode === 'login' ? 'Enter the Tavern' : 'Begin Your Journey'}
            </button>
          </form>
        </div>

        <p className="text-center text-dungeon-500 text-xs mt-4">
          Join via an invite link? Log in first, then open the link.
        </p>
      </div>
    </div>
  );
}
