import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UserDevice {
  id: string;
  provider: string;
  status: string;
  connected_at: string;
}

export function useUserDevices(userId: string | undefined) {
  const [connectedDevices, setConnectedDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchDevices = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('user_devices')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active');

        if (fetchError) throw fetchError;
        
        setConnectedDevices(data || []);
        setError(null);
      } catch (err) {
        if (err instanceof Error) {
          console.error('Error fetching user devices:', err);
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();

    // Subscribe to device changes
    const subscription = supabase
      .channel('user_devices')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_devices',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchDevices();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return {
    connectedDevices,
    loading,
    error
  };
}