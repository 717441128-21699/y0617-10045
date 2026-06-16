import { v4 as uuidv4 } from 'uuid';
import {
  FlowDefinition,
  FlowInstance,
  FlowNode,
  FlowEdge,
  NodeType,
  NodeStatus,
  InstanceStatus,
  ApprovalMode,
  FlowLog,
  NodeExecution,
  Task
} from './types';
import { store } from './store';

export class WorkflowEngine {
  private addLog(instance: FlowInstance, nodeId: string, nodeName: string, action: string, operator?: string, detail?: string): void {
    const log: FlowLog = {
      id: uuidv4(),
      nodeId,
      nodeName,
      action,
      operator,
      timestamp: Date.now(),
      detail
    };
    instance.logs.push(log);
  }

  private getOutgoingEdges(edges: FlowEdge[], nodeId: string): FlowEdge[] {
    return edges.filter(e => e.source === nodeId);
  }

  private getNode(nodes: FlowNode[], nodeId: string): FlowNode | undefined {
    return nodes.find(n => n.id === nodeId);
  }

  private getStartNode(nodes: FlowNode[]): FlowNode | undefined {
    return nodes.find(n => n.type === NodeType.START);
  }

  private evaluateCondition(node: FlowNode, formData: Record<string, any>): boolean {
    if (!node.config?.field || !node.config?.operator || node.config.value === undefined) {
      return false;
    }
    const { field, operator, value } = node.config;
    const actualValue = formData[field];
    
    switch (operator) {
      case '==':
        return actualValue == value;
      case '!=':
        return actualValue != value;
      case '>':
        return Number(actualValue) > Number(value);
      case '>=':
        return Number(actualValue) >= Number(value);
      case '<':
        return Number(actualValue) < Number(value);
      case '<=':
        return Number(actualValue) <= Number(value);
      case 'contains':
        return String(actualValue).includes(String(value));
      default:
        return false;
    }
  }

  private createTask(instance: FlowInstance, node: FlowNode, assignee: string): Task {
    const task: Task = {
      id: uuidv4(),
      instanceId: instance.id,
      nodeId: node.id,
      nodeName: node.name,
      definitionName: instance.definitionName,
      assignee,
      status: 'pending',
      createdAt: Date.now(),
      formData: { ...instance.formData },
      startedBy: instance.startedBy
    };
    store.saveTask(task);
    return task;
  }

  startInstance(definition: FlowDefinition, formData: Record<string, any>, startedBy: string): FlowInstance {
    const startNode = this.getStartNode(definition.nodes);
    if (!startNode) {
      throw new Error('Flow definition must have a start node');
    }

    const instance: FlowInstance = {
      id: uuidv4(),
      definitionId: definition.id,
      definitionName: definition.name,
      status: InstanceStatus.RUNNING,
      formData,
      currentNodeIds: [],
      executions: {},
      logs: [],
      startedBy,
      startedAt: Date.now()
    };

    this.addLog(instance, startNode.id, startNode.name, '开始', startedBy, '流程实例已创建');

    const execution: NodeExecution = {
      nodeId: startNode.id,
      nodeName: startNode.name,
      nodeType: startNode.type,
      status: NodeStatus.COMPLETED,
      startTime: Date.now(),
      endTime: Date.now()
    };
    instance.executions[startNode.id] = execution;

    this.moveToNext(instance, definition, startNode.id, startedBy);

    store.saveInstance(instance);
    return instance;
  }

