import React, { useState } from 'react';
import { User } from '../types';
import { User as UserIcon, Mail, Shield, Key, Check, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface MyPageProps {
  user: User;
}

export const MyPage: React.FC<MyPageProps> = ({ user }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '비밀번호는 최소 6자 이상이어야 합니다.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '비밀번호가 일치하지 않습니다.' });
      return;
    }

    setIsLoading(true);
    try {
      await api.auth.updatePassword(user.id, newPassword);
      setMessage({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '비밀번호 변경에 실패했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <div className="bg-slate-800 p-2 rounded-lg text-white">
            <UserIcon size={24} />
        </div>
        마이페이지
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Info Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 border-b border-gray-100 pb-3">내 정보</h3>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-gray-500">이름</p>
                <p className="font-semibold text-gray-800 text-lg">{user.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-50 rounded-lg text-gray-400">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500">이메일</p>
                <p className="font-medium text-gray-800">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="p-3 bg-gray-50 rounded-lg text-gray-400">
                <Shield size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500">직무 / 권한</p>
                <p className="font-medium text-gray-800">{user.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security / Password Change Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 border-b border-gray-100 pb-3 flex items-center gap-2">
            <Key size={20} className="text-blue-600"/>
            보안 설정
          </h3>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="새로운 비밀번호 입력"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
              <input 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="비밀번호 다시 입력"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="animate-spin" size={18} />}
              비밀번호 변경
            </button>
          </form>
          
          <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500">
             <p>· 비밀번호는 타인에게 노출되지 않도록 주의해주세요.</p>
             <p className="mt-1">· 변경된 비밀번호는 즉시 적용되며 다음 로그인 시 사용해야 합니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
};