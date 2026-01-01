import { User, Task, KnowledgeItem, Email, Memo } from '../types';

// =================================================================
// [중요] Nginx Reverse Proxy를 사용하기 위해 상대 경로('/api')로 설정합니다.
// 절대 경로(http://10.200.0.160:3001)를 사용하면 외부망에서 접속 시 오류가 발생합니다.
// =================================================================
const API_BASE_URL = '/api';
const MAIL_API_BASE_URL = '/api/mail';

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
        console.error(`[Login Failed]`, e);
        throw e;
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
         console.error(`[Signup Failed]`, e);
         throw e;
      }
    },
    updatePassword: async (userId: string | number, newPassword: string): Promise<void> => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPassword }),
        });
        await handleResponse(response);
      } catch (e) {
        console.error("Failed to update password", e);
        throw e;
      }
    }
  },
  tasks: {
    getAll: async (userId: string | number): Promise<Task[]> => {
      try {
        const uidStr = String(userId);
        const response = await fetch(`${API_BASE_URL}/tasks?userId=${uidStr}`);
        return handleResponse(response);
      } catch (error) {
        console.warn("API Error (Tasks):", error);
        return [];
      }
    },
    save: async (userId: string | number, task: Task): Promise<void> => {
       try {
         await fetch(`${API_BASE_URL}/tasks`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ ...task, userId }),
         });
       } catch (e) {
         console.error("Failed to save task", e);
       }
    },
    delete: async (taskId: string): Promise<void> => {
      try {
        await fetch(`${API_BASE_URL}/tasks/${taskId}`, { method: 'DELETE' });
      } catch (e) {
        console.error("Failed to delete task", e);
      }
    }
  },
  knowledge: {
      getAll: async (userId: string | number): Promise<KnowledgeItem[]> => {
          try {
            const uidStr = String(userId);
            const response = await fetch(`${API_BASE_URL}/knowledge?userId=${uidStr}`);
            return handleResponse(response);
          } catch (error) {
              console.warn("API Error (Knowledge):", error);
              return [];
          }
      },
      save: async (userId: string | number, item: KnowledgeItem): Promise<void> => {
        try {
          await fetch(`${API_BASE_URL}/knowledge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, userId }),
          });
        } catch (e) {
          console.error("Failed to save knowledge", e);
        }
      },
      update: async (userId: string | number, itemId: string, item: KnowledgeItem): Promise<void> => {
        try {
          await fetch(`${API_BASE_URL}/knowledge/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, userId }),
          });
        } catch (e) {
          console.error("Failed to update knowledge", e);
          throw e;
        }
      },
      delete: async (itemId: string): Promise<void> => {
        try {
           await fetch(`${API_BASE_URL}/knowledge/${itemId}`, { method: 'DELETE' });
        } catch (e) {
           console.error("Failed to delete knowledge", e);
        }
      }
  },
  memos: {
    getAll: async (userId: string | number): Promise<Memo[]> => {
      try {
        const uidStr = String(userId);
        const response = await fetch(`${API_BASE_URL}/memos?userId=${uidStr}`);
        return handleResponse(response);
      } catch (error) {
        console.warn("API Error (Memos):", error);
        return [];
      }
    },
    save: async (userId: string | number, memo: Memo): Promise<void> => {
      try {
        await fetch(`${API_BASE_URL}/memos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...memo, userId }),
        });
      } catch (e) {
        console.error("Failed to save memo", e);
      }
    },
    delete: async (memoId: string): Promise<void> => {
      try {
        await fetch(`${API_BASE_URL}/memos/${memoId}`, { method: 'DELETE' });
      } catch (e) {
        console.error("Failed to delete memo", e);
      }
    }
  },
  mail: {
    connect: async (userId: string | number, config: any): Promise<boolean> => {
      try {
        // Points to /api/mail/connect
        const response = await fetch(`${MAIL_API_BASE_URL}/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...config, userId }),
        });
        if (!response.ok) throw new Error('Connect failed');
        return true;
      } catch (e) {
        console.error("Failed to connect mail (Mail Server might be down)", e);
        return false;
      }
    },
    getMessages: async (userId: string | number, config: any, lastUid?: string | number): Promise<{ emails: Email[], latestUid: string | number }> => {
      try {
        // Points to /api/mail/messages
        const response = await fetch(`${MAIL_API_BASE_URL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, config, lastUid })
        });
        return handleResponse(response);
      } catch (e) {
        console.error("Failed to get messages (Mail Server might be down)", e);
        return { emails: [], latestUid: lastUid || 0 };
      }
    }
  }
};