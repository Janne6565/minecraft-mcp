import { Outlet } from '@tanstack/react-router';
import { Header } from '@/components/Header';
import { HouseDetail } from '@/components/HouseDetail';

export function RootLayout() {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f1e8', color: '#2b2718', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Header />
      <Outlet />
      <HouseDetail />
    </div>
  );
}
