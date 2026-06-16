import { FlowDefinition, FlowInstance, Task } from './types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user': localStorage.getItem('currentUser') || 'admin'
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers
    }
  });

  const data = await res.json();
  
  if (!res.ok || !data.success) {
    throw new Error(data.message || '请求失败');
  }

  return data.data;
}

export interface MeInfo {
  user: string;
  isAdmin: boolean;
}

export const api = {
  getMe: () => request<MeInfo>('/me'),

  getDefinitions: () => request<FlowDefinition[]>('/definitions'),
  getDefinition: (id: string) => request<FlowDefinition>(`/definitions/${id}`),
  createDefinition: (data: Partial<FlowDefinition>) => 
    request<FlowDefinition>('/definitions', { method: 'POST', body: JSON.stringify(data) }),
  updateDefinition: (id: string, data: Partial<FlowDefinition>) => 
    request<FlowDefinition>(`/definitions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDefinition: (id: string) => 
    request<void>(`/definitions/${id}`, { method: 'DELETE' }),
  publishDefinition: (id: string) => 
    request<FlowDefinition>(`/definitions/${id}/publish`, { method: 'POST' }),
  seedDemo: () => request<void>('/demo/seed'),

  getInstances: () => request<FlowInstance[]>('/instances'),
  getInstance: (id: string) => request<FlowInstance>(`/instances/${id}`),
  startInstance: (definitionId: string, formData: Record<string, any>) =>
    request<FlowInstance>('/instances', { method: 'POST', body: JSON.stringify({ definitionId, formData }) }),
  suspendInstance: (id: string) =>
    request<FlowInstance>(`/instances/${id}/suspend`, { method: 'POST' }),
  resumeInstance: (id: string) =>
    request<FlowInstance>(`/instances/${id}/resume`, { method: 'POST' }),
  terminateInstance: (id: string, reason?: string) =>
    request<FlowInstance>(`/instances/${id}/terminate`, { method: 'POST', body: JSON.stringify({ reason }) }),

  getMyTasks: () => request<Task[]>('/tasks/mine'),
  getAllMyTasks: () => request<Task[]>('/tasks/all'),
  approveTask: (taskId: string, comment?: string) =>
    request<FlowInstance>(`/tasks/${taskId}/approve`, { method: 'POST', body: JSON.stringify({ comment }) }),
  rejectTask: (taskId: string, comment?: string) =>
    request<FlowInstance>(`/tasks/${taskId}/reject`, { method: 'POST', body: JSON.stringify({ comment }) })
};
