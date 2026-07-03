import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectHouse } from '@/store/showcaseSlice';
import { housesForTest } from '@/lib/houseData';

export function useHouseGridLogic() {
  const dispatch = useAppDispatch();
  const testId = useAppSelector(s => s.showcase.testId);
  const modelFilter = useAppSelector(s => s.showcase.modelFilter);
  const effortFilter = useAppSelector(s => s.showcase.effortFilter);

  const filteredHouses = (testId ? housesForTest(testId) : []).filter(h =>
    (modelFilter === 'all' || h.model === modelFilter) &&
    (effortFilter === 'all' || h.effort === effortFilter)
  );

  const handleSelect = (id: string) => { dispatch(selectHouse(id)); };

  return { filteredHouses, handleSelect };
}
