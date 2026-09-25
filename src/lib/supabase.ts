import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zkocfksybffyokzafwbd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_G_Jw9NjU_6lWvCd8d-tU1g_iSQonPHk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Data keys that map to the original localStorage keys
export const DATA_KEYS = ['gr_klanten', 'gr_offertes', 'boorapp_pva_personeel'] as const;

export type DataKey = typeof DATA_KEYS[number];

// Retain a recovery snapshot before replacing a device's offer collection.
function localValue(key: string): any {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}
function backupOffers() {
  const raw = localStorage.getItem('gr_offertes');
  if (raw && !localStorage.getItem('boorapp_offertes_before_sync_v2')) {
    localStorage.setItem('boorapp_offertes_before_sync_v2', raw);
  }
}
export function mergeOffers(remote: any[], local: any[]): any[] {
  const entries = new Map<string, any>();
  for (const item of [...remote, ...local]) {
    const id = String(item.id || item.kenmerk || JSON.stringify(item));
    const previous = entries.get(id);
    const stamp = (o: any) => Date.parse(o?._syncUpdatedAt || o?.savedAt || o?.archivedAt || '') || 0;
    if (!previous || stamp(item) > stamp(previous)) entries.set(id, item);
  }
  return Array.from(entries.values());
}
let queue: Promise<void> = Promise.resolve();
function serial(task: () => Promise<void>): Promise<void> {
  const next = queue.catch(() => {}).then(task);
  queue = next;
  return next;
}
async function syncOffers(userId: string): Promise<void> {
  backupOffers();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: row, error } = await supabase.from('user_data')
      .select('data_value,updated_at').eq('user_id', userId).eq('data_key', 'gr_offertes').maybeSingle();
    if (error) throw error;
    const local = localValue('gr_offertes') || [];
    const remote = row?.data_value || [];
    if (!Array.isArray(local) || !Array.isArray(remote)) throw new Error('Offertegegevens hebben een onbekend formaat');
    const merged = mergeOffers(remote, local);
    if (JSON.stringify(merged) === JSON.stringify(remote)) {
      localStorage.setItem('gr_offertes', JSON.stringify(merged));
      return;
    }
    const value = {data_value: merged, updated_at: new Date().toISOString()};
    if (row) {
      let request = supabase.from('user_data').update(value).eq('user_id', userId).eq('data_key','gr_offertes');
      request = row.updated_at ? request.eq('updated_at', row.updated_at) : request.is('updated_at', null);
      const {data, error: writeError} = await request.select('data_key');
      if (writeError) throw writeError;
      if (!data?.length) continue;
    } else {
      const {error: insertError} = await supabase.from('user_data').insert({user_id:userId,data_key:'gr_offertes',...value});
      if (insertError?.code === '23505') continue;
      if (insertError) throw insertError;
    }
    // An edit may have happened while the request was in flight: never discard it.
    localStorage.setItem('gr_offertes', JSON.stringify(mergeOffers(merged, localValue('gr_offertes') || [])));
    return;
  }
  throw new Error('Gelijktijdige wijzigingen; synchronisatie wordt opnieuw geprobeerd');
}
export async function loadUserData(userId: string): Promise<void> {
  await serial(async () => {
    await syncOffers(userId);
    const {data,error} = await supabase.from('user_data').select('data_key,data_value').eq('user_id',userId);
    if (error) throw error;
    for (const row of data || []) {
      if (row.data_key !== 'gr_offertes' && DATA_KEYS.includes(row.data_key))
        localStorage.setItem(row.data_key, JSON.stringify(row.data_value));
    }
  });
}
export async function refreshOffers(userId: string): Promise<void> {
  return serial(() => syncOffers(userId));
}
export async function saveUserData(userId: string, key: string, value: unknown): Promise<void> {
  return serial(async () => {
    if (key === 'gr_offertes') { await syncOffers(userId); return; }
    const {error} = await supabase.from('user_data').upsert(
      {user_id:userId,data_key:key,data_value:value,updated_at:new Date().toISOString()},
      {onConflict:'user_id,data_key'});
    if (error) throw error;
  });
}
export async function saveAllUserData(userId: string): Promise<void> {
  for (const key of DATA_KEYS) {
    const value = localValue(key);
    if (value !== null) await saveUserData(userId, key, value);
  }
}
export async function deleteAllUserData(userId: string): Promise<void> {
  const {error} = await supabase.from('user_data').delete().eq('user_id',userId);
  if(error) throw error;
}
