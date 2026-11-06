// While testing/deploying on different networks it will be easy. 
// Just change the NETWORK variable in .env file and the configuration will be picked up from the respective file.
require("dotenv").config({ path: __dirname + "/./../.env" });

const SEPOLIA_CONFIG = require("./sepolia.config");
const ARC_TESTNET_CONFIG = require("./arc-testnet.config");
const ARC_MAINNET_CONFIG = require("./arc-mainnet.config");

let EXPORT_CONFIG;

if(process.env.NETWORK == "sepolia"){
    EXPORT_CONFIG = SEPOLIA_CONFIG;
}
else if(process.env.NETWORK == "arc_testnet"){
    EXPORT_CONFIG = ARC_TESTNET_CONFIG;
}
else if(process.env.NETWORK == "arc_mainnet"){
    EXPORT_CONFIG = ARC_MAINNET_CONFIG;
}
else{
    EXPORT_CONFIG = {
        "ACCOUNT_PRIVATE_KEY":process.env.ACCOUNT_PRIVATE_KEY,
        "OPTIMIZER_RUNS":process.env.OPTIMIZER_RUNS,
        "OPTIMIZER_FLAG":process.env.OPTIMIZER_FLAG
    };
}

module.exports = EXPORT_CONFIG;