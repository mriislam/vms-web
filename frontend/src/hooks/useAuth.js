import { useMutation } from '@tanstack/react-query';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/authStore';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authService.login,
    onSuccess: ({ data }) => {
      // Real API: { success, data: { token, username, fullName, role } }
      setAuth(data.data);
      navigate('/dashboard');
    },
    onError: () => message.error('Invalid credentials'),
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      clearAuth();
      navigate('/login');
    },
  });
}
