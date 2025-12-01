const hre = require("hardhat");

async function main() {
    const network = hre.network.name;
    console.log("Setting Swap Rate on", network);

    if (network !== "baseSepolia") {
        console.log("Skipping on non-Base network");
        return;
    }

    // Addresses
    const MOCK_DEX_ADDRESS = "0x3351F07aF05108C102b3a8a24b61B26737c14D4a";
    const MOCK_USDC_ADDRESS = "0x2b23c6e36b46cC013158Bc2869D686023FA85422";
    const MOCK_DAI_ADDRESS = "0x6eb198E04d9a6844F74FC099d35b292127656A3F";

    const mockDex = await hre.ethers.getContractAt("MockDexRouter", MOCK_DEX_ADDRESS);

    // Set Rate: DAI -> USDC = 1 USDC (1000000)
    // Note: The mock returns this fixed amount regardless of input amount
    const amountOut = 1000000n; // 1 USDC

    console.log(`Setting rate for DAI -> USDC to ${amountOut} (1 USDC)...`);
    const tx = await mockDex.setSwapRate(MOCK_DAI_ADDRESS, MOCK_USDC_ADDRESS, amountOut);
    await tx.wait();
    console.log("✅ Rate Set!");

    // Verify
    const rate = await mockDex.swapRates(MOCK_DAI_ADDRESS, MOCK_USDC_ADDRESS);
    console.log("Current Rate:", rate.toString());
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
