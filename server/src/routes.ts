import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FlowDefinition, NodeType, FormField } from './types';
import { store } from './store';
import { workflowEngine } from './engine';

const router = express.Router();

const getCurrentUser = (req: express.Request): string => {
  return (req.headers['x-user'] as string) || 'admin';
};

router.get('/definitions', (_req, res) => {
  const definitions = store.listDefinitions();
  res.json({ success: true, data: definitions });
});

router.get('/definitions/:id', (req, res) => {
  const def = store.getDefinition(req.params.id);
  if (!def) {
    return res.status(404).json({ success: false, message: '流程定义不存在' });
  }
  res.json({ success: true, data: def });
});

router.post('/definitions', (req, res) => {
  const { name, description, nodes, edges, formFields } = req.body;
  
  if (!name || !nodes || !edges) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }

  const now = Date.now();
  const definition: FlowDefinition = {
    id: uuidv4(),
    name,
    description,
    nodes,
    edges,
    formFields: formFields || [],
    createdAt: now,
    updatedAt: now,
    published: false,
    version: 1
  };

  store.saveDefinition(definition);
  res.json({ success: true, data: definition });
});

router.put('/definitions/:id', (req, res) => {
  const existing = store.getDefinition(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: '流程定义不存在' });
  }

  const { name, description, nodes, edges, formFields } = req.body;

  const updated: FlowDefinition = {
    ...existing,
    name: name || existing.name,
    description: description ?? existing.description,
    nodes: nodes || existing.nodes,
    edges: edges || existing.edges,
    formFields: formFields || existing.formFields,
    updatedAt: Date.now()
  };

  store.saveDefinition(updated);
  res.json({ success: true, data: updated });
});

router.delete('/definitions/:id', (req, res) => {
  const success = store.deleteDefinition(req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: '流程定义不存在' });
  }
  res.json({ success: true });
});

router.post('/definitions/:id/publish', (req, res) => {
  const def = store.getDefinition(req.params.id);
  if (!def) {
    return res.status(404).json({ success: false, message: '流程定义不存在' });
  }

  def.published = true;
  def.updatedAt = Date.now();
  store.saveDefinition(def);

  res.json({ success: true, data: def });
});

router.get('/instances', (_req, res) => {
  const instances = store.listInstances();
  res.json({ success: true, data: instances });
});

router.get('/instances/:id', (req, res) => {
  const instance = store.getInstance(req.params.id);
  if (!instance) {
    return res.status(404).json({ success: false, message: '流程实例不存在' });
  }
  res.json({ success: true, data: instance });
});

