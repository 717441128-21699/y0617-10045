import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MobileNav from './components/MobileNav';
import DefinitionList from './pages/DefinitionList';
import FlowDesigner from './pages/FlowDesigner';
import InstanceList from './pages/InstanceList';
import InstanceDetail from './pages/InstanceDetail';
import Workbench from './pages/Workbench';
import { api } from './api';

function App() {
  const [currentUser, setCurrentUser] = useState<string>(
    localStorage.getItem('currentUser') || 'admin'
  );
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('currentUser', currentUser);
  }, [currentUser]);

  useEffect(() => {
    const seedDemo = async () => {
      try {
        const res = await fetch('/api/definitions');
        const data = await res.json();
        if (data.success && data.data.length === 0) {
          await api.seedDemo();
        }
      } catch (e) {
        // ignore
      }
    };
    seedDemo();
  }, []);

  const menuItems = [
    { key: '/workbench', label: '个人工作台', icon: '🏠' },
    { key: '/definitions', label: '流程管理', icon: '📋' },
    { key: '/instances', label: '流程实例', icon: '🔄' }
  ];

  const activeKey = menuItems.find(item => 
    location.pathname.startsWith(item.key)
  )?.key || '/workbench';

  return (
    <div className="app-container">
      <Sidebar 
        items={menuItems}
        activeKey={activeKey}
        onSelect={(key) => navigate(key)}
      />
      <div className="main-content">
        <Header 
          currentUser={currentUser}
          onUserChange={setCurrentUser}
        />
        <div className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/workbench" replace />} />
            <Route path="/workbench" element={<Workbench />} />
            <Route path="/definitions" element={<DefinitionList />} />
            <Route path="/definitions/new" element={<FlowDesigner />} />
            <Route path="/definitions/:id" element={<FlowDesigner />} />
            <Route path="/instances" element={<InstanceList />} />
            <Route path="/instances/:id" element={<InstanceDetail />} />
          </Routes>
        </div>
        <MobileNav 
          items={menuItems}
          activeKey={activeKey}
          onSelect={(key) => navigate(key)}
        />
      </div>
    </div>
  );
}

export default App;
