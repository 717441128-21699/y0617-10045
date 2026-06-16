import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FlowCanvas from '../components/FlowCanvas';
import NodePalette from '../components/NodePalette';
import NodeProperties from '../components/NodeProperties';
import FormFieldsEditor from '../components/FormFieldsEditor';
import { FlowNode, FlowEdge, FlowDefinition, NodeType, FormField } from '../types';
import { api } from '../api';

function FlowDesigner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [definition, setDefinition] = useState<FlowDefinition | null>(null);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [flowName, setFlowName] = useState('');
  const [flowDesc, setFlowDesc] = useState('');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [showFormEditor, setShowFormEditor] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (id === 'new') {
      setIsNew(true);
      setIsPublished(false);
      setFlowName('新流程');
      setNodes([
        { id: 'start', type: NodeType.START, name: '开始', x: 50, y: 200 },
        { id: 'end', type: NodeType.END, name: '结束', x: 400, y: 200 }
      ]);
      setEdges([]);
      setFormFields([
        { key: 'title', label: '标题', type: 'text', required: true },
        { key: 'reason', label: '说明', type: 'textarea' }
      ]);
      return;
    }

    const loadDefinition = async () => {
      if (id) {
        try {
          const def = await api.getDefinition(id);
          setDefinition(def);
          setNodes(def.nodes);
          setEdges(def.edges);
          setFlowName(def.name);
          setFlowDesc(def.description || '');
          setFormFields(def.formFields || []);
          setIsPublished(def.published);
        } catch (e: any) {
          alert('加载失败：' + e.message);
        }
      }
    };

    loadDefinition();
  }, [id]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  const handleNodeChange = (updatedNode: FlowNode) => {
    setNodes(nodes.map(n => n.id === updatedNode.id ? updatedNode : n));
  };

  const handleNodeDelete = (nodeId: string) => {
    if (confirm('确定要删除这个节点吗？相关连线也会被删除。')) {
      setNodes(nodes.filter(n => n.id !== nodeId));
      setEdges(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
      setSelectedNodeId(null);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' && selectedNodeId) {
      const node = nodes.find(n => n.id === selectedNodeId);
      if (node && node.type !== NodeType.START && node.type !== NodeType.END) {
        handleNodeDelete(selectedNodeId);
      }
    }
  }, [selectedNodeId, nodes]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const validateFlow = (): string | null => {
    const startNodes = nodes.filter(n => n.type === NodeType.START);
    const endNodes = nodes.filter(n => n.type === NodeType.END);

    if (startNodes.length !== 1) {
      return '流程必须有且只有一个开始节点';
    }
    if (endNodes.length !== 1) {
      return '流程必须有且只有一个结束节点';
    }

    const connectedNodes = new Set<string>();
    edges.forEach(e => {
      connectedNodes.add(e.source);
      connectedNodes.add(e.target);
    });

    const disconnected = nodes.filter(n => !connectedNodes.has(n.id) && n.type !== NodeType.START && n.type !== NodeType.END);
    if (disconnected.length > 0) {
      return `存在未连接的节点: ${disconnected.map(n => n.name).join(', ')}`;
    }

    return null;
  };

  const handleSave = async (publish: boolean = false) => {
    const error = validateFlow();
    if (error) {
      alert(error);
      return;
    }

    if (!flowName.trim()) {
      alert('请输入流程名称');
      return;
    }

    const data = {
      name: flowName,
      description: flowDesc,
      nodes,
      edges,
      formFields
    };

    try {
      let savedDef: FlowDefinition;
      if (isNew) {
        savedDef = await api.createDefinition(data);
      } else if (definition) {
        savedDef = await api.updateDefinition(definition.id, data);
      } else {
        return;
      }

      if (publish) {
        await api.publishDefinition(savedDef.id);
        alert('发布成功');
      } else {
        alert('保存成功');
      }

      navigate('/definitions');
    } catch (e: any) {
      alert('保存失败：' + e.message);
    }
  };

  const handleBack = () => {
    navigate('/definitions');
  };

  const handleCreateNewVersion = async () => {
    if (!definition) return;
    try {
      const newVersion = await api.createNewVersion(definition.id);
      navigate(`/definitions/${newVersion.id}`);
    } catch (e: any) {
      alert('创建新版本失败：' + e.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn" onClick={handleBack}>← 返回</button>
          <h1 className="page-title" style={{ marginBottom: 0 }}>
            {isPublished && !isNew ? flowName : (
              <input
                type="text"
                style={{ 
                  fontSize: '18px', 
                  border: 'none', 
                  borderBottom: '1px solid transparent',
                  outline: 'none',
                  padding: '4px 0',
                  width: '300px',
                  background: 'transparent'
                }}
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                placeholder="请输入流程名称"
              />
            )}
          </h1>
          <span className="tag tag-blue">v{definition?.version || 1}</span>
          {definition?.published && (
            <span className="tag tag-green">已发布</span>
          )}
          {!definition?.published && !isNew && (
            <span className="tag tag-gray">草稿</span>
          )}
        </div>
        <div className="page-actions">
          {isPublished && !isNew ? (
            <button className="btn btn-primary" onClick={handleCreateNewVersion}>
              创建新版本
            </button>
          ) : (
            <>
              <button className="btn" onClick={() => setShowFormEditor(true)}>
                表单配置
              </button>
              <button className="btn" onClick={() => handleSave(false)}>
                保存
              </button>
              <button className="btn btn-primary" onClick={() => handleSave(true)}>
                发布
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flow-designer">
        {(!isPublished || isNew) && <NodePalette />}
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
          onNodeSelect={setSelectedNodeId}
          mode={isPublished && !isNew ? 'view' : 'design'}
        />
        {(!isPublished || isNew) && (
          <NodeProperties
            node={selectedNode}
            onNodeChange={handleNodeChange}
            onDelete={handleNodeDelete}
          />
        )}
      </div>

      {showFormEditor && (
        <FormFieldsEditor
          fields={formFields}
          onChange={setFormFields}
          onClose={() => setShowFormEditor(false)}
        />
      )}
    </div>
  );
}

export default FlowDesigner;
