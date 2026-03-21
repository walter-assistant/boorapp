import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ziqaretckjagqpxpkkdi.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_0mJ1lwEIejHKgCxenHNFog_g1cmxxKX';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Data keys that map to the original localStorage keys
export const DATA_KEYS = ['gr_klanten', 'gr_offertes'] as const;

export type DataKey = typeof DATA_KEYS[number];

// Load all user data from Supabase into localStorage
// IMPORTANT: Use the ORIGINAL key names (no prefix) because boorapp.js reads them directly
export async function loadUserData(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('user_data')
    .select('data_key, data_value')
    .eq('user_id', userId);

  if (error) {
    console.error('Error loading user data:', error);
    return;
  }

  if (data) {
    data.forEach(row => {
      // Store with the ORIGINAL key name so boorapp.js can read it directly
      localStorage.setItem(row.data_key, JSON.stringify(row.data_value));
    });
  }
}

// Save a single key to Supabase
export async function saveUserData(userId: string, key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from('user_data')
    .upsert(
      { user_id: userId, data_key: key, data_value: value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,data_key' }
    );

  if (error) {
    console.error('Error saving user data:', error);
  }
}

// Save all localStorage data to Supabase
export async function saveAllUserData(userId: string): Promise<void> {
  const rows = DATA_KEYS.map(key => {
    const raw = localStorage.getItem(key);
    let value = null;
    try { value = raw ? JSON.parse(raw) : null; } catch { value = null; }
    return { user_id: userId, data_key: key, data_value: value, updated_at: new Date().toISOString() };
  }).filter(row => row.data_value !== null);

  if (rows.length === 0) return;

  const { error } = await supabase
    .from('user_data')
    .upsert(rows, { onConflict: 'user_id,data_key' });

  if (error) {
    console.error('Error saving all user data:', error);
  }
}

// Delete all user data from Supabase
export async function deleteAllUserData(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_data')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting user data:', error);
  }
}
