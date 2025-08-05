-- Create table to log incoming webhooks
CREATE TABLE public.webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  processing_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is admin functionality)
CREATE POLICY "Allow all operations on webhook_logs" 
ON public.webhook_logs 
FOR ALL 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_webhook_logs_source ON public.webhook_logs(source);
CREATE INDEX idx_webhook_logs_event_type ON public.webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_processed ON public.webhook_logs(processed);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at);

-- Create function to update processed_at timestamp
CREATE OR REPLACE FUNCTION public.update_webhook_processed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.processed = true AND OLD.processed = false THEN
    NEW.processed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_webhook_logs_processed_at
BEFORE UPDATE ON public.webhook_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_webhook_processed_at();