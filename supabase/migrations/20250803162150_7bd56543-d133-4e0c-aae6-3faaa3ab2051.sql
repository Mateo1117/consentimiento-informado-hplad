-- Create table for storing professional signatures
CREATE TABLE public.professional_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_name TEXT NOT NULL,
  professional_document TEXT NOT NULL UNIQUE,
  signature_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.professional_signatures ENABLE ROW LEVEL SECURITY;

-- Create policies for professional signatures
CREATE POLICY "Anyone can view professional signatures" 
ON public.professional_signatures 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert professional signatures" 
ON public.professional_signatures 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update professional signatures" 
ON public.professional_signatures 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete professional signatures" 
ON public.professional_signatures 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_professional_signatures_updated_at
BEFORE UPDATE ON public.professional_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();