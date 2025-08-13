-- Add user ownership to professional signatures table
ALTER TABLE public.professional_signatures 
ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing records to have a created_by value (set to null for now)
-- Note: Existing signatures will need to be re-created by their respective users

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.professional_signatures;

-- Create secure RLS policies that only allow users to access their own signatures
CREATE POLICY "Users can view their own professional signatures" 
ON public.professional_signatures 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own professional signatures" 
ON public.professional_signatures 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own professional signatures" 
ON public.professional_signatures 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own professional signatures" 
ON public.professional_signatures 
FOR DELETE 
USING (auth.uid() = created_by);