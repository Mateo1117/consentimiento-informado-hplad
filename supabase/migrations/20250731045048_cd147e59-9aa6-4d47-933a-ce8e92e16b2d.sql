-- Drop existing policy and create a more permissive one for admin access
DROP POLICY IF EXISTS "Allow all operations on webhook_logs" ON public.webhook_logs;

-- Create new policy that allows authenticated users (admins) to see all webhook logs
CREATE POLICY "Authenticated users can view webhook_logs" 
ON public.webhook_logs 
FOR SELECT 
TO authenticated
USING (true);

-- Allow authenticated users to delete webhook logs (for cleanup)
CREATE POLICY "Authenticated users can delete webhook_logs" 
ON public.webhook_logs 
FOR DELETE 
TO authenticated
USING (true);

-- Allow the service role to insert webhook logs (for the edge function)
CREATE POLICY "Service role can insert webhook_logs" 
ON public.webhook_logs 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Allow the service role to update webhook logs (for processing status)
CREATE POLICY "Service role can update webhook_logs" 
ON public.webhook_logs 
FOR UPDATE 
TO service_role
USING (true);