-- Add new optional columns to events table for enhanced event features
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS menu_details JSONB DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_rules TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS early_bird_end_date TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2) DEFAULT NULL;

-- Add benefits column to ticket_tiers for enhanced tier features
ALTER TABLE public.ticket_tiers ADD COLUMN IF NOT EXISTS benefits TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.ticket_tiers ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE public.ticket_tiers ADD COLUMN IF NOT EXISTS is_early_bird BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.events.highlights IS 'Array of event highlights with icon and text';
COMMENT ON COLUMN public.events.menu_details IS 'Food and drink menu details as JSON';
COMMENT ON COLUMN public.events.event_rules IS 'Array of event rules and restrictions';
COMMENT ON COLUMN public.events.early_bird_end_date IS 'End date for early bird pricing';
COMMENT ON COLUMN public.events.original_price IS 'Original price before early bird discount';
COMMENT ON COLUMN public.ticket_tiers.benefits IS 'Array of tier benefits/perks';
COMMENT ON COLUMN public.ticket_tiers.original_price IS 'Original price for strikethrough display';
COMMENT ON COLUMN public.ticket_tiers.is_early_bird IS 'Whether this tier has early bird pricing';