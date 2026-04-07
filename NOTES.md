# Project Notes

## Performance: Production feels slow on Vercel

**Reported:** 2026-04-07
**Status:** Diagnosed, fix deferred

### What's confirmed
- Vercel functions deploy to **iad1** (Washington DC, US East)
- Supabase compute tier: **Nano** (free tier — shared CPU, 0.5 GB RAM)
  - Memory sits at ~40% on idle, so it's already constrained
- Supabase region: **unknown** — need to check at https://supabase.com/dashboard (project list page or Compute and Disk page)

### Likely root causes (ranked by impact)

1. **Nano compute tier.** Shared CPU + 0.5 GB RAM means every query competes for limited resources. Upgrading to Pro ($25/mo) gets a Micro instance with dedicated CPU and 1 GB RAM.
2. **Region mismatch (if Supabase ≠ us-east-1).** Each cross-region round-trip adds 80–250 ms. Pages that do many sequential Supabase queries multiply the pain.
3. **Sequential `await supabase...` waterfalls** in server components. Wrapping in `Promise.all` parallelizes them.
4. **Cold starts** on first request — mostly handled by Fluid Compute already.

### Fix plan (when we revisit)

1. Confirm Supabase region. If not us-east-1, either:
   - Recreate the Supabase project in us-east-1 (clean slate is easy since we're going to reseed for Common Core anyway in Phase 6), OR
   - Pin Vercel functions to match Supabase region via `vercel.ts` (`regions: ["..."]`)
2. Decide on Pro tier upgrade ($25/mo) — biggest single performance improvement.
3. Audit `src/app/**/page.tsx` server components for sequential Supabase calls and parallelize with `Promise.all`.
4. Re-measure Lighthouse / Core Web Vitals before and after.
