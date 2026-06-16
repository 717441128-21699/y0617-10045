import { useState, useEffect } from 'react';
import { FlowDefinition, FlowInstance, FormField } from '../types';
import { api } from '../api';

interface StartInstanceModalProps {
  definitions: FlowDefinition[];
  selectedDefinition: FlowDefinition | null;
  onClose: () => void;
  onSuccess: (instance: FlowInstance) => void;
}

function StartInstanceModal({ definitions, selectedDefinition, onClose, onSuccess }: StartInstanceModalProps) {
  const [defId, setDefId] = useState<string>(selectedDefinition?.id || '');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  const currentDef = definitions.find(d => d.id === defId);
  const formFields = currentDef?.formFields || [];

  useEffect(() => {
    if (selectedDefinition) {
      setDefId(selectedDefinition.id);
    }
  }, [selectedDefinition]);

  const handleFieldChange = (field: FormField, value: any) => {
    setFormData(prev => ({ ...prev, [field.key]: value }));
  };

  const handleSubmit = async () => {
    if (!defId) {
      alert('请选择流程');
      return;
    }

    const requiredFields = formFields.filter(f => f.required);
    for (const field of requiredFields) {
      if (!formData[field.key] && formData[field.key] !== 0) {
        alert(`请填写${field.label}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const instance = await api.startInstance(defId, formData);
      onSuccess(instance);
    } catch (e: any) {
      alert('发起失败：' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">发起流程</div>
          <div className="modal-close" onClick={onClose}>×</div>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">选择流程 <span className="required">*</span></label>
            <select 
              className="form-select"
              value={defId}
              onChange={(e) => {
                setDefId(e.target.value);
                setFormData({});
              }}
            >
              <option value="">请选择流程</option>
              {definitions.map(def => (
                <option key={def.id} value={def.id}>{def.name}</option>
              ))}
            </select>
          </div>

          {currentDef && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#f6ffed', borderRadius: '4px', fontSize: '13px', color: '#52c41a' }}>
              {currentDef.description || '暂无描述'}
            </div>
          )}

          {formFields.length > 0 && (
            <>
              <h4 style={{ marginBottom: '12px', fontSize: '14px' }}>表单信息</h4>
              {formFields.map(field => (
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
              ))}
            </>
          )}

          {formFields.length === 0 && currentDef && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              该流程没有配置表单字段
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose} disabled={submitting}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '提交'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default StartInstanceModal;
