import { expect } from "chai";
import { ethers } from "hardhat";

describe("OperatorControls", () => {
  it("redeems claim codes once", async () => {
    const [operator, agent] = await ethers.getSigners();
    const controls = await ethers.deployContract("OperatorControls");
    const code = "claim-research-agent-001";
    const claimHash = ethers.keccak256(ethers.toUtf8Bytes(code));
    const agentId = ethers.id("research-agent");

    await controls.connect(operator).createClaimCode(claimHash, agentId, "ipfs://agent-onboarding", 3600);

    await expect(controls.connect(agent).redeemClaimCode(code))
      .to.emit(controls, "ClaimCodeRedeemed")
      .withArgs(claimHash, agent.address);

    await expect(controls.connect(agent).redeemClaimCode(code)).to.be.revertedWith("claim redeemed");
  });

  it("opens webhook circuits after repeated failures", async () => {
    const controls = await ethers.deployContract("OperatorControls");
    const originHash = ethers.id("https://agent.example/webhook");

    for (let i = 0; i < 5; i += 1) {
      await controls.recordWebhookFailure(originHash);
    }

    expect(await controls.isWebhookOpen(originHash)).to.equal(true);

    await controls.recordWebhookSuccess(originHash);
    expect(await controls.isWebhookOpen(originHash)).to.equal(false);
  });
});
