-- Create table for consent delivery history
CREATE TABLE public.consent_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consent_id UUID NOT NULL REFERENCES public.consents(id) ON DELETE CASCADE,
  delivery_method TEXT NOT NULL, -- 'email', 'sms', 'whatsapp', 'qr', 'link_copied', 'email_client', 'sms_client'
  recipient TEXT, -- email address or phone number
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.consent_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view delivery logs for consents they created
CREATE POLICY "Users can view their consent delivery logs"
ON public.consent_delivery_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.consents c
    WHERE c.id = consent_id AND c.created_by = auth.uid()
  )
);

-- Policy: Users can insert delivery logs for their consents
CREATE POLICY "Users can insert delivery logs for their consents"
ON public.consent_delivery_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.consents c
    WHERE c.id = consent_id AND c.created_by = auth.uid()
  )
);

-- Policy: Admins can view all delivery logs
CREATE POLICY "Admins can view all delivery logs"
ON public.consent_delivery_logs
FOR SELECT
USING (is_admin_role());

-- Create index for faster lookups
CREATE INDEX idx_consent_delivery_logs_consent_id ON public.consent_delivery_logs(consent_id);
CREATE INDEX idx_consent_delivery_logs_created_at ON public.consent_delivery_logs(created_at DESC);