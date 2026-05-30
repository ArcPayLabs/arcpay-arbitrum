import { expect } from "chai";
import { ethers } from "hardhat";

describe("AgentIdentity8004", () => {
  it("registers, updates, and resolves an ERC-8004-style agent identity", async () => {
    const [owner, other] = await ethers.getSigners();
    const identity = await ethers.deployContract("AgentIdentity8004");
    const agentId = ethers.id("treasury-router");

    const tx = await identity.connect(owner).registerIdentity(
      agentId,
      "ipfs://arcpay/agent/treasury-router",
      "https://arcpay-arbitrum.vercel.app/api/mcp",
      "x402 escrow, ArcPay policy, reputation-backed",
    );
    const receipt = await tx.wait();
    const event = receipt?.logs
      .map((log) => {
        try {
          return identity.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed?.name === "AgentIdentityRegistered");
    const tokenId = event?.args.tokenId as bigint;

    expect(await identity.tokenByAgentId(agentId)).to.equal(tokenId);
    expect((await identity.requireActiveIdentity(agentId)).owner).to.equal(owner.address);
    expect(await identity.getOwnerTokens(owner.address)).to.deep.equal([tokenId]);

    await expect(
      identity.connect(other).updateIdentity(tokenId, "ipfs://bad", "https://bad.example", "bad", true),
    ).to.be.revertedWith("not identity owner");

    await identity.connect(owner).updateIdentity(
      tokenId,
      "ipfs://arcpay/agent/treasury-router-v2",
      "https://arcpay-arbitrum.vercel.app/api/developer/tools",
      "GMX, ZeroDev, Dune, Fhenix evidence gated by ArcPay",
      true,
    );
    await expect(identity.connect(owner).advanceReputationNonce(tokenId))
      .to.emit(identity, "ReputationNonceAdvanced")
      .withArgs(tokenId, 1);
  });
});
