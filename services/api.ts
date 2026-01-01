import { User, Task, KnowledgeItem } from '../types';

// API Server Configuration
// 1. If you are running the API server locally on your host machine: use 'http://localhost:3001/api'
// 2. If you are running the API server on a VMware VM: use 'http://<VM_IP_ADDRESS>:3001/api'
// Example: const API_BASE_URL = 'http://192.168.0.10:3001/api';

// Try to get from environment variable (Vite uses import.meta.env, CRA uses process.env)
// For local development with VM, you can hardcode the VM IP here if you don't want to set up .env files yet.
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api'; 

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
        console.warn(`Failed to connect to API at ${API_BASE_URL}. Using Mock Data.`);
        // Fallback for demo purposes if backend is not running
        return new Promise((resolve, reject) => {
            if (email && password) {
                resolve({
                    id: 'u-123',
                    email,
                    name: email.split('@')[0],
                    role: 'Engineer'
                });
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
      } catch (e) {
         console.warn(`Failed to connect to API at ${API_BASE_URL}. Using Mock Data.`);
         return { id: `u-${Date.now()}`, email, name, role: 'Engineer' };
      }
    }
  },
  tasks: {
    getAll: async (userId: string): Promise<Task[]> => {
      try {
        const response = await fetch(`${API_BASE_URL}/tasks?userId=${userId}`);
        return handleResponse(response);
      } catch (error) {
        console.warn("API Error (Tasks): Using local fallback data");
        throw error;
      }
    },
    create: async (task: Task): Promise<Task> => {
       const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      return handleResponse(response);
    }
  },
  knowledge: {
      getAll: async (userId: string): Promise<KnowledgeItem[]> => {
          try {
            const response = await fetch(`${API_BASE_URL}/knowledge?userId=${userId}`);
            return handleResponse(response);
          } catch (error) {
              console.warn("API Error (Knowledge): Using local fallback data");
              throw error;
          }
      }
  }
};