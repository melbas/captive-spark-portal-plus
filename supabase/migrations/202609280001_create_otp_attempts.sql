CREATE TABLE IF NOT EXISTS public.otp_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_attempts_identifier_idx ON public.otp_attempts (identifier);
CREATE INDEX IF NOT EXISTS otp_attempts_ip_address_idx ON public.otp_attempts (ip_address);
CREATE INDEX IF NOT EXISTS otp_attempts_attempted_at_idx ON public.otp_attempts (attempted_at);