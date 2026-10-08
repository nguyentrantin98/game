export interface Profile {
  id: string;
  name: string;
  level: number;
  exp: number;
  expToNext: number;
  gold: number;
  gems: number;
  elo: number;
  wins: number;
  losses: number;
  checkInDay: number;
  lastCheckIn: string | null;
  mails: { id: string; title: string; body: string; gold: number; read: boolean; claimed: boolean }[];
  redDots: Record<string, boolean>;
}

const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

let token: string | null = store.get('army3d.token');

export function getToken() {
  return token;
}

export function deviceId(): string {
  let id = store.get('army3d.device');
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    store.set('army3d.device', id);
  }
  return id;
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json() as Promise<T>;
}

export const api = {
  async guest(): Promise<Profile> {
    const res = await req<{ token: string; user: Profile }>('/auth/guest', {
      method: 'POST',
      body: JSON.stringify({ deviceId: deviceId() }),
    });
    token = res.token;
    store.set('army3d.token', token);
    return res.user;
  },
  me: () => req<Profile>('/me'),
  checkinInfo: () => req<{ day: number; canCheckIn: boolean; rewards: number[] }>('/checkin'),
  checkin: () => req<{ ok: boolean; reward: number; user: Profile }>('/checkin', { method: 'POST' }),
  claimMail: (id: string) => req<Profile>(`/mails/${id}/claim`, { method: 'POST', body: '{}' }),
  rank: () => req<{ rank: number; name: string; elo: number; level: number; wins: number }[]>('/rank'),
};

export const storage = store;
