import { useState } from 'react';
import { LogIn, User, Hash, Lock, Loader2 } from 'lucide-react';
import { Employee, WorkSession, loginEmployee, getTodaySession } from '../lib/supabase';

interface LoginScreenProps {
  onLogin: (employee: Employee, session: WorkSession) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [employeeCode, setEmployeeCode] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!employeeCode.trim() || !password.trim()) {
      setError('Employee code and password are required.');
      return;
    }
    setLoading(true);
    try {
      console.log('[Login] Attempting login for:', employeeCode);
      const { employee, error } = await loginEmployee(
        employeeCode,
        employeeName,
        password
      );

      if (error) {
        console.error('[Login] Auth error:', error);
        setError('Login failed. Please check your credentials or try again.');
        return;
      }

      if (!employee) {
        console.error('[Login] No employee found');
        setError('Invalid credentials or user not found. Please check your details.');
        return;
      }

      console.log('[Login] Employee found:', employee.employee_code);
      const session = await getTodaySession(employee.id);
      if (!session) {
        console.error('[Login] Failed to create/fetch session');
        setError('Failed to load your session. Please try again.');
        return;
      }

      console.log('[Login] Session created/fetched:', session.id);
      onLogin(employee, session);
    } catch (err) {
      console.error('[Login] Exception:', err);
      setError('Login error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-pink-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-rose-100 rounded-full opacity-50 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl shadow-lg mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Knockturn</h1>
          <p className="text-pink-500 font-medium mt-1">Employee Productivity Agent</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-pink-100 p-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-6">Sign In to Your Account</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Employee Code */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Employee Code</label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
                <input
                  type="text"
                  value={employeeCode}
                  onChange={e => setEmployeeCode(e.target.value)}
                  placeholder="e.g. EMP001"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition text-gray-700 bg-rose-50/40 placeholder-gray-400"
                />
              </div>
            </div>

            {/* Employee Name */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Employee Name <span className="text-xs text-gray-400">(optional)</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
                <input
                  type="text"
                  value={employeeName}
                  onChange={e => setEmployeeName(e.target.value)}
                  placeholder="Your full name (optional)"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition text-gray-700 bg-rose-50/40 placeholder-gray-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition text-gray-700 bg-rose-50/40 placeholder-gray-400"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; {new Date().getFullYear()} Knockturn &mdash; Internal Employee Agent
        </p>
      </div>
    </div>
  );
}