router.post('/instances', (req, res) => {
  const { definitionId, formData } = req.body;
  const currentUser = getCurrentUser(req);

  const definition = store.getDefinition(definitionId);
  if (!definition) {
    return res.status(404).json({ success: false, message: '流程定义不存在' });
  }

  if (!definition.published) {
    return res.status(400).json({ success: false, message: '流程未发布，无法启动' });
  }

  try {
    const instance = workflowEngine.startInstance(definition, formData || {}, currentUser);
    res.json({ success: true, data: instance });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});

router.post('/instances/:id/suspend', (req, res) => {
  const currentUser = getCurrentUser(req);
  const instance = workflowEngine.suspendInstance(req.params.id, currentUser);
  if (!instance) {
    return res.status(400).json({ success: false, message: '无法挂起流程' });
  }
  res.json({ success: true, data: instance });
});

router.post('/instances/:id/resume', (req, res) => {
  const currentUser = getCurrentUser(req);
  const instance = workflowEngine.resumeInstance(req.params.id, currentUser);
  if (!instance) {
    return res.status(400).json({ success: false, message: '无法恢复流程' });
  }
  res.json({ success: true, data: instance });
});

router.post('/instances/:id/terminate', (req, res) => {
  const currentUser = getCurrentUser(req);
  const { reason } = req.body;
  const instance = workflowEngine.terminateInstance(req.params.id, currentUser, reason);
  if (!instance) {
    return res.status(400).json({ success: false, message: '无法终止流程' });
  }
  res.json({ success: true, data: instance });
});

router.get('/tasks/mine', (req, res) => {
  const currentUser = getCurrentUser(req);
  const tasks = store.listTasksByAssignee(currentUser);
  res.json({ success: true, data: tasks });
});

router.get('/tasks/all', (req, res) => {
  const currentUser = getCurrentUser(req);
  const tasks = store.listAllTasksByAssignee(currentUser);
  res.json({ success: true, data: tasks });
});

router.post('/tasks/:id/approve', (req, res) => {
  const currentUser = getCurrentUser(req);
  const { comment } = req.body;
  const instance = workflowEngine.approveTask(req.params.id, currentUser, comment);
  if (!instance) {
    return res.status(400).json({ success: false, message: '审批失败' });
  }
  res.json({ success: true, data: instance });
});

router.post('/tasks/:id/reject', (req, res) => {
  const currentUser = getCurrentUser(req);
  const { comment } = req.body;
  const instance = workflowEngine.rejectTask(req.params.id, currentUser, comment);
  if (!instance) {
    return res.status(400).json({ success: false, message: '驳回失败' });
  }
  res.json({ success: true, data: instance });
});

router.get('/demo/seed', (_req, res) => {
  seedDemoData();
  res.json({ success: true, message: '演示数据已创建' });
});

function seedDemoData() {
  const demoFormFields: FormField[] = [
    { key: 'title', label: '申请标题', type: 'text', required: true },
    { key: 'amount', label: '申请金额', type: 'number', required: true },
    { key: 'department', label: '所属部门', type: 'select', options: ['技术部', '市场部', '财务部', '人事部'], required: true },
    { key: 'reason', label: '申请理由', type: 'textarea' }
  ];

  const now = Date.now();
  
  const leaveDef: FlowDefinition = {
    id: uuidv4(),
    name: '请假审批流程',
    description: '员工请假审批流程，包含部门主管审批和HR备案',
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', x: 50, y: 200 },
      { id: 'dept_approve', type: NodeType.APPROVAL, name: '部门主管审批', x: 250, y: 200, config: { approvers: ['manager1', 'manager2'], mode: 'any' as any } },
      { id: 'hr_notify', type: NodeType.NOTIFICATION, name: 'HR备案通知', x: 470, y: 200, config: { recipients: ['hr1', 'hr2'], message: '有新的请假申请需要备案' } },
      { id: 'end', type: NodeType.END, name: '结束', x: 670, y: 200 }
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'dept_approve' },
      { id: 'e2', source: 'dept_approve', target: 'hr_notify' },
      { id: 'e3', source: 'hr_notify', target: 'end' }
    ],
    formFields: demoFormFields,
    createdAt: now,
    updatedAt: now,
    published: true,
    version: 1
  };

  const expenseDef: FlowDefinition = {
    id: uuidv4(),
    name: '报销审批流程',
    description: '费用报销审批流程，金额超过5000需要财务总监审批',
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', x: 50, y: 200 },
      { id: 'dept_approve', type: NodeType.APPROVAL, name: '部门主管审批', x: 250, y: 200, config: { approvers: ['manager1'], mode: 'any' as any } },
      { id: 'condition', type: NodeType.CONDITION, name: '金额判断', x: 470, y: 200, config: { field: 'amount', operator: '>', value: '5000' } },
      { id: 'finance_approve', type: NodeType.APPROVAL, name: '财务审批', x: 690, y: 100, config: { approvers: ['finance1'], mode: 'any' as any } },
      { id: 'director_approve', type: NodeType.APPROVAL, name: '财务总监审批', x: 700, y: 300, config: { approvers: ['director1', 'director2'], mode: 'all' as any } },
      { id: 'notify', type: NodeType.NOTIFICATION, name: '到账通知', x: 920, y: 200, config: { recipients: ['applicant'], message: '报销已审批通过，请注意查收' } },
      { id: 'end', type: NodeType.END, name: '结束', x: 1120, y: 200 }
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'dept_approve' },
      { id: 'e2', source: 'dept_approve', target: 'condition' },
      { id: 'e3', source: 'condition', target: 'finance_approve', sourceHandle: 'false' },
      { id: 'e4', source: 'condition', target: 'director_approve', sourceHandle: 'true' },
      { id: 'e5', source: 'finance_approve', target: 'notify' },
      { id: 'e6', source: 'director_approve', target: 'notify' },
      { id: 'e7', source: 'notify', target: 'end' }
    ],
    formFields: demoFormFields,
    createdAt: now,
    updatedAt: now,
    published: true,
    version: 1
  };

  store.saveDefinition(leaveDef);
  store.saveDefinition(expenseDef);
}

export default router;
