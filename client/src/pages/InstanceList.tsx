import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlowInstance, FlowDefinition, FormField } from '../types';
import { api } from '../api';

function InstanceList() {
  const navigate = useNavigate();
  const [instances, setInstances] = useState<FlowInstance[]>([]);
  const [definitions, setDefinitions] = useState<FlowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedDefinition, setSelectedDefinition] = useState<FlowDefinition | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

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

  const handleStartClick = () => {
    if (definitions.length === 1) {
      setSelectedDefinition(definitions[0]);
    } else {
      setSelectedDefinition(null);
    }
    setFormData({});
    setShowStartModal(true);
  };

  const handleSelectDefinition = (def: FlowDefinition) => {
    setSelectedDefinition(def);
    setFormData({});
  };

  const handleFieldChange = (field: FormField, value: any) => {
    setFormData(prev => ({ ...prev, [field.key]: value }));
  };

  const handleSubmitInstance = async () => {
    if (!selectedDefinition) return;

    const requiredFields = (selectedDefinition.formFields || []).filter(f => f.required);
    for (const field of requiredFields) {
      if (!formData[field.key] && formData[field.key] !== 0) {
        alert(`请填写${field.label}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const instance: FlowInstance = await api.startInstance(selectedDefinition.id, formData);
      setShowStartModal(false);
      loadData();
      navigate(`/instances/${instance.id}`);
    } catch (e: any) {
      alert('发起失败：' + e.message);
    } finally {
      setSubmitting(false);
    }
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
            onClick={handleStartClick}
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
                  onClick={handleStartClick}
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
        <div className="modal-overlay" onClick={() => setShowStartModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">发起流程</div>
              <div className="modal-close" onClick={() => setShowStartModal(false)}>×</div>
            </div>
            <div className="modal-body">
              {!selectedDefinition ? (
                <div>
                  <div className="form-group">
                    <label className="form-label">选择流程 <span className="required">*</span></label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {definitions.map(def => (
                        <div 
                          key={def.id}
                          onClick={() => handleSelectDefinition(def)}
                          style={{
                            padding: '12px',
                            border: '1px solid #e8e8e8',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ fontWeight: '500', marginBottom: '4px' }}>{def.name}</div>
                          <div style={{ fontSize: '12px', color: '#999' }}>{def.description || '暂无描述'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{selectedDefinition.name}</div>
                      {selectedDefinition.description && (
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{selectedDefinition.description}</div>
                      )}
                    </div>
                    <button className="btn btn-sm" onClick={() => setSelectedDefinition(null)}>更换流程</button>
                  </div>
                  {(selectedDefinition.formFields || []).length > 0 ? (
                    (selectedDefinition.formFields || []).map(field => (
                      <div key={field.key} className="form-group">
                        <label className="form-label">
                          {field.label}
                          {field.required && <span className="required">*</span>}
                        </label>
                        {field.type === 'text' && (
                          <input
                            type="text"
                            className="form-input"
                            value={formData[field.key] || ''}
                            onChange={(e) => handleFieldChange(field, e.target.value)}
                            placeholder={`请输入${field.label}`}
                          />
                        )}
                        {field.type === 'number' && (
                          <input
                            type="number"
                            className="form-input"
                            value={formData[field.key] || ''}
                            onChange={(e) => handleFieldChange(field, Number(e.target.value))}
                            placeholder={`请输入${field.label}`}
                          />
                        )}
                        {field.type === 'textarea' && (
                          <textarea
                            className="form-textarea"
                            value={formData[field.key] || ''}
                            onChange={(e) => handleFieldChange(field, e.target.value)}
                            placeholder={`请输入${field.label}`}
                          />
                        )}
                        {field.type === 'select' && (
                          <select
                            className="form-select"
                            value={formData[field.key] || ''}
                            onChange={(e) => handleFieldChange(field, e.target.value)}
                          >
                            <option value="">请选择</option>
                            {field.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                      该流程没有配置表单字段，点击提交直接发起
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowStartModal(false)} disabled={submitting}>取消</button>
              <button 
                className="btn btn-primary" 
                onClick={handleSubmitInstance} 
                disabled={submitting || !selectedDefinition}
              >
                {submitting ? '提交中...' : '提交'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstanceList;
