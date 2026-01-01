
import { useEffect } from 'react';
import { supabase } from '../supabase';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export const useRealtime = (
  tableName: string,
  callback: (payload: any) => void,
  event: RealtimeEvent = '*',
  filter?: string
) => {
  useEffect(() => {
    const channel = supabase
      .channel(`public:${tableName}`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table: tableName, filter },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, event, filter, callback]); // Re-subscribe if params change
};
