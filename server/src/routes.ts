import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FlowDefinition, NodeType, FormField } from './types';
import { store } from './store';
import { workflowEngine } from './engine';

const router = express.Router();

const getCurrentUser = (req: express.Request): string => {
  return (req.headers['x-user'] as string) || 'admin';
};

const isAdmin = (user: string): boolean => {
  return workflowEngine.isAdmin(user);
};

router.get('/me', (req, res) => {
  const user = getCurrentUser(req);
  res.json({
    success: true,
    data: {
      user,
      isAdmin: isAdmin(user)
    }
  });
});

router.get('/definitions', (_req, res) => {
  const definitions = store.listLatestDefinitions();
  res.json({ success: true, data: definitions });
});

router.get('/definitions/:id', (req, res) => {
  const def = store.getDefinition(req.params.id);
  if (!def) {
    return res.status(404).json({ success: false, message: '流程定义不存在' });
  }
  res.json({ success: true, data: def });
});

router.get('/definitions/:id/versions', (req, res) => {
  const def = store.getDefinition(req.params.id);
  if (!def) {
    return res.status(404).json({ success: false, message: '流程定义不存在' });
  }
  const versions = store.listVersionsByGroup(def.versionGroupId);
  res.json({ success: true, data: versions });
});

router.post('/definitions', (req, res) => {
  const definition = workflowEngine.createDefinition(req.body || {});
  res.json({ success: true, data: definition });
});

router.put('/definitions/:id', (req, res) => {
  const updated = workflowEngine.updateDefinition(req.params.id, req.body || {});
  if (!updated) {
    const existing = store.getDefinition(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: '流程定义不存在' });
    }
    return res.status(400).json({ success: false, message: '已发布的流程不能直接修改，请创建新版本' });
  }
  res.json({ success: true, data: updated });
});

router.post('/definitions/:id/new-version', (req, res) => {
  const existing = store.getDefinition(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: '流程定义不存在' });
  }
  const newVersion = workflowEngine.createNewVersion(existing.versionGroupId);
  if (!newVersion) {
    return res.status(400).json({ success: false, message: '创建新版本失败' });
  }
  res.json({ success: true, data: newVersion });
});

router.delete('/definitions/:id', (req, res) => {
  const success = store.deleteDefinition(req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: '流程定义不存在' });
  }
  res.json({ success: true });
});

router.post('/definitions/:id/publish', (req, res) => {
  const def = workflowEngine.publishDefinition(req.params.id);
  if (!def) {
    return res.status(404).json({ success: false, message: '流程定义不存在' });
  }
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

  let definition = store.getDefinition(definitionId);
  
  if (!definition) {
    definition = store.getLatestPublishedDefinition(definitionId);
  }

  if (!definition) {
    return res.status(404).json({ success: false, message: '流程定义不存在' });
  }

  if (!definition.published) {
    const publishedDef = store.getLatestPublishedDefinition(definition.versionGroupId);
    if (publishedDef) {
      definition = publishedDef;
    } else {
      return res.status(400).json({ success: false, message: '流程未发布，无法启动' });
    }
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
  if (!isAdmin(currentUser)) {
    return res.status(403).json({ success: false, message: '无权限操作，仅管理员可挂起流程' });
  }
  const instance = workflowEngine.suspendInstance(req.params.id, currentUser);
  if (!instance) {
    return res.status(400).json({ success: false, message: '无法挂起流程' });
  }
  res.json({ success: true, data: instance });
});

router.post('/instances/:id/resume', (req, res) => {
  const currentUser = getCurrentUser(req);
  if (!isAdmin(currentUser)) {
    return res.status(403).json({ success: false, message: '无权限操作，仅管理员可恢复流程' });
  }
  const instance = workflowEngine.resumeInstance(req.params.id, currentUser);
  if (!instance) {
    return res.status(400).json({ success: false, message: '无法恢复流程' });
  }
  res.json({ success: true, data: instance });
});

router.post('/instances/:id/terminate', (req, res) => {
  const currentUser = getCurrentUser(req);
  if (!isAdmin(currentUser)) {
    return res.status(403).json({ success: false, message: '无权限操作，仅管理员可终止流程' });
  }
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
  const task = store.getTask(req.params.id);
  
  if (!task) {
    return res.status(404).json({ success: false, message: '任务不存在' });
  }
  
  if (task.assignee !== currentUser) {
    return res.status(403).json({ success: false, message: '无权限操作，该任务不属于您' });
  }
  
  const { comment } = req.body;
  const instance = workflowEngine.approveTask(req.params.id, currentUser, comment);
  if (!instance) {
    return res.status(400).json({ success: false, message: '审批失败，任务状态已变更或流程已结束' });
  }
  res.json({ success: true, data: instance });
});

router.post('/tasks/:id/reject', (req, res) => {
  const currentUser = getCurrentUser(req);
  const task = store.getTask(req.params.id);
  
  if (!task) {
    return res.status(404).json({ success: false, message: '任务不存在' });
  }
  
  if (task.assignee !== currentUser) {
    return res.status(403).json({ success: false, message: '无权限操作，该任务不属于您' });
  }
  
  const { comment } = req.body;
  const instance = workflowEngine.rejectTask(req.params.id, currentUser, comment);
  if (!instance) {
    return res.status(400).json({ success: false, message: '驳回失败，任务状态已变更或流程已结束' });
  }
  res.json({ success: true, data: instance });
});

router.post('/tasks/:id/transfer', (req, res) => {
  const currentUser = getCurrentUser(req);
  const task = store.getTask(req.params.id);
  
  if (!task) {
    return res.status(404).json({ success: false, message: '任务不存在' });
  }
  
  if (task.assignee !== currentUser) {
    return res.status(403).json({ success: false, message: '无权限操作，该任务不属于您' });
  }
  
  const { targetUser, comment } = req.body;
  if (!targetUser) {
    return res.status(400).json({ success: false, message: '请指定转办目标人' });
  }
  
  const instance = workflowEngine.transferTask(req.params.id, currentUser, targetUser, comment);
  if (!instance) {
    return res.status(400).json({ success: false, message: '转办失败，任务状态已变更或目标用户无效' });
  }
  res.json({ success: true, data: instance });
});

router.post('/tasks/:id/add-sign', (req, res) => {
  const currentUser = getCurrentUser(req);
  const task = store.getTask(req.params.id);
  
  if (!task) {
    return res.status(404).json({ success: false, message: '任务不存在' });
  }
  
  if (task.assignee !== currentUser) {
    return res.status(403).json({ success: false, message: '无权限操作，该任务不属于您' });
  }
  
  const { targetUser, comment } = req.body;
  if (!targetUser) {
    return res.status(400).json({ success: false, message: '请指定加签用户' });
  }
  
  const instance = workflowEngine.addSignTask(req.params.id, currentUser, targetUser, comment);
  if (!instance) {
    return res.status(400).json({ success: false, message: '加签失败，任务状态已变更或目标用户已在审批列表中' });
  }
  res.json({ success: true, data: instance });
});

router.get('/demo/seed', (_req, res) => {
  const existing = store.listDefinitions();
  if (existing.length > 0) {
    return res.json({ success: true, message: '已有数据，跳过演示数据初始化' });
  }
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
  
  const leaveId = uuidv4();
  const leaveDef: FlowDefinition = {
    id: leaveId,
    versionGroupId: leaveId,
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

  const expenseId = uuidv4();
  const expenseDef: FlowDefinition = {
    id: expenseId,
    versionGroupId: expenseId,
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
