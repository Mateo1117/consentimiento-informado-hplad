-- Remove overly permissive public RLS policies that expose sensitive patient data
DROP POLICY "Allow public access via valid share tokens" ON public.consents;
DROP POLICY "Allow public signing via valid share tokens" ON public.consents;

-- Create restrictive policy that only allows public access through secure RPC functions
-- This ensures data masking and audit logging are always enforced
CREATE POLICY "Deny direct public table access" ON public.consents
  FOR ALL 
  TO anon
  USING (false);

-- Authenticated users can still access their own data directly
-- Public users must use the secure RPC functions which provide data masking
CREATE POLICY "Authenticated users access own consents" ON public.consents
  FOR ALL 
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Update the secure functions to ensure they're the only way to access consent data publicly
-- This ensures all public access goes through proper security checks and data masking