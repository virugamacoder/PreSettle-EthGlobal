const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

// PremarketMarket(initialOwner, platformFeeBps, usdc, eurc). The owner creates
// markets and sets the real token at TGE, so use the Admin page's wallet.
// Override with: --parameters ignition/parameters/arc-testnet.json
module.exports = buildModule("PremarketMarket", (m) => {
  const owner = m.getParameter("owner", "0xfEceA7b046b4DaFACE340c7A2fe924cf41b6d274");
  const platformFeeBps = m.getParameter("platformFeeBps", 50); // 0.5%, max 100
  const usdc = m.getParameter("usdc", "0x3600000000000000000000000000000000000000"); // Arc Testnet USDC (ERC-20, 6 dec)
  const eurc = m.getParameter("eurc", "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a"); // Arc Testnet EURC (6 dec)

  const premarketMarket = m.contract("PremarketMarket", [owner, platformFeeBps, usdc, eurc]);
  return { premarketMarket };
});