  private moveToNext(instance: FlowInstance, definition: FlowDefinition, currentNodeId: string, operator?: string): void {
    const outgoingEdges = this.getOutgoingEdges(definition.edges, currentNodeId);
    
    if (outgoingEdges.length === 0) {
      return;
    }

    const currentNode = this.getNode(definition.nodes, currentNodeId);
    if (currentNode?.type === NodeType.CONDITION) {
      const trueEdge = outgoingEdges.find(e => e.sourceHandle === 'true');
      const falseEdge = outgoingEdges.find(e => e.sourceHandle === 'false');
      
      const result = this.evaluateCondition(currentNode, instance.formData);
      const nextEdge = result ? trueEdge : falseEdge;
      
      if (nextEdge) {
        const nextNode = this.getNode(definition.nodes, nextEdge.target);
        if (nextNode) {
          this.addLog(instance, currentNode.id, currentNode.name, '条件判断', operator, `条件结果: ${result}, 路由到: ${nextNode.name}`);
          this.executeNode(instance, definition, nextNode, operator);
        }
      }
      return;
    }

    for (const edge of outgoingEdges) {
      const nextNode = this.getNode(definition.nodes, edge.target);
      if (nextNode) {
        this.executeNode(instance, definition, nextNode, operator);
      }
    }
  }

  private executeNode(instance: FlowInstance, definition: FlowDefinition, node: FlowNode, operator?: string): void {
    if (instance.status !== InstanceStatus.RUNNING) {
      return;
    }

    const execution: NodeExecution = {
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      status: NodeStatus.RUNNING,
      startTime: Date.now()
    };

    switch (node.type) {
      case NodeType.END:
        execution.status = NodeStatus.COMPLETED;
        execution.endTime = Date.now();
        instance.executions[node.id] = execution;
        instance.status = InstanceStatus.COMPLETED;
        instance.endedAt = Date.now();
        this.addLog(instance, node.id, node.name, '结束', operator, '流程完成');
        break;

      case NodeType.APPROVAL:
        const approvers = node.config?.approvers || [];
        const mode = node.config?.mode || ApprovalMode.ANY;
        execution.assignees = approvers;
        execution.approvedBy = [];
        
        for (const approver of approvers) {
          this.createTask(instance, node, approver);
        }
        
        instance.executions[node.id] = execution;
        instance.currentNodeIds.push(node.id);
        this.addLog(instance, node.id, node.name, '创建审批任务', operator, `审批人: ${approvers.join(', ')}, 模式: ${mode === ApprovalMode.ALL ? '会签' : '或签'}`);
        break;

      case NodeType.NOTIFICATION:
        const recipients = node.config?.recipients || [];
        const message = node.config?.message || '';
        execution.status = NodeStatus.COMPLETED;
        execution.endTime = Date.now();
        instance.executions[node.id] = execution;
        this.addLog(instance, node.id, node.name, '发送通知', operator, `收件人: ${recipients.join(', ')}, 内容: ${message}`);
        
        setTimeout(() => {
          this.moveToNext(instance, definition, node.id, operator);
          store.saveInstance(instance);
        }, 100);
        break;

      case NodeType.CONDITION:
        execution.status = NodeStatus.COMPLETED;
        execution.endTime = Date.now();
        instance.executions[node.id] = execution;
        this.addLog(instance, node.id, node.name, '条件判断开始', operator);
        
        setTimeout(() => {
          this.moveToNext(instance, definition, node.id, operator);
          store.saveInstance(instance);
        }, 100);
        break;

      default:
        execution.status = NodeStatus.COMPLETED;
        execution.endTime = Date.now();
        instance.executions[node.id] = execution;
        break;
    }
  }

