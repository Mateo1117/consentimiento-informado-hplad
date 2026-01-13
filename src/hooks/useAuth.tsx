import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AppRole = 'admin' | 'doctor' | 'lab_technician' | 'receptionist' | 'viewer';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
  };

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching roles:', error);
        return [];
      }

      return (data || []).map(r => r.role as AppRole);
    } catch (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      
      // Clean up auth state
      cleanupAuthState();
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.warn('Sign out error:', err);
      }
      
      // Clear local state
      setUser(null);
      setSession(null);
      setRoles([]);
      
      toast.success("Sesión cerrada correctamente");
      
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error("Error al cerrar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        if (!mounted) return;

        // Only synchronous state updates here
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          cleanupAuthState();
          setRoles([]);
        }
        
        // Fetch roles using setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(async () => {
            if (mounted) {
              const userRoles = await fetchUserRoles(session.user.id);
              setRoles(userRoles);
            }
          }, 0);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Fetch roles if user exists
          if (session?.user) {
            const userRoles = await fetchUserRoles(session.user.id);
            setRoles(userRoles);
          }
          
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    isLoading,
    signOut,
    isAuthenticated: !!user,
    roles,
    hasRole,
    isAdmin: roles.includes('admin')
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
