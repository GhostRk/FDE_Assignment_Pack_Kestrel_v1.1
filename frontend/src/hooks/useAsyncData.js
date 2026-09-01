import { useCallback, useEffect, useState } from 'react';

export function useAsyncData(loader, dependencies = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const reload = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await loader();
      setState({ data, error: '', loading: false });
    } catch (error) {
      setState({ data: null, error: error.message, loading: false });
    }
  }, dependencies);

  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}
