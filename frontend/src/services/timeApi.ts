import { API_BASE } from './network';

interface TimeData {
  current_time: string;
  timezone: string;
  source: 'api' | 'fallback';
  last_sync: string;
  drift_offset: number;
  server_time: string;
}

interface TimeResponse {
  success: boolean;
  data: TimeData;
}

export const timeApi = {
  getCurrentTime: async (): Promise<TimeData> => {
    const response = await fetch(`${API_BASE}/time/current`);
    const data: TimeResponse = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to fetch current time');
    }
    
    return data.data;
  },

  syncTime: async (): Promise<TimeData> => {
    const response = await fetch(`${API_BASE}/time/sync`);
    const data: TimeResponse = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to sync time');
    }
    
    return data.data;
  },

  getTimeStatus: async (): Promise<TimeData & { sync_interval: number; is_syncing: boolean }> => {
    const response = await fetch(`${API_BASE}/time/status`);
    const data: TimeResponse = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to get time status');
    }
    
    return data.data as any;
  }
};
