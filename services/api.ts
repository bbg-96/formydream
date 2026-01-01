import { User, Task, KnowledgeItem, Email } from '../types';

// =================================================================
// [설정 확인] 사용자의 VM IP 주소
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
        // [Fix] DB returns ID as number, convert to string safely
        const uidStr = String(userId);
        
        if (uidStr.startsWith('mock-')) return []; 
        
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
            // [Fix] Ensure userId is treated as string
            const uidStr = String(userId);

            if (uidStr.startsWith('mock-')) return [];

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
  mail: {
    connect: async (userId: string | number, config: any): Promise<boolean> => {
      // [UI Demo Mode] 
      // 실제 백엔드가 없으므로 404 에러를 방지하기 위해 네트워크 요청을 생략하고 성공을 시뮬레이션합니다.
      console.log(`[Mail Simulation] Connecting to ${config.host}:${config.port} (${config.protocol}) via SSL:${config.useSSL}...`);
      
      // 1.5초 딜레이 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1500));
      return true;

      /* 실제 연동 코드 (백엔드 준비 시 주석 해제)
      try {
        const response = await fetch(`${API_BASE_URL}/mail/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...config, userId }),
        });
        return response.ok;
      } catch (e) {
        console.error("Failed to connect mail", e);
        return false;
      }
      */
    },
    getMessages: async (userId: string | number): Promise<Email[]> => {
      // [UI Demo Mode] 가짜 데이터 반환
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return [
        {
          id: 'm1',
          senderName: 'AWS Billing',
          senderAddress: 'no-reply-aws@amazon.com',
          subject: '[Alert] AWS Budget Alert - Monthly Budget Exceeded',
          body: 'Dear Customer,\n\nYou have exceeded 85% of your monthly budget for "Production-Account".\nCurrent Spend: $1,250.00\nForecast: $1,600.00\n\nPlease review your usage in Cost Explorer.',
          receivedAt: new Date().toISOString(),
          isRead: false
        },
        {
          id: 'm2',
          senderName: 'Jira Notification',
          senderAddress: 'jira@company.com',
          subject: 'New Ticket Assigned: PROD-1234 DB Connection Timeout',
          body: 'A new high priority ticket has been assigned to you.\n\nDescription: Application servers are experiencing intermittent timeouts connecting to Primary RDS instance.\n\nPriority: High\nReporter: QA Team',
          receivedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          isRead: true
        },
        {
            id: 'm3',
            senderName: 'Datadog Alerts',
            senderAddress: 'alerts@datadoghq.com',
            subject: '[P1] High CPU Usage on k8s-worker-node-05',
            body: 'Monitor "K8s Node CPU" triggered.\n\nValue: 98.5%\nThreshold: > 90%\nHost: k8s-worker-node-05\n\nPlease investigate immediately.',
            receivedAt: new Date(Date.now() - 7200000).toISOString(),
            isRead: true
        }
      ];

      /* 실제 연동 코드
      try {
        const uidStr = String(userId);
        const response = await fetch(`${API_BASE_URL}/mail/messages?userId=${uidStr}`);
        return handleResponse(response);
      } catch (e) {
        return [];
      }
      */
    }
  }
};