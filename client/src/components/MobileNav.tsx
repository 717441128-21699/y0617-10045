interface MobileNavProps {
  items: { key: string; label: string; icon: string }[];
  activeKey: string;
  onSelect: (key: string) => void;
}

function MobileNav({ items, activeKey, onSelect }: MobileNavProps) {
  return (
    <div className="mobile-nav">
      {items.map(item => (
        <div 
          key={item.key}
          className={`mobile-nav-item ${activeKey === item.key ? 'active' : ''}`}
          onClick={() => onSelect(item.key)}
        >
          <div className="mobile-nav-icon">{item.icon}</div>
          <div>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export default MobileNav;
