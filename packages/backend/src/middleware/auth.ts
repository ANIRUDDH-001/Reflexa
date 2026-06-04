import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request } from 'express';

// Lazy initialization — avoids crash at module load if env vars not yet set
let _supabase: SupabaseClient | null = null;
function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for auth');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

/**
 * Extract user ID from request.
 * Priority: Authorization Bearer JWT > X-User-Id header (dev fallback)
 */
export async function extractAuthenticatedUser(
  req: Request,
): Promise<{ id: string; email?: string; name?: string } | null> {
  // Try JWT first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const {
      data: { user },
      error,
    } = await getSupabaseClient().auth.getUser(token);
    if (!error && user) {
      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
      };
    }
  }

  // Fallback to X-User-Id header (for development/testing ONLY)
  if (process.env.NODE_ENV !== 'production') {
    const headerUserId = req.headers['x-user-id'] as string | undefined;
    if (headerUserId) {
      return { id: headerUserId };
    }
  }

  return null;
}
