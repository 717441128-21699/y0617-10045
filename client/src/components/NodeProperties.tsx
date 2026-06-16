import { useState } from 'react';
import { FlowNode, NodeType, ApprovalMode } from '../types';

interface NodePropertiesProps {
  node: FlowNode | null;
  onNodeChange: (node: FlowNode) => void;
  onDelete?: (nodeId: string) => void;
}

function NodeProperties({ node, onNodeChange, onDelete }: NodePropertiesProps) {
  const [tagInput, setTagInput] = useState('');

  if (!node) {
    return (
      <div className="designer-properties">
        <h3>节点属性</h3>
        <div style={{ color: '#999', fontSize: '13px' }}>
          请选择一个节点查看属性
        </div>
      </div>
    );
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onNodeChange({ ...node, name: e.target.value });
  };

  const handleConfigChange = (key: string, value: any) => {
    onNodeChange({
      ...node,
      config: {
        ...node.config,
        [key]: value
      }
    });
  };

  const handleAddApprover = () => {
    if (!tagInput.trim()) return;
    const approvers = node.config?.approvers || [];
    if (!approvers.includes(tagInput.trim())) {
      handleConfigChange('approvers', [...approvers, tagInput.trim()]);
    }
    setTagInput('');
  };

  const handleRemoveApprover = (approver: string) => {
    const approvers = node.config?.approvers?.filter(a => a !== approver) || [];
    handleConfigChange('approvers', approvers);
  };

  const handleAddRecipient = () => {
    if (!tagInput.trim()) return;
    const recipients = node.config?.recipients || [];
    if (!recipients.includes(tagInput.trim())) {
      handleConfigChange('recipients', [...recipients, tagInput.trim()]);
    }
    setTagInput('');
  };

  const handleRemoveRecipient = (recipient: string) => {
    const recipients = node.config?.recipients?.filter(r => r !== recipient) || [];
    handleConfigChange('recipients', recipients);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent, onAdd: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAdd();
    }
  };

  return (
    <div className="designer-properties">
      <h3>节点属性</h3>

      <div className="property-item">
        <div className="property-label">节点名称</div>
        <input
          type="text"
          className="property-input"
          value={node.name}
          onChange={handleNameChange}
          readOnly={node.type === NodeType.START || node.type === NodeType.END}
        />
      </div>

      <div className="property-item">
        <div className="property-label">节点类型</div>
        <div style={{ fontSize: '13px', color: '#666' }}>
          {node.type === NodeType.START && '开始节点'}
          {node.type === NodeType.END && '结束节点'}
          {node.type === NodeType.APPROVAL && '审批节点'}
          {node.type === NodeType.NOTIFICATION && '通知节点'}
          {node.type === NodeType.CONDITION && '条件分支节点'}
        </div>
      </div>

      {node.type === NodeType.APPROVAL && (
        <>
          <div className="property-item">
            <div className="property-label">审批模式</div>
            <select
              className="property-input"
              value={node.config?.mode || ApprovalMode.ANY}
              onChange={(e) => handleConfigChange('mode', e.target.value)}
            >
              <option value={ApprovalMode.ANY}>或签（一人同意即通过）</option>
              <option value={ApprovalMode.ALL}>会签（所有人同意才通过）</option>
            </select>
          </div>

          <div className="property-item">
            <div className="property-label">审批人</div>
            <div className="tags-input">
              {(node.config?.approvers || []).map(approver => (
                <span key={approver} className="tag-item">
                  {approver}
                  <span className="tag-remove" onClick={() => handleRemoveApprover(approver)}>×</span>
                </span>
              ))}
              <input
                type="text"
                className="tag-input"
                placeholder="添加审批人"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => handleTagKeyDown(e, handleAddApprover)}
                onBlur={handleAddApprover}
              />
            </div>
          </div>
        </>
      )}

      {node.type === NodeType.NOTIFICATION && (
        <>
          <div className="property-item">
            <div className="property-label">通知接收人</div>
            <div className="tags-input">
              {(node.config?.recipients || []).map(recipient => (
                <span key={recipient} className="tag-item">
                  {recipient}
                  <span className="tag-remove" onClick={() => handleRemoveRecipient(recipient)}>×</span>
                </span>
              ))}
              <input
                type="text"
                className="tag-input"
                placeholder="添加接收人"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => handleTagKeyDown(e, handleAddRecipient)}
                onBlur={handleAddRecipient}
              />
            </div>
          </div>

          <div className="property-item">
            <div className="property-label">通知内容</div>
            <textarea
              className="property-input"
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={node.config?.message || ''}
              onChange={(e) => handleConfigChange('message', e.target.value)}
              placeholder="请输入通知内容"
            />
          </div>
        </>
      )}

      {node.type === NodeType.CONDITION && (
        <>
          <div className="property-item">
            <div className="property-label">判断字段</div>
            <input
              type="text"
              className="property-input"
              value={node.config?.field || ''}
              onChange={(e) => handleConfigChange('field', e.target.value)}
              placeholder="如: amount, department"
            />
          </div>

          <div className="property-item">
            <div className="property-label">比较符</div>
            <select
              className="property-input"
              value={node.config?.operator || '=='}
              onChange={(e) => handleConfigChange('operator', e.target.value)}
            >
              <option value="==">等于 (==)</option>
              <option value="!=">不等于 (!=)</option>
              <option value={'>'}>大于 ({'>'})</option>
              <option value={'>='}>大于等于 ({'>='})</option>
              <option value={'<'}>小于 ({'<'})</option>
              <option value={'<='}>小于等于 ({'<='})</option>
              <option value="contains">包含</option>
            </select>
          </div>

          <div className="property-item">
            <div className="property-label">比较值</div>
            <input
              type="text"
              className="property-input"
              value={node.config?.value || ''}
              onChange={(e) => handleConfigChange('value', e.target.value)}
              placeholder="请输入比较值"
            />
          </div>

          <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
            提示：条件成立时走"是"分支，不成立时走"否"分支
          </div>
        </>
      )}

      {node.type !== NodeType.START && node.type !== NodeType.END && onDelete && (
        <div className="property-item" style={{ marginTop: '20px' }}>
          <button 
            className="btn btn-danger" 
            style={{ width: '100%' }}
            onClick={() => onDelete(node.id)}
          >
            删除节点
          </button>
        </div>
      )}
    </div>
  );
}

export default NodeProperties;
