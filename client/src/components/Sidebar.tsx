interface SidebarProps {
  items: { key: string; label: string; icon: string }[];
  activeKey: string;
  onSelect: (key: string) => void;
}

function Sidebar({ items, activeKey, onSelect }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        🔗 流程审批引擎
      </div>
      <div className="sidebar-menu">
        {items.map(item => (
          <div 
            key={item.key}
            className={`menu-item ${activeKey === item.key ? 'active' : ''}`}
            onClick={() => onSelect(item.key)}
          >
            <span className="menu-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
