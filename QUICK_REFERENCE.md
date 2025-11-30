# Quick Reference: X402 Payment Router Addresses

## 🎯 PaymentRouter Contracts (Use as Spender in Permits)

```
Base Sepolia (84532)
0x12B57C8615aD34469e1388F1CEb700F8f416BC80

Ethereum Sepolia (11155111)
0xAf83302a062bDEfC42e12d09E7Dd3e4374998F70

Arbitrum Sepolia (421614)
0xC49568398F909aF8D40Cf27B26780e1B5Ca5996F

Optimism Sepolia (11155420)
0xeeC4119F3B69A61744073BdaEd83421F4b29961E
```

## 💰 Relayer Address (Payment Recipient - Same for All Networks)

```
0x95Cf028D5e86863570E300CAD14484Dc2068eB79
```

## 🪙 Mock USDC Token Addresses

```
Base Sepolia
0x2b23c6e36b46cC013158Bc2869D686023FA85422

Ethereum Sepolia
0xc505D038fe2901fe624E6450887373BaA29e455F

Arbitrum Sepolia
0x7b926C6038a23c3E26F7f36DcBec7606BAF44434

Optimism Sepolia
0x281Ae468d00040BCbB4685972F51f87d473420F7
```

## 🪙 Mock DAI Token Addresses

```
Base Sepolia
0x6eb198E04d9a6844F74FC099d35b292127656A3F

Ethereum Sepolia
0x1c7A8CA39057C856c512f45eBAADfBc276D6ad77

Arbitrum Sepolia
0xeeC4119F3B69A61744073BdaEd83421F4b29961E

Optimism Sepolia
0x7b926C6038a23c3E26F7f36DcBec7606BAF44434
```

## 📋 Payment Configuration

| Service | Price | PaymentRouter | Relayer |
|---------|-------|---|---|
| Image Generation | 1 USDC | Network-specific | 0x95Cf...eB79 |
| Location Suggestions | 0.5 USDC | Network-specific | 0x95Cf...eB79 |

## ✅ Key Points

1. **Permit Spender**: Use PaymentRouter address (changes per network)
2. **Payment Recipient**: Always use Relayer address (same for all networks)
3. **Token Validation**: Use correct token address per network
4. **Checksum**: All addresses are EIP-55 valid
5. **Environment**: Set `MERCHANT_ADDRESS=0x95Cf028D5e86863570E300CAD14484Dc2068eB79` in backend .env

## 🚫 What Was Wrong

- Used invalid address: `0x742d35Cc6634C0532925a3b844Bc9e7595f0Ab0b` ❌
- Had incorrect checksum ❌
- Was hardcoded instead of network-specific ❌
- Viem validation rejected it ❌

## ✨ What's Fixed

- Using correct PaymentRouter addresses per network ✅
- All checksums validated and valid ✅
- Dynamic network switching supported ✅
- Matches deployed contract addresses ✅
- Viem validation passes ✅
