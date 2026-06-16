import { useState, useRef, useCallback, useEffect } from 'react';
import { FlowNode, FlowEdge, NodeType } from '../types';

interface FlowCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  onNodesChange: (nodes: FlowNode[]) => void;
  onEdgesChange: (edges: FlowEdge[]) => void;
  onNodeSelect: (nodeId: string | null) => void;
  mode?: 'design' | 'view';
  nodeStatuses?: Record<string, string>;
}

function FlowCanvas({
  nodes,
  edges,
  selectedNodeId,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  mode = 'design',
  nodeStatuses = {}
}: FlowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [connectingHandle, setConnectingHandle] = useState<string | undefined>(undefined);
  const [tempLine, setTempLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const getNodeCenter = useCallback((node: FlowNode) => {
    let width = 120;
    let height = 44;
    if (node.type === NodeType.CONDITION) {
      width = 100;
      height = 80;
    }
    return {
      x: node.x + width / 2,
      y: node.y + height / 2,
      width,
      height
    };
  }, []);

  const getHandlePosition = useCallback((nodeId: string, handleType: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    
    const center = getNodeCenter(node);
    
    if (node.type === NodeType.CONDITION) {
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
  }, [nodes, getNodeCenter]);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (mode !== 'design') return;
    e.stopPropagation();
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    onNodeSelect(nodeId);
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    setDraggingNode(nodeId);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const scrollLeft = canvasRef.current?.scrollLeft || 0;
    const scrollTop = canvasRef.current?.scrollTop || 0;

    if (draggingNode) {
      const x = e.clientX - canvasRect.left - dragOffset.x + scrollLeft;
      const y = e.clientY - canvasRect.top - dragOffset.y + scrollTop;

      const newNodes = nodes.map(node =>
        node.id === draggingNode ? { ...node, x: Math.max(0, x), y: Math.max(0, y) } : node
      );
      onNodesChange(newNodes);
    }

    if (connectingFrom) {
      const fromPos = getHandlePosition(connectingFrom, connectingHandle || 'right');
      setTempLine({
        x1: fromPos.x,
        y1: fromPos.y,
        x2: e.clientX - canvasRect.left + scrollLeft,
        y2: e.clientY - canvasRect.top + scrollTop
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingNode(null);
    setConnectingFrom(null);
    setConnectingHandle(undefined);
    setTempLine(null);
  };

  const handleCanvasClick = () => {
    if (mode === 'design') {
      onNodeSelect(null);
    }
  };

  const handleHandleMouseDown = (e: React.MouseEvent, nodeId: string, handleType?: string) => {
    if (mode !== 'design') return;
    e.stopPropagation();
    setConnectingFrom(nodeId);
    setConnectingHandle(handleType || 'right');
  };

  const handleHandleMouseUp = (e: React.MouseEvent, targetNodeId: string, targetHandle: string = 'left') => {
    if (mode !== 'design') return;
    e.stopPropagation();

    if (connectingFrom && connectingFrom !== targetNodeId) {
      const newEdge: FlowEdge = {
        id: `edge_${Date.now()}`,
        source: connectingFrom,
        target: targetNodeId,
        sourceHandle: connectingHandle,
        targetHandle
      };

      const exists = edges.some(
        e => e.source === connectingFrom && e.target === targetNodeId && e.sourceHandle === connectingHandle
      );

      if (!exists) {
        onEdgesChange([...edges, newEdge]);
      }
    }

    setConnectingFrom(null);
    setConnectingHandle(undefined);
    setTempLine(null);
  };

  const handleEdgeClick = (e: React.MouseEvent, edgeId: string) => {
    if (mode !== 'design') return;
    e.stopPropagation();
    if (confirm('确定要删除这条连线吗？')) {
      onEdgesChange(edges.filter(e => e.id !== edgeId));
    }
  };

  const getNodeClassName = (node: FlowNode) => {
    const base = 'flow-node';
    const typeClass = `${node.type}-node`;
    const selected = selectedNodeId === node.id ? 'selected' : '';
    return `${base} ${typeClass} ${selected}`.trim();
  };

  const getStatusIcon = (status?: string) => {
    if (!status) return null;
    const statusMap: Record<string, string> = {
      completed: '✓',
      running: '◉',
      rejected: '✗',
      pending: '○',
      approved: '✓'
    };
    return statusMap[status] || null;
  };

  const renderEdgePath = (sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }) => {
    const dx = targetPos.x - sourcePos.x;
    const controlOffset = Math.min(Math.abs(dx) / 2, 80);
    return `M ${sourcePos.x} ${sourcePos.y} C ${sourcePos.x + controlOffset} ${sourcePos.y}, ${targetPos.x - controlOffset} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;
  };

  const renderEdges = () => {
    return edges.map(edge => {
      const sourcePos = getHandlePosition(edge.source, edge.sourceHandle || 'right');
      const targetPos = getHandlePosition(edge.target, edge.targetHandle || 'left');
      const isActive = nodeStatuses[edge.source] === 'completed' || nodeStatuses[edge.source] === 'approved';

      const angle = Math.atan2(targetPos.y - sourcePos.y, targetPos.x - sourcePos.x);
      const arrowSize = 8;
      const arrowX = targetPos.x - arrowSize * Math.cos(angle);
      const arrowY = targetPos.y - arrowSize * Math.sin(angle);

      return (
        <g key={edge.id} style={{ pointerEvents: 'stroke' }}>
          <path
            d={renderEdgePath(sourcePos, targetPos)}
            className={`edge-line ${isActive ? 'active' : ''}`}
            style={{ pointerEvents: 'stroke', cursor: mode === 'design' ? 'pointer' : 'default' }}
            onClick={(e) => handleEdgeClick(e, edge.id)}
          />
          <polygon
            points={`${targetPos.x},${targetPos.y} ${arrowX - arrowSize * 0.5},${arrowY - arrowSize * 0.7} ${arrowX - arrowSize * 0.5},${arrowY + arrowSize * 0.7}`}
            className={`edge-arrow ${isActive ? 'active' : ''}`}
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
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    if (mode !== 'design') return;
    e.preventDefault();
    
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const scrollLeft = canvasRef.current?.scrollLeft || 0;
    const scrollTop = canvasRef.current?.scrollTop || 0;

    const nodeType = e.dataTransfer.getData('nodeType') as NodeType;
    if (!nodeType) return;

    const x = e.clientX - canvasRect.left + scrollLeft - 60;
    const y = e.clientY - canvasRect.top + scrollTop - 22;

    const nodeNames: Record<NodeType, string> = {
      [NodeType.START]: '开始',
      [NodeType.END]: '结束',
      [NodeType.APPROVAL]: '审批节点',
      [NodeType.NOTIFICATION]: '通知节点',
      [NodeType.CONDITION]: '条件分支'
    };

    const newNode: FlowNode = {
      id: `node_${Date.now()}`,
      type: nodeType,
      name: nodeNames[nodeType],
      x: Math.max(0, x),
      y: Math.max(0, y),
      config: nodeType === NodeType.APPROVAL ? { approvers: [], mode: 'any' as any } : undefined
    };

    onNodesChange([...nodes, newNode]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div 
      className="designer-canvas"
      ref={canvasRef}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onClick={handleCanvasClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="designer-canvas-inner">
        <svg className="flow-svg">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#999" />
            </marker>
          </defs>
          {renderEdges()}
          {tempLine && (
            <line
              x1={tempLine.x1}
              y1={tempLine.y1}
              x2={tempLine.x2}
              y2={tempLine.y2}
              stroke="#1890ff"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}
        </svg>

        {nodes.map(node => {
          const status = nodeStatuses[node.id];
          const statusIcon = getStatusIcon(status);
          
          return (
            <div
              key={node.id}
              className={getNodeClassName(node)}
              style={{ left: node.x, top: node.y }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            >
              {statusIcon && mode === 'view' && (
                <div className={`node-status-icon node-status-${status}`}>
                  {statusIcon}
                </div>
              )}
              
              {mode === 'design' && node.type !== NodeType.START && node.type !== NodeType.CONDITION && (
                <div
                  className="node-handle node-handle-left"
                  onMouseUp={(e) => handleHandleMouseUp(e, node.id, 'left')}
                />
              )}
              
              {node.type === NodeType.CONDITION && mode === 'design' && (
                <>
                  <div
                    className="node-handle node-handle-left"
                    onMouseUp={(e) => handleHandleMouseUp(e, node.id, 'left')}
                  />
                  <div
                    className="condition-handle-true"
                    onMouseDown={(e) => handleHandleMouseDown(e, node.id, 'true')}
                    title="是(条件成立)"
                  />
                  <div
                    className="condition-handle-false"
                    onMouseDown={(e) => handleHandleMouseDown(e, node.id, 'false')}
                    title="否(条件不成立)"
                  />
                </>
              )}
              
              {mode === 'design' && node.type !== NodeType.END && node.type !== NodeType.CONDITION && (
                <div
                  className="node-handle node-handle-right"
                  onMouseDown={(e) => handleHandleMouseDown(e, node.id, 'right')}
                />
              )}
              
              <div className="node-label">{node.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FlowCanvas;
