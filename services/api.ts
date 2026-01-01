import { User, Task, KnowledgeItem } from '../types';

// =================================================================
// [설정 확인] 사용자의 VM IP 주소 (로그 기반 업데이트)
// =================================================================
const VM_IP = '10.200.0.160'; 

const API_BASE_URL = `http://${VM_IP}:3001/api`;

// Helper to handle response
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || response.statusText);
  }
  return response.json();
};

export const api = {
  auth: {
    login: async (email: string, password: string): Promise<User> => {
      try {
        const response = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        return handleResponse(response);
      } catch (e) {
        console.error(`[Connection Failed] ${API_BASE_URL}에 연결할 수 없습니다.`, e);
        console.warn("⚠️ 백엔드 연결 실패로 인해 '임시(Mock) 데이터'를 사용합니다. DB에는 저장되지 않습니다.");
        
        // Fallback for demo purposes if backend is not running
        return new Promise((resolve, reject) => {
            if (email && password) {
                // Simulate network delay
                setTimeout(() => {
                    resolve({
                        id: 'mock-u-123',
                        email,
                        name: email.split('@')[0],
                        role: 'Engineer (Offline Mode)'
                    });
                }, 500);
            } else {
                reject(new Error('Invalid credentials'));
            }
        });
      }
    },
    signup: async (name: string, email: string, password: string): Promise<User> => {
       try {
        const response = await fetch(`${API_BASE_URL}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        return handleResponse(response);
      } catch (e: any) {
         console.error(`[Signup Failed] ${API_BASE_URL}/signup`, e);
         // alert 제거 -> Auth 컴포넌트에서 에러 메시지를 받아 처리하도록 함
         throw e;
      }
    }
  },
  tasks: {
    getAll: async (userId: string): Promise<Task[]> => {
      try {
        // If it's a mock user, don't even try to fetch real tasks
        if (userId.startsWith('mock-')) throw new Error('Mock User');

        const response = await fetch(`${API_BASE_URL}/tasks?userId=${userId}`);
        return handleResponse(response);
      } catch (error) {
        console.warn("API Error (Tasks): Using local fallback data");
        throw error;
      }
    },
    create: async (task: Task): Promise<Task> => {
       // 실제 구현 시 백엔드 호출
       // const response = await fetch(`${API_BASE_URL}/tasks`, ...);
       return task;
    }
  },
  knowledge: {
      getAll: async (userId: string): Promise<KnowledgeItem[]> => {
          try {
             if (userId.startsWith('mock-')) throw new Error('Mock User');
            const response = await fetch(`${API_BASE_URL}/knowledge?userId=${userId}`);
            return handleResponse(response);
          } catch (error) {
              console.warn("API Error (Knowledge): Using local fallback data");
              throw error;
          }
      }
  }
};