import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { MobileNavigation } from './MobileNavigation';
import { CreateRoomModal } from '../rooms/CreateRoomModal';
import { QuickSearchModal } from './QuickSearchModal';

export const AppLayout = () => {
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();

  // Dynamic header titles based on route
  const getHeaderInfo = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) {
      return {
        title: 'Network Overview',
        subtitle: 'Activity stream, active topics, and real-time community presence'
      };
    }
    if (path.startsWith('/chat')) {
      return {
        title: 'Rooms',
        subtitle: 'Messages in the rooms you have joined'
      };
    }
    if (path.startsWith('/rooms')) {
      return {
        title: 'Chatroom Explorer',
        subtitle: 'Discover, create, and participate in technical discourse channels'
      };
    }
    if (path.startsWith('/notifications')) {
      return {
        title: 'Activity & Notifications',
        subtitle: 'Mentions, thread replies, system security alerts, and invites'
      };
    }
    if (path.startsWith('/profile')) {
      return {
        title: 'Member Profile',
        subtitle: 'Account identity, presence telemetry, and security verification'
      };
    }
    if (path.startsWith('/settings')) {
      return {
        title: 'Platform Preferences',
        subtitle: 'Manage local appearance, notifications, security tokens, and sessions'
      };
    }
    return { title: 'NEXORA', subtitle: 'Connect beyond boundaries' };
  };

  const { title, subtitle } = getHeaderInfo();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0b10] text-slate-100">
      {/* Sidebar for Desktop */}
      <AppSidebar onOpenCreateRoom={() => setIsCreateRoomOpen(true)} />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopBar
          title={title}
          subtitle={subtitle}
          onOpenCreateRoom={() => setIsCreateRoomOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />

      {/* Global Modals */}
      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
      />

      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
};