  approveTask(taskId: string, operator: string, comment?: string): FlowInstance | null {
    const task = store.getTask(taskId);
    if (!task || task.status !== 'pending') {
      return null;
    }

    const instance = store.getInstance(task.instanceId);
    if (!instance || instance.status !== InstanceStatus.RUNNING) {
      return null;
    }

    const definition = store.getDefinition(instance.definitionId);
    if (!definition) {
      return null;
    }

    const node = this.getNode(definition.nodes, task.nodeId);
    if (!node) {
      return null;
    }

    const execution = instance.executions[task.nodeId];
    if (!execution || !execution.approvedBy) {
      return null;
    }

    task.status = 'approved';
    store.saveTask(task);

    execution.approvedBy.push(operator);

    const mode = node.config?.mode || ApprovalMode.ANY;
    const approvers = node.config?.approvers || [];
    
    let passed = false;
    if (mode === ApprovalMode.ANY) {
      passed = execution.approvedBy.length >= 1;
    } else {
      passed = execution.approvedBy.length >= approvers.length;
    }

    this.addLog(instance, node.id, node.name, '审批通过', operator, comment || '');

    if (passed) {
      execution.status = NodeStatus.APPROVED;
      execution.endTime = Date.now();
      execution.comment = comment;
      
      const idx = instance.currentNodeIds.indexOf(node.id);
      if (idx > -1) {
        instance.currentNodeIds.splice(idx, 1);
      }

      this.addLog(instance, node.id, node.name, '审批节点通过', operator, `模式: ${mode === ApprovalMode.ALL ? '会签' : '或签'}, 同意人数: ${execution.approvedBy.length}`);
      
      setTimeout(() => {
        this.moveToNext(instance, definition, node.id, operator);
        store.saveInstance(instance);
      }, 100);
    }

    store.saveInstance(instance);
    return instance;
  }

  rejectTask(taskId: string, operator: string, comment?: string): FlowInstance | null {
    const task = store.getTask(taskId);
    if (!task || task.status !== 'pending') {
      return null;
    }

    const instance = store.getInstance(task.instanceId);
    if (!instance || instance.status !== InstanceStatus.RUNNING) {
      return null;
    }

    const definition = store.getDefinition(instance.definitionId);
    if (!definition) {
      return null;
    }

    const node = this.getNode(definition.nodes, task.nodeId);
    if (!node) {
      return null;
    }

    const execution = instance.executions[task.nodeId];
    if (!execution) {
      return null;
    }

    task.status = 'rejected';
    store.saveTask(task);

    execution.status = NodeStatus.REJECTED;
    execution.endTime = Date.now();
    execution.comment = comment;

    const idx = instance.currentNodeIds.indexOf(node.id);
    if (idx > -1) {
      instance.currentNodeIds.splice(idx, 1);
    }

    instance.status = InstanceStatus.REJECTED;
    instance.endedAt = Date.now();

    this.addLog(instance, node.id, node.name, '审批驳回', operator, comment || '');

    store.saveInstance(instance);
    return instance;
  }

  suspendInstance(instanceId: string, operator: string): FlowInstance | null {
    const instance = store.getInstance(instanceId);
    if (!instance || instance.status !== InstanceStatus.RUNNING) {
      return null;
    }

    instance.status = InstanceStatus.SUSPENDED;
    instance.suspendedAt = Date.now();
    
    this.addLog(instance, '', '系统', '挂起流程', operator, '流程已被挂起');
    store.saveInstance(instance);
    
    return instance;
  }

  resumeInstance(instanceId: string, operator: string): FlowInstance | null {
    const instance = store.getInstance(instanceId);
    if (!instance || instance.status !== InstanceStatus.SUSPENDED) {
      return null;
    }

    instance.status = InstanceStatus.RUNNING;
    instance.suspendedAt = undefined;
    
    this.addLog(instance, '', '系统', '恢复流程', operator, '流程已恢复运行');
    store.saveInstance(instance);
    
    return instance;
  }

  terminateInstance(instanceId: string, operator: string, reason?: string): FlowInstance | null {
    const instance = store.getInstance(instanceId);
    if (!instance) {
      return null;
    }

    if (instance.status === InstanceStatus.COMPLETED || instance.status === InstanceStatus.TERMINATED) {
      return null;
    }

    instance.status = InstanceStatus.TERMINATED;
    instance.endedAt = Date.now();
    instance.currentNodeIds = [];

    this.addLog(instance, '', '系统', '强制终止', operator, reason || '管理员强制终止流程');
    store.saveInstance(instance);

    return instance;
  }
}

export const workflowEngine = new WorkflowEngine();
