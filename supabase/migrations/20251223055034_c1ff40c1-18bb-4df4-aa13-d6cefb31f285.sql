-- Add payment tracking columns to tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_ref_id TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Create index for payment status queries
CREATE INDEX IF NOT EXISTS idx_tickets_payment_status ON public.tickets(payment_status);

-- Add comment for documentation
COMMENT ON COLUMN public.tickets.payment_status IS 'Payment status: pending, verified, paid, pay_at_venue';
COMMENT ON COLUMN public.tickets.payment_ref_id IS 'UPI Transaction ID or reference for payment verification';
COMMENT ON COLUMN public.tickets.verified_at IS 'Timestamp when payment was verified (for 6-hour download window)';