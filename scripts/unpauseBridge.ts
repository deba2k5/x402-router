#!/usr/bin/env bash

# SimpleBridge Unpause Script using cast (Foundry)
# Prerequisites: Install Foundry from https://book.getfoundry.sh/
# Usage: bash scripts/unpauseBridge.sh

echo "🔓 SimpleBridge Unpause Script"
echo "=============================="
echo ""

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

PRIVATE_KEY="${EVM_PRIVATE_KEY}"

if [ -z "$PRIVATE_KEY" ] || [ "$PRIVATE_KEY" = "0x" ]; then
  echo "❌ EVM_PRIVATE_KEY not set in .env"
  exit 1
fi

# Define networks
declare -A NETWORKS=(
  [84532]="Base Sepolia|https://sepolia.base.org"
  [11155111]="Ethereum Sepolia|https://rpc.sepolia.org"
  [421614]="Arbitrum Sepolia|https://sepolia-rollup.arbitrum.io/rpc"
  [11155420]="Optimism Sepolia|https://sepolia.optimism.io"
)

declare -A ADDRESSES=(
  [84532]="0x9777F502DdAB647A54A1552673D123bB199B4b5e"
  [11155111]="0x560f65Ca2d08bF995c57726eC83f7de29F5B2C38"
  [421614]="0x9b9a721933038D4c85F3330e8B4f8CFC5a3F31CA"
  [11155420]="0x404A674a52f85789a71D530af705f2f458bc5284"
)

# Check if cast is installed
if ! command -v cast &> /dev/null; then
  echo "⚠️  Foundry cast not found. Installing..."
  curl -L https://foundry.paradigm.xyz | bash
  source ~/.bashrc 2>/dev/null || true
  ~/.foundry/bin/foundryup
fi

# Unpause contracts
for chainId in "${!NETWORKS[@]}"; do
  IFS='|' read -r networkName rpcUrl <<< "${NETWORKS[$chainId]}"
  address="${ADDRESSES[$chainId]}"
  
  echo ""
  echo "📍 $networkName (Chain $chainId)"
  echo "   Address: $address"
  
  # Check if paused
  echo "   Checking pause status..."
  is_paused=$(cast call "$address" "paused()" --rpc-url "$rpcUrl" 2>/dev/null || echo "error")
  
  if [ "$is_paused" = "error" ] || [ -z "$is_paused" ]; then
    echo "   ❌ Error checking pause status"
    continue
  fi
  
  if [ "$is_paused" = "true" ]; then
    echo "   Current status: 🔴 PAUSED"
    echo "   Unpausing..."
    
    # Send unpause transaction
    tx_hash=$(cast send "$address" "unpause()" \
      --private-key "$PRIVATE_KEY" \
      --rpc-url "$rpcUrl" \
      --json 2>/dev/null | grep -o '"transactionHash":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$tx_hash" ]; then
      echo "   ❌ Failed to send unpause transaction"
      continue
    fi
    
    echo "   TX Hash: $tx_hash"
    echo "   Waiting for confirmation..."
    
    # Wait for transaction receipt
    for i in {1..60}; do
      receipt=$(cast receipt "$tx_hash" --rpc-url "$rpcUrl" 2>/dev/null | grep "blockNumber" || true)
      if [ ! -z "$receipt" ]; then
        echo "   ✅ Unpause successful!"
        break
      fi
      if [ $i -eq 60 ]; then
        echo "   ⏱️  Timeout waiting for confirmation (may still succeed)"
      fi
      sleep 1
    done
  else
    echo "   Current status: 🟢 ACTIVE"
    echo "   ℹ️  Already active, no action needed"
  fi
done

echo ""
echo "✅ Unpause script completed"
