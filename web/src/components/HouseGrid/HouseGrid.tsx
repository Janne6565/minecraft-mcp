import { HouseCard } from '@/components/HouseCard';
import { useHouseGridLogic } from './useHouseGridLogic';

export function HouseGrid() {
  const { filteredHouses, handleSelect } = useHouseGridLogic();
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))',
      gap: 24,
      paddingTop: 20,
      width: '100%',
    }}>
      {filteredHouses.map(house => (
        <HouseCard key={house.id} house={house} onClick={() => handleSelect(house.id)} />
      ))}
    </div>
  );
}
