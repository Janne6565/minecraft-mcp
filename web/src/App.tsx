import { Provider } from 'react-redux';
import { store } from '@/store';
import { Header } from '@/components/Header';
import { FilterBar } from '@/components/FilterBar';
import { HouseGrid } from '@/components/HouseGrid';
import { HouseDetail } from '@/components/HouseDetail';
import './index.css';

export default function App() {
  return (
    <Provider store={store}>
      <div style={{ minHeight: '100vh', background: '#f5f1e8', color: '#2b2718', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <Header />
        <FilterBar />
        <HouseGrid />
        <HouseDetail />
      </div>
    </Provider>
  );
}
