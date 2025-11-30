# 🧪 Testnet Integration Testing Guide

## 🚀 Quick Start

Test your deployed PaymentRouter contract on real testnets with actual transactions!

### Run Testnet Integration Test

```bash
# Test on Base Sepolia
npm run test:testnet:base

# Test on Ethereum Sepolia
npm run test:testnet:sepolia

# Test on Arbitrum Sepolia
npm run test:testnet:arbitrum

# Test on Optimism Sepolia
npm run test:testnet:optimism
```

---

## 📋 What the Test Does

The integration script will:

1. ✅ Load your deployed contract addresses
2. ✅ Ask for a testnet wallet private key
3. ✅ Check wallet balances (ETH and tokens)
4. ✅ Mint test tokens if needed
5. ✅ Create an EIP-2612 permit signature
6. ✅ Execute a real payment transaction
7. ✅ Show transaction hash and block explorer link
8. ✅ Verify balances before/after

---

## 🔑 Wallet Setup

### Option 1: Create a New Testnet Wallet

```bash
# Generate a new wallet (Node.js)
node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
```

### Option 2: Use Existing Testnet Wallet

- Export private key from MetaMask (testnet account only!)
- **⚠️ NEVER use a mainnet wallet or wallet with real funds!**

### Fund Your Wallet

Get testnet ETH from faucets:
- **Base Sepolia**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- **Ethereum Sepolia**: https://sepoliafaucet.com/
- **Arbitrum Sepolia**: https://faucet.quicknode.com/arbitrum/sepolia
- **Optimism Sepolia**: https://app.optimism.io/faucet

---

## 📝 Step-by-Step Example

### 1. Run the Test Script

```bash
npm run test:testnet:base
```

### 2. Provide Testnet Wallet

When prompted:
```
Enter testnet wallet private key (or press Enter to skip): 
```

Paste your testnet wallet private key (starts with `0x...`)

### 3. Select Test Scenario

```
1. Direct Payment (USDC → Merchant, no swap)
2. Swap Payment (USDC → DAI → Merchant) [Requires DEX]
3. Exit

Select test scenario (1-3): 
```

Choose `1` for direct payment test.

### 4. View Results

The script will:
- Show balances before/after
- Display transaction hash
- Provide block explorer link
- Confirm successful payment

---

## 📊 Expected Output

```
==================================================================
🧪 PaymentRouter Testnet Integration Test
==================================================================

📡 Network: baseSepolia
Chain ID: 84532

📋 Deployed Contracts:
PaymentRouter: 0x12B57C8615aD34469e1388F1CEb700F8f416BC80
MockUSDC: 0x2b23c6e36b46cC013158Bc2869D686023FA85422
MockDAI: 0x6eb198E04d9a6844F74FC099d35b292127656A3F
Relayer: 0x95Cf028D5e86863570E300CAD14484Dc2068eB79

✅ Test Wallet Address: 0x...
ETH Balance: 0.05 ETH

💰 Token Balances:
MockUSDC: 1000.0 mUSDC
MockDAI: 0.0 mDAI

==================================================================
🚀 EXECUTING DIRECT PAYMENT TEST
==================================================================

1️⃣  Creating EIP-2612 Permit Signature...
✅ Signature created!
   v: 27
   r: 0x...
   s: 0x...

2️⃣  Executing Payment Route...
   Payment ID: 0x...

📊 Balances Before:
   Payer: 1000.0 USDC
   Merchant: 0.0 USDC

⏳ Transaction submitted!
   TX Hash: 0xabc123...
   Waiting for confirmation...

✅ TRANSACTION CONFIRMED!
   Block: 34372800
   Gas Used: 125000
   Gas Price: 0.5 gwei

📊 Balances After:
   Payer: 900.0 USDC
   Merchant: 100.0 USDC

💸 Transfer Summary:
   Amount Sent: 100.0 USDC
   Amount Received: 100.0 USDC

🔍 View on Block Explorer:
   https://sepolia.basescan.org/tx/0xabc123...

==================================================================
✅ TEST COMPLETED SUCCESSFULLY!
==================================================================
```

---

## 🎯 Test Scenarios

### Scenario 1: Direct Payment ✅

**What it tests:**
- EIP-2612 permit signature
- Token transfer via PaymentRouter
- Relayer execution
- Event emission

**Flow:**
1. Payer signs permit for 100 USDC
2. Relayer calls `executeRoute()`
3. PaymentRouter pulls USDC from payer
4. PaymentRouter sends USDC to merchant

**Expected Result:**
- Payer loses 100 USDC
- Merchant gains 100 USDC
- Transaction hash visible on block explorer

---

### Scenario 2: Swap Payment (Future)

**What it tests:**
- Token swap via DEX
- Slippage protection
- Multi-step transaction

**Requirements:**
- Real DEX router address (Uniswap, etc.)
- Liquidity in DEX pools
- Proper calldata encoding

**Status:** 🚧 Requires DEX integration

---

## 🔍 Verifying Transactions

### On Block Explorer

After the test completes, visit the block explorer link to see:

1. **Transaction Details**
   - From: Relayer address
   - To: PaymentRouter contract
   - Status: Success ✅

2. **Token Transfers**
   - USDC transfer from Payer → PaymentRouter
   - USDC transfer from PaymentRouter → Merchant

3. **Events Emitted**
   - `RouteExecuted` event with payment details

4. **Gas Usage**
   - Total gas used
   - Gas price in gwei

---

## ⚠️ Troubleshooting

### "Insufficient funds for gas"
- **Solution**: Fund your testnet wallet with ETH from faucets

### "Invalid permit signature"
- **Solution**: Make sure you're using the correct wallet that owns the tokens

### "UnauthorizedRelayer"
- **Solution**: The script uses the deployer as relayer (from .env file)

### "PaymentAlreadyProcessed"
- **Solution**: Each payment has a unique ID. Run the script again for a new payment.

---

## 📈 Next Steps After Testing

Once you've successfully tested on testnet:

1. ✅ **Verify the transaction** on block explorer
2. ✅ **Test with different amounts** and scenarios
3. ✅ **Integrate with real DEX** for swap functionality
4. ✅ **Add Mayan bridge** for cross-chain payments
5. ✅ **Build frontend UI** to interact with contracts
6. ✅ **Deploy to mainnet** (after thorough testing!)

---

## 🎉 Success Criteria

Your test is successful if:

- ✅ Transaction confirms on testnet
- ✅ Merchant receives correct amount
- ✅ Payer balance decreases correctly
- ✅ Transaction visible on block explorer
- ✅ No errors in console output

---

## 📚 Additional Resources

- [Base Sepolia Explorer](https://sepolia.basescan.org/)
- [Ethereum Sepolia Explorer](https://sepolia.etherscan.io/)
- [Arbitrum Sepolia Explorer](https://sepolia.arbiscan.io/)
- [Optimism Sepolia Explorer](https://sepolia-optimism.etherscan.io/)

---

**Ready to test? Run:**
```bash
npm run test:testnet:base
```

And provide your testnet wallet private key when prompted! 🚀
