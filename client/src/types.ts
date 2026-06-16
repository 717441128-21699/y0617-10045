export enum NodeType {
  START = 'start',
  END = 'end',
  APPROVAL = 'approval',
  NOTIFICATION = 'notification',
  CONDITION = 'condition'
}

export enum ApprovalMode {
  ALL = 'all',
  ANY = 'any'
}

export enum NodeStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  SKIPPED = 'skipped'
}

export enum InstanceStatus {
  RUNNING = 'running',
  SUSPENDED = 'suspended',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
  REJECTED = 'rejected'
}

export interface FlowNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  config?: {
    approvers?: string[];
    mode?: ApprovalMode;
    recipients?: string[];
    message?: string;
    field?: string;
    operator?: string;
    value?: string;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface FlowDefinition {
  id: string;
  versionGroupId: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  formFields?: FormField[];
  createdAt: number;
  updatedAt: number;
  published: boolean;
  version: number;
}

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  options?: string[];
  required?: boolean;
}

export interface NodeExecution {
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  status: NodeStatus;
  assignees?: string[];
  approvedBy?: string[];
  startTime?: number;
  endTime?: number;
  comment?: string;
}

export interface FlowInstance {
  id: string;
  definitionId: string;
  definitionVersionGroupId: string;
  definitionName: string;
  definitionVersion: number;
  status: InstanceStatus;
  formData: Record<string, any>;
  currentNodeIds: string[];
  executions: Record<string, NodeExecution>;
  logs: FlowLog[];
  startedBy: string;
  startedAt: number;
  endedAt?: number;
  suspendedAt?: number;
}

export interface FlowLog {
  id: string;
  nodeId: string;
  nodeName: string;
  action: string;
  operator?: string;
  timestamp: number;
  detail?: string;
}

export interface Task {
  id: string;
  instanceId: string;
  nodeId: string;
  nodeName: string;
  definitionName: string;
  assignee: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'transferred';
  createdAt: number;
  formData: Record<string, any>;
  startedBy: string;
  source?: 'normal' | 'add_sign' | 'transfer';
  transferredFrom?: string;
  addSignedBy?: string;
}
