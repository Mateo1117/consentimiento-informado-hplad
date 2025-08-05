-- Create webhook_logs table
CREATE TABLE public.webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create professional_signatures table
CREATE TABLE public.professional_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_name TEXT NOT NULL,
  professional_document TEXT NOT NULL UNIQUE,
  signature_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security for both tables
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_signatures ENABLE ROW LEVEL SECURITY;

-- Create policies for webhook_logs (admin access only)
CREATE POLICY "Allow all operations for authenticated users" 
ON public.webhook_logs 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create policies for professional_signatures (authenticated access)
CREATE POLICY "Allow all operations for authenticated users" 
ON public.professional_signatures 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_webhook_logs_source ON public.webhook_logs(source);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at);
CREATE INDEX idx_webhook_logs_processed ON public.webhook_logs(processed);
CREATE INDEX idx_professional_signatures_document ON public.professional_signatures(professional_document);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates on professional_signatures
CREATE TRIGGER update_professional_signatures_updated_at
  BEFORE UPDATE ON public.professional_signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();