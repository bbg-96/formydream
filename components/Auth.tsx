import React, { useState } from 'react';
import { Cloud, Lock, Mail, User as UserIcon, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Signup Validation
    if (!isLogin) {
      if (password !== confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }
      if (password.length < 6) {
        setError('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
      }
    }

    setLoading(true);

    try {
        let user: User;
        if (isLogin) {
            user = await api.auth.login(email, password);
        } else {
            user = await api.auth.signup(name, email, password);
        }
        onLogin(user);
    } catch (err: any) {
        setError(err.message || '로그인/회원가입 중 오류가 발생했습니다.');
    } finally {
        setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setPassword('');
    setConfirmPassword('');
    // Keep email/name for convenience or clear them if preferred
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-fade-in-up">
        {/* Header */}
        <div className="bg-slate-50 p-8 text-center border-b border-gray-100">
          <div className="inline-flex p-3 bg-blue-600 rounded-xl mb-4 shadow-lg shadow-blue-200">
            <Cloud size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">CloudOps Mate</h1>
          <p className="text-gray-500 text-sm mt-2">
            {isLogin ? '클라우드 엔지니어를 위한 업무 파트너' : '새로운 계정을 생성하고 시작하세요'}
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">이름</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="홍길동"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="engineer@cloudops.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">비밀번호 확인</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {confirmPassword && password === confirmPassword ? (
                      <CheckCircle size={20} className="text-green-500" />
                    ) : (
                      <Lock size={20} />
                    )}
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all ${
                      confirmPassword && password !== confirmPassword 
                        ? 'border-red-300 focus:ring-red-200 bg-red-50' 
                        : 'border-gray-200 focus:ring-blue-500'
                    }`}
                    placeholder="비밀번호 재입력"
                    required={!isLogin}
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 ml-1">비밀번호가 일치하지 않습니다.</p>
                )}
              </div>
            )}

            {error && (
              <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {isLogin ? '로그인' : '회원가입'}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
              <button
                onClick={toggleMode}
                className="ml-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors"
              >
                {isLogin ? '회원가입' : '로그인'}
              </button>
            </p>
          </div>
        </div>
        
        {/* Footer info */}
        <div className="bg-gray-50 py-3 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400">VMware Local DB Environment Ready</p>
        </div>
      </div>
    </div>
  );
};