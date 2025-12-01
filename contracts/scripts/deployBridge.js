const hre = require("hardhat");

async function main() {
  console.log("🌉 Deploying SimpleBridge...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`📍 Deploying from: ${deployer.address}`);

  // Relayer address (same across all networks)
  const RELAYER = "0x95Cf028D5e86863570E300CAD14484Dc2068eB79";
  console.log(`🔐 Relayer address: ${RELAYER}\n`);

  // Get contract factory
  const SimpleBridge = await hre.ethers.getContractFactory("SimpleBridge");

  // Deploy SimpleBridge
  console.log("⏳ Deploying SimpleBridge contract...");
  const bridge = await SimpleBridge.deploy(RELAYER);
  await bridge.waitForDeployment();

  console.log(`✅ SimpleBridge deployed successfully!`);
  const bridgeAddress = await bridge.getAddress();
  console.log(`📄 Contract Address: ${bridgeAddress}`);
  console.log(`🔗 Network: ${hre.network.name}`);
  console.log(`🔑 Chain ID: ${(await hre.ethers.provider.getNetwork()).chainId}`);

  // Log deployment info for reference
  const deploymentInfo = {
    network: hre.network.name,
    address: bridgeAddress,
    relayer: RELAYER,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  console.log("\n📋 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Verify relayer is set correctly
  const relayerAddress = await bridge.relayer();
  if (relayerAddress.toLowerCase() === RELAYER.toLowerCase()) {
    console.log("\n✅ Relayer set correctly");
  } else {
    console.log("\n⚠️  Relayer mismatch! Expected:", RELAYER, "Got:", relayerAddress);
  }

  console.log("\n🎉 Deployment complete!");
  console.log("\n📝 Update Facilator/index.ts with:");
  console.log(`   BRIDGE_ADDRESSES[${(await hre.ethers.provider.getNetwork()).chainId}] = '${bridgeAddress}';`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
