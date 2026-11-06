require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();
require("hardhat-abi-exporter");
const CONFIG = require("./config");

const defaultKey =
  "0000000000000000000000000000000000000000000000000000000000000000";

module.exports = {
  sourcify: {
    enabled: true
  },
  etherscan: {
    apiKey: CONFIG.SCAN_API_KEY,
    customChains: [],
  },
  gasReporter: {
    enabled: false,
  },
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    ],
  },
  // On every compile, copy the ABIs the app uses into the frontend and backend.
  abiExporter: [
    { path: "../frontend/src/contracts/abi", only: [":OTCMarket$", ":PremarketMarket$"], flat: true, clear: true, runOnCompile: true },
    { path: "../backend/src/contracts/abi", only: [":OTCMarket$"], flat: true, clear: true, runOnCompile: true },
  ],
  defaultNetwork: "hardhat",
  networks: {
    sepolia: {
      url: CONFIG.RPC_URL || "",
      accounts: [CONFIG.ACCOUNT_PRIVATE_KEY || defaultKey],
    },
    arc_testnet: {
      chainId: 5042002,
      url: CONFIG.RPC_URL || "",
      accounts: [CONFIG.ACCOUNT_PRIVATE_KEY || defaultKey],
    },
    arc_mainnet: {
      url: CONFIG.RPC_URL || "",
      accounts: [CONFIG.ACCOUNT_PRIVATE_KEY || defaultKey],
    },
    hardhat: {
      chainId: 1337,
    },
  },
};
