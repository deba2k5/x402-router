# Relayer Issues Fixed

## Problems Identified

1. **Alchemy Free Tier Block Range Limit**
   - Alchemy free tier only allows `eth_getLogs` with max 10 block range
   - Relayer was using 5000 block chunks → causing errors

2. **completeBridge Revert**
   - `SimpleBridge.sol` has `onlyRelayer` modifier on `completeBridge()`
   - Contract checks `msg.sender == relayer` address
   - Your relayer address may not be set correctly on deployed contracts

## Fixes Applied

### 1. Block Chunk Size Configuration

**File:** `Relayer/relayer.ts`
- Changed default `BLOCK_CHUNK_SIZE` from `5000n` to `10n`
- Made it configurable via `RELAYER_BLOCK_CHUNK_SIZE` env var
- Added better error handling for block range errors

**File:** `Relayer/.env`
- Added `RELAYER_BLOCK_CHUNK_SIZE=10`

### 2. Better Error Diagnostics

**File:** `Relayer/relayer.ts`
- Enhanced `completeBridge` error handling
- Added specific checks for:
  - Insufficient funds
  - Unauthorized relayer (role/access issues)
  - Already completed bridges
- Better error messages with `shortMessage` and `data` fields

### 3. Relayer Checker Script

**File:** `Relayer/check-relayer.ts`
- New script to check if relayer address is correctly set on all bridge contracts
- Can automatically fix it if you're the owner

## How to Fix

### Step 1: Restart Relayer
The block chunk size fix is already in place. Restart the relayer:

```bash
cd Relayer
bun run dev
```

### Step 2: Check Relayer Address
Check if your address is set as the relayer on all bridge contracts:

```bash
cd Relayer
bun run check-relayer.ts
```

This will show:
- Current relayer address on each chain
- Your address
- Whether they match
- Whether you can fix it (if you're the owner)

### Step 3: Set Relayer Address (if needed)
If the check shows mismatches and you're the owner:

```bash
cd Relayer
bun run check-relayer.ts --set
```

This will call `setRelayer()` on each bridge contract that needs it.

## Expected Behavior After Fix

1. **No more block range errors** from Alchemy
2. **completeBridge succeeds** if:
   - Relayer address is correctly set
   - Bridge contract has enough tokens to release
   - Bridge hasn't already been completed

## Troubleshooting

### If completeBridge still fails:

1. **Check relayer address:**
   ```bash
   bun run check-relayer.ts
   ```

2. **Check bridge contract has tokens:**
   - Bridge needs to hold the tokens it will release
   - On Arbitrum Sepolia, the bridge needs USDC balance

3. **Check if bridge was already completed:**
   - Contract tracks `processedBridges[bridgeId]`
   - Can't complete the same bridge twice

4. **Check contract is not paused:**
   - SimpleBridge has `whenNotPaused` modifier
   - Owner can call `unpause()` if needed

## Files Modified

- ✅ `Relayer/relayer.ts` - Block chunk size + error handling
- ✅ `Relayer/.env` - Added `RELAYER_BLOCK_CHUNK_SIZE=10`
- ✅ `Relayer/check-relayer.ts` - New helper script

## Next Steps

1. Run `bun run check-relayer.ts` to verify relayer setup
2. If needed, run `bun run check-relayer.ts --set` to fix
3. Restart relayer with `bun run dev`
4. Test a bridge transfer from facilitator
5. Watch relayer logs for successful `completeBridge` call
