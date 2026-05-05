// Auth context — exposes the current Supabase session and helpers to the rest
// of the app. Consume via the useAuth() hook below.

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [memberships, setMemberships] = useState([]);

  // Initial load + auth state listener
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Whenever the session changes, refresh profile + memberships
  const reloadUserScope = useCallback(async () => {
    if (!session?.user) {
      setProfile(null);
      setMemberships([]);
      return;
    }
    const userId = session.user.id;
    const [{ data: prof }, { data: mems }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase
        .from('org_members')
        .select('id, role, joined_at, org:orgs(id, name, slug, trial_ends_at, subscription_status)')
        .eq('user_id', userId),
    ]);
    setProfile(prof || null);
    setMemberships(mems || []);
  }, [session]);

  useEffect(() => { reloadUserScope(); }, [reloadUserScope]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setMemberships([]);
  }, []);

  const value = {
    session,
    user: session?.user || null,
    profile,
    memberships,
    loading,
    isAuthenticated: Boolean(session?.user),
    hasOrg: memberships.length > 0,
    primaryOrg: memberships[0]?.org || null,
    primaryRole: memberships[0]?.role || null,
    signOut,
    reload: reloadUserScope,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
