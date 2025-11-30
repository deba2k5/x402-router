const hre = require("hardhat");
const readline = require("readline");

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function question(query) {
    return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
    console.log("=".repeat(70));
    console.log("🧪 PaymentRouter Testnet Integration Test");
    console.log("=".repeat(70));

    // Get network
    const network = hre.network.name;
    console.log("\n📡 Network:", network);
    console.log("Chain ID:", hre.network.config.chainId);

    // Load deployment addresses
    const fs = require("fs");
    const path = require("path");

    const deploymentsFile = path.join(
        __dirname,
        "..",
        "deployments",
        "deployments.json"
    );
    const tokensFile = path.join(
        __dirname,
        "..",
        "deployments",
        "tokens.json"
    );

    if (!fs.existsSync(deploymentsFile) || !fs.existsSync(tokensFile)) {
        console.error("❌ Deployment files not found!");
        console.log("Please deploy contracts first using: npm run deploy:all");
        process.exit(1);
    }

    const deployments = JSON.parse(fs.readFileSync(deploymentsFile, "utf8"));
    const tokens = JSON.parse(fs.readFileSync(tokensFile, "utf8"));

    const deployment = deployments[network];
    const tokenDeployment = tokens[network];

    if (!deployment || !tokenDeployment) {
        console.error(`❌ No deployment found for network: ${network}`);
        process.exit(1);
    }

    console.log("\n📋 Deployed Contracts:");
    console.log("PaymentRouter:", deployment.contractAddress);
    console.log("MockUSDC:", tokenDeployment.tokens.MockUSDC.address);
    console.log("MockDAI:", tokenDeployment.tokens.MockDAI.address);
    console.log("Relayer:", deployment.relayer);

    // Ask for test wallet private key
    console.log("\n" + "=".repeat(70));
    console.log("⚠️  TESTNET WALLET SETUP");
    console.log("=".repeat(70));
    console.log(
        "Please provide a testnet wallet private key for testing."
    );
    console.log("This wallet will:");
    console.log("  1. Receive test tokens (MockUSDC)");
    console.log("  2. Sign a permit for the PaymentRouter");
    console.log("  3. Execute a test payment");
    console.log("\n⚠️  NEVER use a mainnet wallet or wallet with real funds!");

    const testPrivateKey = await question(
        "\nEnter testnet wallet private key (or press Enter to skip): "
    );

    if (!testPrivateKey || testPrivateKey.trim() === "") {
        console.log("\n❌ No private key provided. Exiting...");
        rl.close();
        process.exit(0);
    }

    // Create test wallet
    const testWallet = new hre.ethers.Wallet(
        testPrivateKey.trim(),
        hre.ethers.provider
    );
    console.log("\n✅ Test Wallet Address:", testWallet.address);

    // Check balance
    const balance = await hre.ethers.provider.getBalance(testWallet.address);
    console.log(
        "ETH Balance:",
        hre.ethers.formatEther(balance),
        "ETH"
    );

    if (balance === 0n) {
        console.log(
            "\n⚠️  Warning: Wallet has no ETH for gas. Please fund it from a faucet."
        );
        const proceed = await question("Continue anyway? (y/n): ");
        if (proceed.toLowerCase() !== "y") {
            rl.close();
            process.exit(0);
        }
    }

    // Get contract instances
    const paymentRouter = await hre.ethers.getContractAt(
        "PaymentRouter",
        deployment.contractAddress
    );

    const mockUSDC = await hre.ethers.getContractAt(
        "MockUSDC",
        tokenDeployment.tokens.MockUSDC.address
    );

    const mockDAI = await hre.ethers.getContractAt(
        "MockDAI",
        tokenDeployment.tokens.MockDAI.address
    );

    // Check token balances
    const usdcBalance = await mockUSDC.balanceOf(testWallet.address);
    const daiBalance = await mockDAI.balanceOf(testWallet.address);

    console.log("\n💰 Token Balances:");
    console.log(
        "MockUSDC:",
        hre.ethers.formatUnits(usdcBalance, 6),
        "mUSDC"
    );
    console.log("MockDAI:", hre.ethers.formatEther(daiBalance), "mDAI");

    // Mint tokens if needed
    if (usdcBalance < hre.ethers.parseUnits("100", 6)) {
        console.log("\n💸 Minting 1000 MockUSDC to test wallet...");
        const mintTx = await mockUSDC.mint(
            testWallet.address,
            hre.ethers.parseUnits("1000", 6)
        );
        await mintTx.wait();
        console.log("✅ Minted! TX:", mintTx.hash);
    }

    // Test scenario selection
    console.log("\n" + "=".repeat(70));
    console.log("🎯 TEST SCENARIO SELECTION");
    console.log("=".repeat(70));
    console.log("1. Direct Payment (USDC → Merchant, no swap)");
    console.log("2. Swap Payment (USDC → DAI → Merchant) [Requires DEX]");
    console.log("3. Exit");

    const choice = await question("\nSelect test scenario (1-3): ");

    if (choice === "3") {
        console.log("\n👋 Exiting...");
        rl.close();
        process.exit(0);
    }

    // Merchant address (use deployer for testing)
    const [deployer] = await hre.ethers.getSigners();
    const merchantAddress = deployer.address;

    console.log("\n📦 Test Parameters:");
    console.log("Payer:", testWallet.address);
    console.log("Merchant:", merchantAddress);
    console.log("Amount: 100 USDC");

    if (choice === "1") {
        // Direct payment test
        await testDirectPayment(
            testWallet,
            paymentRouter,
            mockUSDC,
            merchantAddress,
            deployment.relayer
        );
    } else if (choice === "2") {
        console.log(
            "\n⚠️  Swap functionality requires a real DEX router address."
        );
        console.log(
            "For testnet, you would need to integrate with Uniswap or similar."
        );
        console.log("This demo will show the flow but won't execute the swap.");
    } else {
        console.log("\n❌ Invalid choice");
    }

    rl.close();
}

