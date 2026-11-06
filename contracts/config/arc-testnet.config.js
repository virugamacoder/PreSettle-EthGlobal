require("dotenv").config({ path: __dirname + "/./../.env" });
module.exports = {
    "RPC_URL":process.env.ARC_TESTNET_RPC_URL,
    "NETWORK":process.env.NETWORK,
    "SCAN_API_KEY":process.env.ARC_TESTNET_API_KEY,
    "ACCOUNT_PRIVATE_KEY":process.env.ARC_TESTNET_ACCOUNT_PRIVATE_KEY,
    "OPTIMIZER_RUNS":process.env.ARC_TESTNET_OPTIMIZER_RUNS,
    "OPTIMIZER_FLAG":process.env.ARC_TESTNET_OPTIMIZER_FLAG,
}