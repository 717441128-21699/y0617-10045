import { useState } from 'react';
import { FormField } from '../types';

interface FormFieldsEditorProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  onClose: () => void;
}

function FormFieldsEditor({ fields, onChange, onClose }: FormFieldsEditorProps) {
  const [localFields, setLocalFields] = useState<FormField[]>(fields);

  const addField = () => {
    const newField: FormField = {
      key: `field_${Date.now()}`,
      label: '新字段',
      type: 'text',
      required: false
    };
    setLocalFields([...localFields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...localFields];
    newFields[index] = { ...newFields[index], ...updates };
    setLocalFields(newFields);
  };

  const removeField = (index: number) => {
    setLocalFields(localFields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: number) => {
    const newFields = [...localFields];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newFields.length) return;
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setLocalFields(newFields);
  };

  const handleSave = () => {
    onChange(localFields);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">表单配置</div>
          <div className="modal-close" onClick={onClose}>×</div>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: '16px' }}>
            <button className="btn btn-primary btn-sm" onClick={addField}>
              + 添加字段
            </button>
          </div>

          {localFields.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div>暂无表单字段，点击上方按钮添加</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {localFields.map((field, index) => (
                <div key={field.key} style={{ 
                  padding: '12px', 
                  border: '1px solid #e8e8e8', 
                  borderRadius: '4px',
                  background: '#fafafa'
                }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="字段标识(key)"
                      value={field.key}
                      onChange={(e) => updateField(index, { key: e.target.value })}
                      style={{ flex: 1, padding: '6px 8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                    />
                    <input
                      type="text"
                      placeholder="显示名称"
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      style={{ flex: 1, padding: '6px 8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, { type: e.target.value as any })}
                      style={{ padding: '6px 8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                    >
                      <option value="text">文本输入</option>
                      <option value="number">数字</option>
                      <option value="textarea">多行文本</option>
                      <option value="select">下拉选择</option>
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                      />
                      必填
                    </label>
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-sm" onClick={() => moveField(index, -1)}>↑</button>
                    <button className="btn btn-sm" onClick={() => moveField(index, 1)}>↓</button>
                    <button className="btn btn-danger btn-sm" onClick={() => removeField(index)}>删除</button>
                  </div>
                  {field.type === 'select' && (
                    <div style={{ marginTop: '8px' }}>
                      <input
                        type="text"
                        placeholder="选项值，用逗号分隔"
                        value={(field.options || []).join(', ')}
                        onChange={(e) => updateField(index, { 
                          options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                        })}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSave}>确定</button>
        </div>
      </div>
    </div>
  );
}

export default FormFieldsEditor;
