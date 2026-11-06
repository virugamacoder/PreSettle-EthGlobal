require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();
const CONFIG = require("./config");

const defaultKey =
  "0000000000000000000000000000000000000000000000000000000000000000";

module.exports = {
  sourcify: {
    enabled: true
  },
  etherscan: {
    apiKey: CONFIG.SCAN_API_KEY,
    customChains: [
      {
        network: "monad_testnet",
        chainId: 10143,
        urls: {
          apiURL: "https://monadexplorer.com", // Check official Monad docs for exact API endpoint
          browserURL: "https://testnet.monadexplorer.com",
        },
      },
    ],
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
  defaultNetwork: "hardhat",
  networks: {
    sepolia: {
      url: CONFIG.RPC_URL || "",
      accounts: [CONFIG.ACCOUNT_PRIVATE_KEY || defaultKey],
    },
    arc_testnet: {
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
