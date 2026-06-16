import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FlowInstance, FlowDefinition } from '../types';
import { api } from '../api';
import StartInstanceModal from '../components/StartInstanceModal';

function InstanceList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [instances, setInstances] = useState<FlowInstance[]>([]);
  const [definitions, setDefinitions] = useState<FlowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedDefinition, setSelectedDefinition] = useState<FlowDefinition | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [insts, defs] = await Promise.all([
        api.getInstances(),
        api.getDefinitions()
      ]);
      setInstances(insts);
      setDefinitions(defs.filter(d => d.published));
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const defId = searchParams.get('definitionId');
    if (defId && definitions.length > 0) {
      const def = definitions.find(d => d.id === defId);
      if (def) {
        setSelectedDefinition(def);
        setShowStartModal(true);
      }
    }
  }, [searchParams, definitions]);

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

  const handleView = (id: string) => {
    navigate(`/instances/${id}`);
  };

  const handleStartInstance = (def: FlowDefinition) => {
    setSelectedDefinition(def);
    setShowStartModal(true);
  };

  const handleInstanceCreated = (instance: FlowInstance) => {
    setShowStartModal(false);
    loadData();
    navigate(`/instances/${instance.id}`);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">流程实例</h1>
        <div className="page-actions">
          <button 
            className="btn btn-primary" 
            onClick={() => {
              if (definitions.length === 1) {
                handleStartInstance(definitions[0]);
              } else {
                setSelectedDefinition(null);
                setShowStartModal(true);
              }
            }}
            disabled={definitions.length === 0}
          >
            + 发起流程
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="empty-state">加载中...</div>
          ) : instances.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔄</div>
              <div>暂无流程实例</div>
              <div style={{ marginTop: '16px' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowStartModal(true)}
                  disabled={definitions.length === 0}
                >
                  发起流程
                </button>
              </div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>实例ID</th>
                  <th>流程名称</th>
                  <th>状态</th>
                  <th>发起人</th>
                  <th>开始时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {instances.map(inst => (
                  <tr key={inst.id} onClick={() => handleView(inst.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {inst.id.substring(0, 8)}...
                    </td>
                    <td style={{ fontWeight: '500' }}>{inst.definitionName}</td>
                    <td>{getStatusTag(inst.status)}</td>
                    <td>{inst.startedBy}</td>
                    <td style={{ color: '#999', fontSize: '13px' }}>
                      {formatDate(inst.startedAt)}
                    </td>
                    <td>
                      <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); handleView(inst.id); }}>
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showStartModal && (
        <StartInstanceModal
          definitions={definitions}
          selectedDefinition={selectedDefinition}
          onClose={() => setShowStartModal(false)}
          onSuccess={handleInstanceCreated}
        />
      )}
    </div>
  );
}

export default InstanceList;
