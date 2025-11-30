const hre = require("hardhat");
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function question(query) {
    return new Promise((resolve) => rl.question(query, resolve));
}

// MockDexRouter ABI
const MOCK_DEX_ABI = [
    "function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut)",
    "function setSwapRate(address tokenIn, address tokenOut, uint256 amountOut) external",
];

// MockDexRouter Address (Base Sepolia)
const MOCK_DEX_ADDRESS = "0x3351F07aF05108C102b3a8a24b61B26737c14D4a";

async function main() {
    console.log("=".repeat(70));
    console.log("🔄 PaymentRouter + MockDexRouter Swap Test");
    console.log("=".repeat(70));

    const network = hre.network.name;
    console.log("\n📡 Network:", network);

    if (network !== "baseSepolia") {
        console.log("\n⚠️  This test is configured for Base Sepolia only.");
        process.exit(1);
    }

    // Load deployment addresses
    const fs = require("fs");
    const path = require("path");

    const deploymentsFile = path.join(__dirname, "..", "deployments", "deployments.json");
    const tokensFile = path.join(__dirname, "..", "deployments", "tokens.json");

    const deployments = JSON.parse(fs.readFileSync(deploymentsFile, "utf8"));
    const tokens = JSON.parse(fs.readFileSync(tokensFile, "utf8"));

    const deployment = deployments[network];
    const tokenDeployment = tokens[network];

    console.log("\n📋 Contract Addresses:");
    console.log("PaymentRouter:", deployment.contractAddress);
    console.log("MockUSDC:", tokenDeployment.tokens.MockUSDC.address);
    console.log("MockDAI:", tokenDeployment.tokens.MockDAI.address);
    console.log("MockDexRouter:", MOCK_DEX_ADDRESS);

    // Get test wallet
    console.log("\n" + "=".repeat(70));
    console.log("⚠️  TESTNET WALLET SETUP");
    console.log("=".repeat(70));
    console.log("Please provide a testnet wallet private key.");

    const testPrivateKey = await question("\nEnter testnet wallet private key: ");

    if (!testPrivateKey || testPrivateKey.trim() === "") {
        console.log("\n❌ No private key provided. Exiting...");
        rl.close();
        process.exit(0);
    }

    const testWallet = new hre.ethers.Wallet(testPrivateKey.trim(), hre.ethers.provider);
    console.log("\n✅ Test Wallet:", testWallet.address);

    // Get contract instances
    const paymentRouter = await hre.ethers.getContractAt("PaymentRouter", deployment.contractAddress);
    const mockUSDC = await hre.ethers.getContractAt("MockUSDC", tokenDeployment.tokens.MockUSDC.address);
    const mockDAI = await hre.ethers.getContractAt("MockDAI", tokenDeployment.tokens.MockDAI.address);
    const mockDexRouter = new hre.ethers.Contract(MOCK_DEX_ADDRESS, MOCK_DEX_ABI, testWallet);

    // Check balances
    const usdcBalance = await mockUSDC.balanceOf(testWallet.address);
    const daiBalance = await mockDAI.balanceOf(testWallet.address);

    console.log("\n💰 Token Balances:");
    console.log("MockUSDC:", hre.ethers.formatUnits(usdcBalance, 6), "mUSDC");
    console.log("MockDAI:", hre.ethers.formatEther(daiBalance), "mDAI");

    // Mint USDC if needed
    if (usdcBalance < hre.ethers.parseUnits("100", 6)) {
        console.log("\n💸 Minting 1000 MockUSDC...");
        const mintTx = await mockUSDC.mint(testWallet.address, hre.ethers.parseUnits("1000", 6));
        await mintTx.wait();
        console.log("✅ Minted!");
    }

    // Mint DAI to MockDexRouter (simulate liquidity)
    console.log("\n💧 Funding MockDexRouter with DAI...");
    const liquidityTx = await mockDAI.mint(MOCK_DEX_ADDRESS, hre.ethers.parseEther("1000"));
    await liquidityTx.wait();
    console.log("✅ MockDexRouter funded!");

    console.log("\n" + "=".repeat(70));
    console.log("🚀 EXECUTING SWAP TEST: USDC → DAI");
    console.log("=".repeat(70));

    const amountIn = hre.ethers.parseUnits("100", 6); // 100 USDC
    const expectedAmountOut = hre.ethers.parseEther("99"); // 99 DAI
    const minAmountOut = hre.ethers.parseEther("95"); // 95 DAI
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // Configure swap rate on MockDexRouter
    console.log("\n⚙️  Configuring swap rate on MockDexRouter...");
    const rateTx = await mockDexRouter.setSwapRate(
        await mockUSDC.getAddress(),
        await mockDAI.getAddress(),
        expectedAmountOut
    );
    await rateTx.wait();
    console.log("✅ Swap rate set: 100 USDC -> 99 DAI");

    // Create swap calldata
    console.log("\n1️⃣  Encoding swap calldata...");
    const swapCalldata = mockDexRouter.interface.encodeFunctionData("swap", [
        await mockUSDC.getAddress(),
        await mockDAI.getAddress(),
        amountIn,
        minAmountOut
    ]);
    console.log("✅ Swap calldata encoded!");

    // Create permit signature
    console.log("\n2️⃣  Creating EIP-2612 permit signature...");

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
        value: amountIn,
        nonce: await mockUSDC.nonces(testWallet.address),
        deadline: deadline,
    };

    const signature = await testWallet.signTypedData(domain, types, value);
    const sig = hre.ethers.Signature.from(signature);
    console.log("✅ Signature created!");

    const permitData = {
        token: await mockUSDC.getAddress(),
        owner: testWallet.address,
        value: amountIn,
        deadline: deadline,
        v: sig.v,
        r: sig.r,
        s: sig.s,
    };

    // Get merchant address (deployer for testing)
    const [deployer] = await hre.ethers.getSigners();
    const merchantAddress = deployer.address;

    const paymentId = hre.ethers.id(`swap-test-${Date.now()}`);
    const routeParams = {
        paymentId: paymentId,
        tokenIn: await mockUSDC.getAddress(),
        tokenOut: await mockDAI.getAddress(),
        amountIn: amountIn,
        minAmountOut: minAmountOut,
        merchant: merchantAddress,
        dexRouter: MOCK_DEX_ADDRESS,
        dexCalldata: swapCalldata,
    };

    console.log("\n3️⃣  Executing swap via PaymentRouter...");

    try {
        const relayerWallet = new hre.ethers.Wallet(process.env.PRIVATE_KEY, hre.ethers.provider);

        const tx = await paymentRouter.connect(relayerWallet).executeRoute(permitData, routeParams);

        console.log("\n⏳ Transaction submitted!");
        console.log("TX Hash:", tx.hash);
        console.log("Waiting for confirmation...");

        const receipt = await tx.wait();

        console.log("\n✅ TRANSACTION CONFIRMED!");
        console.log("Block:", receipt.blockNumber);
        console.log("Gas Used:", receipt.gasUsed.toString());

        console.log("\n🔍 View on BaseScan:");
        console.log("https://sepolia.basescan.org/tx/" + tx.hash);

        console.log("\n" + "=".repeat(70));
        console.log("✅ SWAP TEST COMPLETED SUCCESSFULLY!");
        console.log("=".repeat(70));
    } catch (error) {
        console.error("\n❌ Transaction Failed!");
        console.error("Error:", error.message);
        if (error.data) {
            console.error("Data:", error.data);
        }
    }

    rl.close();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
