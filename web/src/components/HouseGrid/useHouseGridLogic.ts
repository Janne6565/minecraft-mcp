import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectHouse } from '@/store/showcaseSlice';
import { HOUSES } from '@/lib/houseData';

export function useHouseGridLogic() {
  const dispatch = useAppDispatch();
  const modelFilter = useAppSelector(s => s.showcase.modelFilter);
  const effortFilter = useAppSelector(s => s.showcase.effortFilter);

  const filteredHouses = HOUSES.filter(h =>
    (modelFilter === 'all' || h.model === modelFilter) &&
    (effortFilter === 'all' || h.effort === effortFilter)
  );

  const handleSelect = (id: string) => { dispatch(selectHouse(id)); };

  return { filteredHouses, handleSelect };
}
