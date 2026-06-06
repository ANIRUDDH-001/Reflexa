import { createClient, Session, User, SupabaseClient } from '@supabase/supabase-js';

// @ts-expect-error import.meta is injected by Vite
const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL ?? '';
// @ts-expect-error import.meta is injected by Vite
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// Lazy-init to avoid crashing in test environments where env vars are absent
let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!_client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      document.body.innerHTML =
        '<div style="color: red; padding: 20px; font-family: sans-serif;"><h1>Configuration Error</h1><p>Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables. Please check your .env file.</p></div>';
      throw new Error('Supabase environment variables are missing.');
    }
    _client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _client;
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await getClient().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await getClient().auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await getClient().auth.getSession();
  return session;
}

export async function getUser(): Promise<User | null> {
  const {
    data: { user },
  } = await getClient().auth.getUser();
  return user;
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const {
    data: { subscription },
  } = getClient().auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}
