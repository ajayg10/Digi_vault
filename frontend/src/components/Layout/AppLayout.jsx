import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import './AppLayout.css';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="app-body">
        <TopNav onToggleSidebar={() => setMobileOpen((prev) => !prev)} />
        <main className="app-main">
          <div className="app-content-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
