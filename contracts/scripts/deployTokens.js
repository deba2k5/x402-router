const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const network = hre.network.name;

    console.log("=".repeat(60));
    console.log("Deploying Mock Tokens to", network);
    console.log("=".repeat(60));
    console.log("Deployer address:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");

    // Deploy MockUSDC
    console.log("\n📝 Deploying MockUSDC...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    const usdcAddress = await mockUSDC.getAddress();
    console.log("✅ MockUSDC deployed to:", usdcAddress);

    // Wait for confirmations before querying
    console.log("⏳ Waiting for confirmations...");
    await mockUSDC.deploymentTransaction().wait(2);

    // Deploy MockDAI
    console.log("\n📝 Deploying MockDAI...");
    const MockDAI = await hre.ethers.getContractFactory("MockDAI");
    const mockDAI = await MockDAI.deploy();
    await mockDAI.waitForDeployment();
    const daiAddress = await mockDAI.getAddress();
    console.log("✅ MockDAI deployed to:", daiAddress);

    // Wait for confirmations before querying
    console.log("⏳ Waiting for confirmations...");
    await mockDAI.deploymentTransaction().wait(2);

    // Get initial balances
    const usdcBalance = await mockUSDC.balanceOf(deployer.address);
    const daiBalance = await mockDAI.balanceOf(deployer.address);

    console.log("\n💰 Initial Balances:");
    console.log("MockUSDC:", hre.ethers.formatUnits(usdcBalance, 6), "mUSDC");
    console.log("MockDAI:", hre.ethers.formatUnits(daiBalance, 18), "mDAI");

    // Save deployment info
    const deploymentInfo = {
        network: network,
        chainId: hre.network.config.chainId,
        tokens: {
            MockUSDC: {
                address: usdcAddress,
                decimals: 6,
                symbol: "mUSDC",
                name: "Mock USDC"
            },
            MockDAI: {
                address: daiAddress,
                decimals: 18,
                symbol: "mDAI",
                name: "Mock DAI"
            }
        },
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber(),
    };

    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save to network-specific file
    const tokenFile = path.join(deploymentsDir, `${network}-tokens.json`);
    fs.writeFileSync(tokenFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n📝 Token deployment info saved to:", tokenFile);

    // Update master tokens file
    const masterTokenFile = path.join(deploymentsDir, "tokens.json");
    let allTokens = {};

    if (fs.existsSync(masterTokenFile)) {
        allTokens = JSON.parse(fs.readFileSync(masterTokenFile, "utf8"));
    }

    allTokens[network] = deploymentInfo;
    fs.writeFileSync(masterTokenFile, JSON.stringify(allTokens, null, 2));
    console.log("📝 Master tokens file updated");

    console.log("\n" + "=".repeat(60));
    console.log("Token Deployment Summary");
    console.log("=".repeat(60));
    console.log("Network:", network);
    console.log("Chain ID:", hre.network.config.chainId);
    console.log("\nMockUSDC:");
    console.log("  Address:", usdcAddress);
    console.log("  Decimals: 6");
    console.log("  Initial Supply: 1,000,000 mUSDC");
    console.log("\nMockDAI:");
    console.log("  Address:", daiAddress);
    console.log("  Decimals: 18");
    console.log("  Initial Supply: 1,000,000 mDAI");
    console.log("=".repeat(60));

    // Verification instructions
    if (network !== "hardhat" && network !== "localhost") {
        console.log("\n📋 To verify the contracts, run:");
        console.log(`npx hardhat verify --network ${network} ${usdcAddress}`);
        console.log(`npx hardhat verify --network ${network} ${daiAddress}`);
    }

    console.log("\n💡 To mint more tokens for testing:");
    console.log(`MockUSDC: await mockUSDC.mint(address, amount)`);
    console.log(`MockDAI: await mockDAI.mint(address, amount)`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
