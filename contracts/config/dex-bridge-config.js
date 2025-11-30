// Testnet DEX and Bridge Configuration

const UNISWAP_V3_ROUTERS = {
    // Base Sepolia
    84532: {
        swapRouter02: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4",
        universalRouter: "0x050E797f3625EC8785265e1d9BDd4799b97528A1",
    },
    // Ethereum Sepolia
    11155111: {
        swapRouter02: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
        universalRouter: "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
    },
    // Arbitrum Sepolia
    421614: {
        swapRouter02: "0x101F443B4d1b059569D643917553c771E1b9663E",
        universalRouter: "0x4A7b5Da61326A6379179b40d00F57E5bbDC962c2",
    },
    // Optimism Sepolia
    11155420: {
        swapRouter02: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4",
        universalRouter: "0xCb1355ff08Ab38bBCE60111F1bb2B784bE25D7e8",
    },
};

// Mayan Protocol Forwarder (same address on all EVM chains)
const MAYAN_FORWARDER = "0x337685fdaB40D39bd02028545a4FfA7D287cC3E2";

// Uniswap V3 Pool Fees
const POOL_FEES = {
    LOW: 500, // 0.05%
    MEDIUM: 3000, // 0.3%
    HIGH: 10000, // 1%
};

module.exports = {
    UNISWAP_V3_ROUTERS,
    MAYAN_FORWARDER,
    POOL_FEES,
};
