import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FlowInstance, FlowDefinition, NodeStatus, InstanceStatus, FlowNode } from '../types';
import { api, MeInfo } from '../api';

function InstanceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [instance, setInstance] = useState<FlowInstance | null>(null);
  const [definition, setDefinition] = useState<FlowDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeInfo | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [inst, meInfo] = await Promise.all([
        api.getInstance(id),
        api.getMe()
      ]);
      setMe(meInfo);
      setInstance(inst);
      
      const d = await api.getDefinition(inst.definitionId);
      setDefinition(d);
    } catch (e: any) {
      console.error(e);
      alert('加载失败：' + e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
    
    const interval = setInterval(() => {
      loadData();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [loadData]);

  const getNodeStatus = (nodeId: string): string => {
    if (!instance) return 'pending';
    const execution = instance.executions[nodeId];
    if (!execution) return 'pending';
    
    switch (execution.status) {
      case NodeStatus.COMPLETED:
      case NodeStatus.APPROVED:
        return 'completed';
      case NodeStatus.RUNNING:
        return 'running';
      case NodeStatus.REJECTED:
        return 'rejected';
      default:
        return 'pending';
    }
  };

  const getNodeCenter = (node: FlowNode) => {
    let width = 120;
    let height = 44;
    if (node.type === 'condition') {
      width = 100;
      height = 80;
    }
    return {
      x: node.x + width / 2,
      y: node.y + height / 2,
      width,
      height
    };
  };

  const getHandlePosition = (nodeId: string, handleType: string) => {
    if (!definition) return { x: 0, y: 0 };
    const node = definition.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    
    const center = getNodeCenter(node);
    
    if (node.type === 'condition') {
      if (handleType === 'left') {
        return { x: node.x, y: center.y };
      }
      if (handleType === 'true') {
        return { x: node.x + center.width, y: center.y + center.height * 0.25 };
      }
      if (handleType === 'false') {
        return { x: node.x + center.width, y: center.y - center.height * 0.25 };
      }
      return { x: node.x + center.width, y: center.y };
    }
    
    switch (handleType) {
      case 'left':
        return { x: node.x, y: center.y };
      case 'right':
        return { x: node.x + center.width, y: center.y };
      default:
        return { x: node.x + center.width, y: center.y };
    }
  };

  const renderEdgePath = (sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }) => {
    const dx = targetPos.x - sourcePos.x;
    const controlOffset = Math.min(Math.abs(dx) / 2, 80);
    return `M ${sourcePos.x} ${sourcePos.y} C ${sourcePos.x + controlOffset} ${sourcePos.y}, ${targetPos.x - controlOffset} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      running: { label: '运行中', className: 'tag-blue' },
      suspended: { label: '已挂起', className: 'tag-orange' },
      completed: { label: '已完成', className: 'tag-green' },
      terminated: { label: '已终止', className: 'tag-red' },
      rejected: { label: '已驳回', className: 'tag-red' }
    };
    const info = statusMap[status] || { label: status, className: 'tag-gray' };
    return <span className={`tag ${info.className}`}>{info.label}</span>;
  };

  const handleSuspend = async () => {
    if (!instance) return;
    if (!confirm('确定要挂起此流程吗？')) return;
    try {
      const result = await api.suspendInstance(instance.id);
      setInstance(result);
    } catch (e: any) {
      alert('操作失败：' + e.message);
    }
  };

  const handleResume = async () => {
    if (!instance) return;
    try {
      const result = await api.resumeInstance(instance.id);
      setInstance(result);
    } catch (e: any) {
      alert('操作失败：' + e.message);
    }
  };

  const handleTerminate = async () => {
    if (!instance) return;
    const reason = prompt('请输入终止原因：');
    if (reason === null) return;
    try {
      const result = await api.terminateInstance(instance.id, reason);
      setInstance(result);
    } catch (e: any) {
      alert('操作失败：' + e.message);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const getNodeClassName = (node: FlowNode, status: string) => {
    const base = 'flow-node';
    const typeClass = `${node.type}-node`;
    return `${base} ${typeClass}`.trim();
  };

  if (loading) {
    return <div className="empty-state">加载中...</div>;
  }

  if (!instance || !definition) {
    return <div className="empty-state">流程实例不存在</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn" onClick={() => navigate('/instances')}>← 返回</button>
          <h1 className="page-title">{instance.definitionName}</h1>
          <span className="tag tag-blue">v{instance.definitionVersion}</span>
          {getStatusTag(instance.status)}
        </div>
        <div className="page-actions">
          {me?.isAdmin && instance.status === InstanceStatus.RUNNING && (
            <button className="btn" onClick={handleSuspend}>
              挂起
            </button>
          )}
          {me?.isAdmin && instance.status === InstanceStatus.SUSPENDED && (
            <button className="btn btn-primary" onClick={handleResume}>
              恢复
            </button>
          )}
          {me?.isAdmin && (instance.status === InstanceStatus.RUNNING || instance.status === InstanceStatus.SUSPENDED) && (
            <button className="btn btn-danger" onClick={handleTerminate}>
              强制终止
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div>
              <div style={{ color: '#999', fontSize: '13px', marginBottom: '4px' }}>实例ID</div>
              <div style={{ fontFamily: 'monospace', fontSize: '13px' }}>{instance.id}</div>
            </div>
            <div>
              <div style={{ color: '#999', fontSize: '13px', marginBottom: '4px' }}>发起人</div>
              <div>{instance.startedBy}</div>
            </div>
            <div>
              <div style={{ color: '#999', fontSize: '13px', marginBottom: '4px' }}>开始时间</div>
              <div>{formatDate(instance.startedAt)}</div>
            </div>
            <div>
              <div style={{ color: '#999', fontSize: '13px', marginBottom: '4px' }}>结束时间</div>
              <div>{formatDate(instance.endedAt)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-layout">
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">流程图</div>
            </div>
            <div className="card-body">
              <div 
                className="flow-canvas-container"
                ref={canvasRef}
                style={{ 
                  position: 'relative',
                  overflow: 'auto',
                  height: '400px'
                }}
              >
                <div style={{ position: 'relative', width: '1500px', height: '500px' }}>
                  <svg className="flow-svg" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
                    {definition.edges.map(edge => {
                      const sourcePos = getHandlePosition(edge.source, edge.sourceHandle || 'right');
                      const targetPos = getHandlePosition(edge.target, edge.targetHandle || 'left');
                      const sourceStatus = getNodeStatus(edge.source);
                      const isActive = sourceStatus === 'completed' || sourceStatus === 'running';

                      return (
                        <g key={edge.id}>
                          <path
                            d={renderEdgePath(sourcePos, targetPos)}
                            className={`edge-line ${isActive ? 'active' : ''}`}
                            style={{ pointerEvents: 'none' }}
                          />
                          {edge.sourceHandle && (
                            <text
                              x={(sourcePos.x + targetPos.x) / 2}
                              y={(sourcePos.y + targetPos.y) / 2 - 8}
                              textAnchor="middle"
                              fontSize="12"
                              fill={edge.sourceHandle === 'true' ? '#52c41a' : '#ff4d4f'}
                            >
                              {edge.sourceHandle === 'true' ? '是' : '否'}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {definition.nodes.map(node => {
                    const status = getNodeStatus(node.id);
                    const statusIconMap: Record<string, string> = {
                      completed: '✓',
                      running: '◉',
                      rejected: '✗',
                      pending: ''
                    };
                    const statusIcon = statusIconMap[status];

                    return (
                      <div
                        key={node.id}
                        className={getNodeClassName(node, status)}
                        style={{ 
                          position: 'absolute',
                          left: node.x, 
                          top: node.y,
                          cursor: 'default'
                        }}
                      >
                        {statusIcon && (
                          <div className={`node-status-icon node-status-${status}`}>
                            {statusIcon}
                          </div>
                        )}
                        <div className="node-label">{node.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">表单数据</div>
            </div>
            <div className="card-body">
              {definition.formFields && definition.formFields.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  {definition.formFields.map(field => (
                    <div key={field.key}>
                      <div style={{ color: '#999', fontSize: '13px', marginBottom: '4px' }}>{field.label}</div>
                      <div>{instance.formData[field.key] || '-'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#999' }}>无表单数据</div>
              )}
            </div>
          </div>
        </div>

        <div className="sidebar-panel">
          <div className="card">
            <div className="card-header">
              <div className="card-title">流转日志</div>
            </div>
            <div className="card-body">
              <div className="log-list" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {instance.logs.length === 0 ? (
                  <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                    暂无日志
                  </div>
                ) : (
                  instance.logs.map(log => (
                    <div key={log.id} className="log-item">
                      <div className="log-dot"></div>
                      <div className="log-content">
                        <div className="log-action">
                          {log.action}
                          {log.operator && <span style={{ color: '#666', fontWeight: 'normal' }}> - {log.operator}</span>}
                        </div>
                        <div className="log-meta">{formatDate(log.timestamp)}</div>
                        {log.detail && <div className="log-detail">{log.detail}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstanceDetail;
