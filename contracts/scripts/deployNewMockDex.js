const hre = require("hardhat");

async function main() {
    const network = hre.network.name;
    console.log("Deploying New MockDexRouter on", network);

    // Addresses
    const MOCK_USDC_ADDRESS = "0x2b23c6e36b46cC013158Bc2869D686023FA85422";
    const MOCK_DAI_ADDRESS = "0x6eb198E04d9a6844F74FC099d35b292127656A3F";

    // 1. Deploy MockDexRouter
    const MockDexRouter = await hre.ethers.getContractFactory("MockDexRouter");
    const mockDex = await MockDexRouter.deploy();
    await mockDex.waitForDeployment();
    const dexAddress = await mockDex.getAddress();
    console.log("✅ MockDexRouter deployed to:", dexAddress);

    // 2. Set Swap Rate
    const amountOut = 1000000n; // 1 USDC
    console.log(`Setting rate for DAI -> USDC to ${amountOut} (1 USDC)...`);
    const tx = await mockDex.setSwapRate(MOCK_DAI_ADDRESS, MOCK_USDC_ADDRESS, amountOut);
    await tx.wait();
    console.log("✅ Rate Set!");

    // 3. Fund with USDC
    console.log("Funding with USDC...");
    const mockUSDC = await hre.ethers.getContractAt("MockUSDC", MOCK_USDC_ADDRESS);
    const fundTx = await mockUSDC.mint(dexAddress, hre.ethers.parseUnits("1000", 6));
    await fundTx.wait();
    console.log("✅ Funded with 1000 USDC!");

    // Verify
    const rate = await mockDex.swapRates(MOCK_DAI_ADDRESS, MOCK_USDC_ADDRESS);
    console.log("Current Rate:", rate.toString());

    const balance = await mockUSDC.balanceOf(dexAddress);
    console.log("Balance:", hre.ethers.formatUnits(balance, 6));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
