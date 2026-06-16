import { useState } from 'react';

interface HeaderProps {
  currentUser: string;
  onUserChange: (user: string) => void;
}

const USER_OPTIONS = [
  'admin',
  'manager1',
  'manager2',
  'finance1',
  'director1',
  'director2',
  'hr1',
  'hr2',
  'applicant'
];

function Header({ currentUser, onUserChange }: HeaderProps) {
  const [user, setUser] = useState(currentUser);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUser = e.target.value;
    setUser(newUser);
    onUserChange(newUser);
  };

  return (
    <div className="header">
      <div className="header-title">可视化业务流程审批引擎</div>
      <div className="header-right">
        <span style={{ fontSize: '13px', color: '#666' }}>当前用户：</span>
        <select 
          className="user-selector"
          value={user}
          onChange={handleChange}
        >
          {USER_OPTIONS.map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default Header;
