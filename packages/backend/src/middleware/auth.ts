import { createClient } from '@supabase/supabase-js';
import { Request } from 'express';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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
    } = await supabase.auth.getUser(token);
    if (!error && user) {
      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
      };
    }
  }

  // Fallback to X-User-Id header (for development/testing)
  const headerUserId = req.headers['x-user-id'] as string | undefined;
  if (headerUserId) {
    return { id: headerUserId };
  }

  return null;
}
