import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlowDefinition, FlowInstance, FormField } from '../types';
import { api } from '../api';

function DefinitionList() {
  const navigate = useNavigate();
  const [definitions, setDefinitions] = useState<FlowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedDefinition, setSelectedDefinition] = useState<FlowDefinition | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadDefinitions = async () => {
    try {
      setLoading(true);
      const data = await api.getDefinitions();
      setDefinitions(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDefinitions();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个流程定义吗？')) return;
    try {
      await api.deleteDefinition(id);
      loadDefinitions();
    } catch (e: any) {
      alert('删除失败：' + e.message);
    }
  };

  const handleCreate = () => {
    navigate('/definitions/new');
  };

  const handleEdit = async (def: FlowDefinition) => {
    if (def.published) {
      try {
        const newVersion = await api.createNewVersion(def.id);
        navigate(`/definitions/${newVersion.id}`);
      } catch (e: any) {
        alert('创建新版本失败：' + e.message);
      }
    } else {
      navigate(`/definitions/${def.id}`);
    }
  };

  const handleStartInstance = (def: FlowDefinition) => {
    setSelectedDefinition(def);
    setFormData({});
    setShowStartModal(true);
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
        <h1 className="page-title">流程管理</h1>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleCreate}>
            + 新建流程
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="empty-state">加载中...</div>
          ) : definitions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div>暂无流程定义</div>
              <div style={{ marginTop: '16px' }}>
                <button className="btn btn-primary" onClick={handleCreate}>
                  新建流程
                </button>
              </div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>流程名称</th>
                  <th>描述</th>
                  <th>状态</th>
                  <th>版本</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {definitions.map(def => (
                  <tr key={def.id}>
                    <td style={{ fontWeight: '500' }}>{def.name}</td>
                    <td style={{ color: '#666' }}>{def.description || '-'}</td>
                    <td>
                      {def.published ? (
                        <span className="tag tag-green">已发布</span>
                      ) : (
                        <span className="tag tag-gray">草稿</span>
                      )}
                    </td>
                    <td>v{def.version}</td>
                    <td style={{ color: '#999', fontSize: '13px' }}>
                      {formatDate(def.updatedAt)}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-sm" onClick={() => handleEdit(def)}>
                          编辑
                        </button>
                        {def.published && (
                          <button 
                            className="btn btn-primary btn-sm" 
                            onClick={() => handleStartInstance(def)}
                          >
                            发起
                          </button>
                        )}
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => handleDelete(def.id)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showStartModal && selectedDefinition && (
        <div className="modal-overlay" onClick={() => setShowStartModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">发起流程 - {selectedDefinition.name}</div>
              <div className="modal-close" onClick={() => setShowStartModal(false)}>×</div>
            </div>
            <div className="modal-body">
              {selectedDefinition.description && (
                <div style={{ 
                  marginBottom: '16px', 
                  padding: '12px', 
                  background: '#f6ffed', 
                  borderRadius: '4px', 
                  fontSize: '13px', 
                  color: '#52c41a' 
                }}>
                  {selectedDefinition.description}
                </div>
              )}

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
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowStartModal(false)} disabled={submitting}>取消</button>
              <button className="btn btn-primary" onClick={handleSubmitInstance} disabled={submitting}>
                {submitting ? '提交中...' : '提交'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DefinitionList;
