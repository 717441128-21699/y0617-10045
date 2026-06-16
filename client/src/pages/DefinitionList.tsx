import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlowDefinition } from '../types';
import { api } from '../api';

function DefinitionList() {
  const navigate = useNavigate();
  const [definitions, setDefinitions] = useState<FlowDefinition[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleEdit = (id: string) => {
    navigate(`/definitions/${id}`);
  };

  const handleStartInstance = (id: string) => {
    navigate(`/instances/new?definitionId=${id}`);
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
                        <button className="btn btn-sm" onClick={() => handleEdit(def.id)}>
                          编辑
                        </button>
                        {def.published && (
                          <button 
                            className="btn btn-primary btn-sm" 
                            onClick={() => handleStartInstance(def.id)}
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
    </div>
  );
}

export default DefinitionList;
