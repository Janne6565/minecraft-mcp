import { Provider } from 'react-redux';
import { store } from '@/store';
import { useAppSelector } from '@/store/hooks';
import { Header } from '@/components/Header';
import { BenchmarkList } from '@/components/BenchmarkList';
import { TestPage } from '@/components/TestPage';
import { HouseDetail } from '@/components/HouseDetail';
import './index.css';

function Showcase() {
  const testId = useAppSelector(s => s.showcase.testId);
  return (
    <div style={{ minHeight: '100vh', background: '#f5f1e8', color: '#2b2718', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Header />
      {testId ? <TestPage /> : <BenchmarkList />}
      <HouseDetail />
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <Showcase />
    </Provider>
  );
}
