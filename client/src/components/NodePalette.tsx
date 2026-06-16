import { NodeType } from '../types';

interface NodePaletteProps {
  onDragStart?: (nodeType: NodeType) => void;
}

const nodeTypes = [
  { type: NodeType.START, label: '开始节点', icon: '▶', color: '#52c41a' },
  { type: NodeType.APPROVAL, label: '审批节点', icon: '✓', color: '#1890ff' },
  { type: NodeType.NOTIFICATION, label: '通知节点', icon: '📧', color: '#fa8c16' },
  { type: NodeType.CONDITION, label: '条件分支', icon: '◇', color: '#722ed1' },
  { type: NodeType.END, label: '结束节点', icon: '■', color: '#ff4d4f' }
];

function NodePalette({ onDragStart }: NodePaletteProps) {
  const handleDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    e.dataTransfer.setData('nodeType', nodeType);
    onDragStart?.(nodeType);
  };

  return (
    <div className="designer-sidebar">
      <h3>节点库</h3>
      {nodeTypes.map(item => (
        <div
          key={item.type}
          className="node-palette-item"
          draggable
          onDragStart={(e) => handleDragStart(e, item.type)}
        >
          <div 
            className="node-palette-icon" 
            style={{ background: item.color }}
          >
            {item.icon}
          </div>
          <span>{item.label}</span>
        </div>
      ))}
      
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#999', lineHeight: '1.8' }}>
        <h3 style={{ marginBottom: '8px' }}>操作说明</h3>
        <div>• 拖拽节点到画布添加</div>
        <div>• 点击节点可选中编辑</div>
        <div>• 从节点右侧圆点拖出连线</div>
        <div>• 点击连线可删除</div>
        <div>• 按 Delete 键删除选中节点</div>
      </div>
    </div>
  );
}

export default NodePalette;