async function testDirectPayment(
    testWallet,
    paymentRouter,
    mockUSDC,
    merchantAddress,
    relayerAddress
) {
    console.log("\n" + "=".repeat(70));
    console.log("🚀 EXECUTING DIRECT PAYMENT TEST");
    console.log("=".repeat(70));

    const amount = hre.ethers.parseUnits("100", 6); // 100 USDC
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    console.log("\n1️⃣  Creating EIP-2612 Permit Signature...");

    // Create permit signature
    const domain = {
        name: await mockUSDC.name(),
        version: "1",
        chainId: (await hre.ethers.provider.getNetwork()).chainId,
        verifyingContract: await mockUSDC.getAddress(),
    };

    const types = {
        Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
        ],
    };

    const value = {
        owner: testWallet.address,
        spender: await paymentRouter.getAddress(),
        value: amount,
        nonce: await mockUSDC.nonces(testWallet.address),
        deadline: deadline,
    };

    const signature = await testWallet.signTypedData(domain, types, value);
    const sig = hre.ethers.Signature.from(signature);

    console.log("✅ Signature created!");
    console.log("   v:", sig.v);
    console.log("   r:", sig.r);
    console.log("   s:", sig.s);

    const permitData = {
        token: await mockUSDC.getAddress(),
        owner: testWallet.address,
        value: amount,
        deadline: deadline,
        v: sig.v,
        r: sig.r,
        s: sig.s,
    };

    const paymentId = hre.ethers.id(`payment-test-${Date.now()}`);
    const routeParams = {
        paymentId: paymentId,
        tokenIn: await mockUSDC.getAddress(),
        tokenOut: hre.ethers.ZeroAddress, // No swap
        amountIn: amount,
        minAmountOut: amount,
        merchant: merchantAddress,
        dexRouter: hre.ethers.ZeroAddress,
        dexCalldata: "0x",
    };

    console.log("\n2️⃣  Executing Payment Route...");
    console.log("   Payment ID:", paymentId);

    // Get relayer signer
    const relayerWallet = new hre.ethers.Wallet(
        process.env.PRIVATE_KEY,
        hre.ethers.provider
    );

    try {
        // Check balances before
        const merchantBalanceBefore = await mockUSDC.balanceOf(merchantAddress);
        const payerBalanceBefore = await mockUSDC.balanceOf(testWallet.address);

        console.log("\n📊 Balances Before:");
        console.log(
            "   Payer:",
            hre.ethers.formatUnits(payerBalanceBefore, 6),
            "USDC"
        );
        console.log(
            "   Merchant:",
            hre.ethers.formatUnits(merchantBalanceBefore, 6),
            "USDC"
        );

        // Execute route
        const tx = await paymentRouter
            .connect(relayerWallet)
            .executeRoute(permitData, routeParams);

        console.log("\n⏳ Transaction submitted!");
        console.log("   TX Hash:", tx.hash);
        console.log("   Waiting for confirmation...");

        const receipt = await tx.wait();

        console.log("\n✅ TRANSACTION CONFIRMED!");
        console.log("   Block:", receipt.blockNumber);
        console.log("   Gas Used:", receipt.gasUsed.toString());
        console.log(
            "   Gas Price:",
            hre.ethers.formatUnits(receipt.gasPrice || 0n, "gwei"),
            "gwei"
        );

        // Check balances after
        const merchantBalanceAfter = await mockUSDC.balanceOf(merchantAddress);
        const payerBalanceAfter = await mockUSDC.balanceOf(testWallet.address);

        console.log("\n📊 Balances After:");
        console.log(
            "   Payer:",
            hre.ethers.formatUnits(payerBalanceAfter, 6),
            "USDC"
        );
        console.log(
            "   Merchant:",
            hre.ethers.formatUnits(merchantBalanceAfter, 6),
            "USDC"
        );

        console.log("\n💸 Transfer Summary:");
        console.log(
            "   Amount Sent:",
            hre.ethers.formatUnits(
                payerBalanceBefore - payerBalanceAfter,
                6
            ),
            "USDC"
        );
        console.log(
            "   Amount Received:",
            hre.ethers.formatUnits(
                merchantBalanceAfter - merchantBalanceBefore,
                6
            ),
            "USDC"
        );

        // Get block explorer URL
        const explorerUrls = {
            baseSepolia: "https://sepolia.basescan.org/tx/",
            sepolia: "https://sepolia.etherscan.io/tx/",
            arbitrumSepolia: "https://sepolia.arbiscan.io/tx/",
            optimismSepolia: "https://sepolia-optimism.etherscan.io/tx/",
        };

        const explorerUrl = explorerUrls[hre.network.name];
        if (explorerUrl) {
            console.log("\n🔍 View on Block Explorer:");
            console.log("   " + explorerUrl + tx.hash);
        }

        console.log("\n" + "=".repeat(70));
        console.log("✅ TEST COMPLETED SUCCESSFULLY!");
        console.log("=".repeat(70));
    } catch (error) {
        console.error("\n❌ Transaction Failed!");
        console.error("Error:", error.message);
        if (error.data) {
            console.error("Data:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
