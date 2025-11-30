const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const network = hre.network.name;

    console.log("=".repeat(60));
    console.log("Deploying PaymentRouter to", network);
    console.log("=".repeat(60));
    console.log("Deployer address:", deployer.address);

    // Get deployer balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");

    // Set initial relayer address (can be changed later via setRelayer)
    // For now, using deployer as relayer - CHANGE THIS IN PRODUCTION
    const initialRelayer = process.env.RELAYER_ADDRESS || deployer.address;
    console.log("Initial relayer:", initialRelayer);

    console.log("\nDeploying PaymentRouter contract...");

    // Deploy PaymentRouter
    const PaymentRouter = await hre.ethers.getContractFactory("PaymentRouter");
    const paymentRouter = await PaymentRouter.deploy(initialRelayer);

    await paymentRouter.waitForDeployment();
    const contractAddress = await paymentRouter.getAddress();

    console.log("✅ PaymentRouter deployed to:", contractAddress);

    // Save deployment info
    const deploymentInfo = {
        network: network,
        chainId: hre.network.config.chainId,
        contractAddress: contractAddress,
        deployer: deployer.address,
        relayer: initialRelayer,
        deployedAt: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber(),
    };

    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save deployment info to JSON file
    const deploymentFile = path.join(deploymentsDir, `${network}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("📝 Deployment info saved to:", deploymentFile);

    // Update or create master deployments.json
    const masterFile = path.join(deploymentsDir, "deployments.json");
    let allDeployments = {};

    if (fs.existsSync(masterFile)) {
        allDeployments = JSON.parse(fs.readFileSync(masterFile, "utf8"));
    }

    allDeployments[network] = deploymentInfo;
    fs.writeFileSync(masterFile, JSON.stringify(allDeployments, null, 2));
    console.log("📝 Master deployments file updated");

    console.log("\n" + "=".repeat(60));
    console.log("Deployment Summary");
    console.log("=".repeat(60));
    console.log("Network:", network);
    console.log("Chain ID:", hre.network.config.chainId);
    console.log("Contract Address:", contractAddress);
    console.log("Deployer:", deployer.address);
    console.log("Relayer:", initialRelayer);
    console.log("=".repeat(60));

    // Wait for block confirmations before verification
    if (network !== "hardhat" && network !== "localhost") {
        console.log("\nWaiting for 5 block confirmations...");
        await paymentRouter.deploymentTransaction().wait(5);

        console.log("\n📋 To verify the contract, run:");
        console.log(`npx hardhat verify --network ${network} ${contractAddress} "${initialRelayer}"`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
