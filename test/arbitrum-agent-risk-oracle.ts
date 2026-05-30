import { expect } from "chai";
import { ethers } from "hardhat";

describe("ArbitrumAgentRiskOracle", () => {
  it("stores owner-provided demo fulfillment for operator walkthroughs", async () => {
    const [owner, requester] = await ethers.getSigners();
    const platform = await ethers.deployContract("MockArbitrumAgentPlatform");
    const oracle = await ethers.deployContract("ArbitrumAgentRiskOracle", [await platform.getAddress(), 7]);
    const orderId = ethers.id("order-1");

    await expect(oracle.ownerFulfillForDemo(999, 82, "APPROVE", "ipfs://risk-evidence"))
      .to.be.revertedWith("request missing");

    await oracle.connect(requester).requestRisk(orderId, "Score this order", { value: ethers.parseEther("0.24") });
    const resultRequestId = await oracle.queryFilter(oracle.filters.RiskRequested()).then((events) => events[0].args.requestId);

    await expect(oracle.ownerFulfillForDemo(resultRequestId, 82, "APPROVE", "ipfs://risk-evidence"))
      .to.emit(oracle, "RiskFulfilled")
      .withArgs(resultRequestId, orderId, 82, "APPROVE", "ipfs://risk-evidence");

    const result = await oracle.results(resultRequestId);
    expect(result.fulfilled).to.equal(true);
    expect(result.requester).to.equal(requester.address);
  });
});
