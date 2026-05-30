import { expect } from "chai";
import { ethers } from "hardhat";

describe("AgentReputationBook", () => {
  async function deployFixture() {
    const [deployer, requester, provider, stranger] = await ethers.getSigners();

    const registry = await ethers.deployContract("AgentRegistry");
    const policy = await ethers.deployContract("TreasuryPolicy");
    const treasury = await ethers.deployContract("AgentTreasury");
    const orderBook = await ethers.deployContract("AgentOrderBook", [
      await registry.getAddress(),
      await policy.getAddress(),
      await treasury.getAddress(),
    ]);
    const reputation = await ethers.deployContract("AgentReputationBook", [await orderBook.getAddress()]);

    await policy.setOrderBook(await orderBook.getAddress());
    await treasury.setOrderBook(await orderBook.getAddress());

    return { deployer, requester, provider, stranger, registry, policy, treasury, orderBook, reputation };
  }

  it("records reputation after a fulfilled order", async () => {
    const { requester, provider, registry, policy, orderBook, reputation } = await deployFixture();
    const agentId = ethers.id("reputation-agent");
    const price = ethers.parseEther("0.01");

    await registry.connect(provider).registerAgent(agentId, "Reputation Agent", "https://agent.example/rep", "research", price);
    await policy.connect(requester).setPolicy(0, 0, 0, 0, 0, 0, false, true);
    await policy.connect(requester).setAgentAllowed(agentId, true);

    const tx = await orderBook.connect(requester).createOrder(agentId, "ipfs://rep-request", { value: price });
    const receipt = await tx.wait();
    const event = receipt?.logs
      .map((log) => {
        try {
          return orderBook.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed?.name === "OrderCreated");
    const orderId = event?.args.orderId as string;

    await orderBook.connect(provider).acceptOrder(orderId);
    await orderBook.connect(provider).fulfillOrder(orderId, "ipfs://rep-result");

    await expect(reputation.connect(requester).recordReview(orderId, agentId, 92, false, "ipfs://rep-review"))
      .to.emit(reputation, "ReputationRecorded");

    const row = await reputation.reputations(agentId);
    expect(row.reviewCount).to.equal(1);
    expect(row.totalScore).to.equal(92);
    expect(row.completedCount).to.equal(1);
    expect(row.disputeCount).to.equal(0);
    expect(await reputation.reputationScore(agentId)).to.equal(92);
  });

  it("blocks non-participants and duplicate reviews", async () => {
    const { requester, provider, stranger, registry, policy, orderBook, reputation } = await deployFixture();
    const agentId = ethers.id("guarded-reputation-agent");
    const price = ethers.parseEther("0.01");

    await registry.connect(provider).registerAgent(agentId, "Guarded Agent", "https://agent.example/guarded", "routing", price);
    await policy.connect(requester).setPolicy(0, 0, 0, 0, 0, 0, false, true);
    await policy.connect(requester).setAgentAllowed(agentId, true);

    const tx = await orderBook.connect(requester).createOrder(agentId, "ipfs://guarded-request", { value: price });
    const receipt = await tx.wait();
    const event = receipt?.logs
      .map((log) => {
        try {
          return orderBook.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed?.name === "OrderCreated");
    const orderId = event?.args.orderId as string;

    await orderBook.connect(provider).failOrder(orderId, "provider unavailable");

    await expect(reputation.connect(stranger).recordReview(orderId, agentId, 10, true, "ipfs://bad"))
      .to.be.revertedWith("not participant");

    await reputation.connect(requester).recordReview(orderId, agentId, 40, true, "ipfs://dispute");

    await expect(reputation.connect(requester).recordReview(orderId, agentId, 40, true, "ipfs://again"))
      .to.be.revertedWith("already reviewed");

    const row = await reputation.reputations(agentId);
    expect(row.reviewCount).to.equal(1);
    expect(row.disputeCount).to.equal(1);
  });
});
