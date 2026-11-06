const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

// OTCMarket(initialOwner, platformFeeBps). The owner receives platform fees.
// Override with: --parameters ignition/parameters/arc-testnet.json
module.exports = buildModule("OTCMarket", (m) => {
  const owner = m.getParameter("owner", "0xfEceA7b046b4DaFACE340c7A2fe924cf41b6d274");
  const platformFeeBps = m.getParameter("platformFeeBps", 50); // 0.5%, max 100

  const otcMarket = m.contract("OTCMarket", [owner, platformFeeBps]);
  return { otcMarket };
});
