const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

// Demo "real" token for a premarket at TGE (18 decimals, owner can mint).
module.exports = buildModule("DemoToken", (m) => {
  const xyz = m.contract("TestToken", ["XYZ Token", "XYZ"]);
  return { xyz };
});
