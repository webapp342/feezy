-- Migration: on-chain wallet age cache
ALTER TABLE wallet_state
  ADD COLUMN IF NOT EXISTS onchain_first_tx_at TIMESTAMPTZ;
