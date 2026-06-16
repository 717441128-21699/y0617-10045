import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task, FlowInstance } from '../types';
import { api } from '../api';

function Workbench() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pending' | 'done'>('pending');
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveComment, setApproveComment] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [actionTaskId, setActionTaskId] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const [pending, all] = await Promise.all([
        api.getMyTasks(),
        api.getAllMyTasks()
      ]);
      setPendingTasks(pending);
      setAllTasks(all);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    
    const interval = setInterval(() => {
      if (activeTab === 'pending') {
        loadTasks();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleApprove = (task: Task) => {
    setActionTaskId(task.id);
    setApproveComment('');
    setShowApproveModal(true);
  };

  const handleReject = (task: Task) => {
    setActionTaskId(task.id);
    setRejectComment('');
    setShowRejectModal(true);
  };

  const confirmApprove = async () => {
    if (!actionTaskId) return;
    try {
      await api.approveTask(actionTaskId, approveComment);
      setShowApproveModal(false);
      loadTasks();
    } catch (e: any) {
      alert('审批失败：' + e.message);
    }
  };

  const confirmReject = async () => {
    if (!actionTaskId) return;
    if (!rejectComment.trim()) {
      alert('请填写驳回理由');
      return;
    }
    try {
      await api.rejectTask(actionTaskId, rejectComment);
      setShowRejectModal(false);
      loadTasks();
    } catch (e: any) {
      alert('驳回失败：' + e.message);
    }
  };

  const handleViewInstance = (instanceId: string) => {
    navigate(`/instances/${instanceId}`);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const displayTasks = activeTab === 'pending' ? pendingTasks : allTasks;

  const stats = [
    { label: '待办任务', value: pendingTasks.length, color: 'blue' },
    { label: '已处理任务', value: allTasks.filter(t => t.status !== 'pending').length, color: 'green' },
    { label: '我发起的', value: 0, color: 'orange' },
    { label: '抄送我的', value: 0, color: 'red' }
  ];

  const getTaskStatusTag = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: '待处理', className: 'tag-orange' },
      approved: { label: '已通过', className: 'tag-green' },
      rejected: { label: '已驳回', className: 'tag-red' },
      cancelled: { label: '已取消', className: 'tag-gray' }
    };
    const info = statusMap[status] || { label: status, className: 'tag-gray' };
    return <span className={`tag ${info.className}`}>{info.label}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">个人工作台</h1>
      </div>

      <div className="workbench-stats">
        {stats.map(stat => (
          <div key={stat.label} className={`stat-card stat-${stat.color}`}>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="tabs">
            <div 
              className={`tab-item ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              待办事项
              {pendingTasks.length > 0 && (
                <span className="badge">{pendingTasks.length}</span>
              )}
            </div>
            <div 
              className={`tab-item ${activeTab === 'done' ? 'active' : ''}`}
              onClick={() => setActiveTab('done')}
            >
              已办事项
            </div>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            {loading ? (
              <div className="empty-state">加载中...</div>
            ) : displayTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div>{activeTab === 'pending' ? '暂无待办任务' : '暂无已办任务'}</div>
              </div>
            ) : (
              <div>
                {displayTasks.map(task => (
                  <div key={task.id} className="task-card">
                    <div className="task-card-header">
                      <div className="task-title">{task.nodeName}</div>
                      {getTaskStatusTag(task.status)}
                    </div>
                    <div className="task-meta">
                      流程：{task.definitionName} · 发起人：{task.startedBy} · {formatDate(task.createdAt)}
                    </div>
                    <div className="task-form-data">
                      {Object.entries(task.formData).slice(0, 3).map(([key, value]) => (
                        <div key={key} className="form-data-item">
                          <span className="form-data-label">{key}：</span>
                          <span className="form-data-value">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="task-actions">
                      {task.status === 'pending' && (
                        <>
                          <button 
                            className="btn btn-success btn-sm"
                            onClick={() => handleApprove(task)}
                          >
                            同意
                          </button>
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleReject(task)}
                          >
                            驳回
                          </button>
                        </>
                      )}
                      <button 
                        className="btn btn-sm"
                        onClick={() => handleViewInstance(task.instanceId)}
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showApproveModal && (
        <div className="modal-overlay" onClick={() => setShowApproveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">审批同意</div>
              <div className="modal-close" onClick={() => setShowApproveModal(false)}>×</div>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">审批意见（选填）</label>
                <textarea
                  className="form-textarea"
                  value={approveComment}
                  onChange={(e) => setApproveComment(e.target.value)}
                  placeholder="请输入审批意见"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowApproveModal(false)}>取消</button>
              <button className="btn btn-success" onClick={confirmApprove}>确认同意</button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">审批驳回</div>
              <div className="modal-close" onClick={() => setShowRejectModal(false)}>×</div>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">驳回理由 <span className="required">*</span></label>
                <textarea
                  className="form-textarea"
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="请输入驳回理由"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowRejectModal(false)}>取消</button>
              <button className="btn btn-danger" onClick={confirmReject}>确认驳回</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Workbench;
