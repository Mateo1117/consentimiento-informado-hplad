-- Add photo fields to consents table if they don't exist
DO $$ 
BEGIN
    -- Add patient photo URL if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='consents' AND column_name='patient_photo_url') THEN
        ALTER TABLE public.consents ADD COLUMN patient_photo_url TEXT;
    END IF;
    
    -- Add professional photo URL if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='consents' AND column_name='professional_photo_url') THEN
        ALTER TABLE public.consents ADD COLUMN professional_photo_url TEXT;
    END IF;
    
    -- Add professional signature data if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='consents' AND column_name='professional_signature_data') THEN
        ALTER TABLE public.consents ADD COLUMN professional_signature_data TEXT;
    END IF;
    
    -- Add professional name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='consents' AND column_name='professional_name') THEN
        ALTER TABLE public.consents ADD COLUMN professional_name TEXT;
    END IF;
    
    -- Add professional document if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='consents' AND column_name='professional_document') THEN
        ALTER TABLE public.consents ADD COLUMN professional_document TEXT;
    END IF;
END $$;