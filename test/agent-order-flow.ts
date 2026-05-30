import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ArcPay Arbitrum agent order flow", () => {
  async function deployFixture() {
    const [deployer, requester, provider] = await ethers.getSigners();

    const registry = await ethers.deployContract("AgentRegistry");
    const policy = await ethers.deployContract("TreasuryPolicy");
    const treasury = await ethers.deployContract("AgentTreasury");
    const orderBook = await ethers.deployContract("AgentOrderBook", [
      await registry.getAddress(),
      await policy.getAddress(),
      await treasury.getAddress(),
    ]);

    await policy.setOrderBook(await orderBook.getAddress());
    await treasury.setOrderBook(await orderBook.getAddress());

    return { deployer, requester, provider, registry, policy, treasury, orderBook };
  }

  it("registers an agent, escrows an order, fulfills it, and settles", async () => {
    const { requester, provider, registry, policy, treasury, orderBook } = await deployFixture();
    const agentId = ethers.id("research-agent");
    const price = ethers.parseEther("0.01");

    await registry.connect(provider).registerAgent(
      agentId,
      "Research Agent",
      "https://agent.example/mcp",
      "research,analysis",
      price,
    );

    await policy.connect(requester).setPolicy(
      ethers.parseEther("0.05"),
      ethers.parseEther("0.10"),
      ethers.parseEther("0.50"),
      ethers.parseEther("0.02"),
      0,
      0,
      false,
      true,
    );
    await policy.connect(requester).setAgentAllowed(agentId, true);

    const tx = await orderBook.connect(requester).createOrder(agentId, "ipfs://request-1", { value: price });
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

    expect(await treasury.escrowedWei(orderId)).to.equal(price);

    await orderBook.connect(provider).acceptOrder(orderId);
    await orderBook.connect(provider).markProcessing(orderId);
    await orderBook.connect(provider).fulfillOrder(orderId, "ipfs://result-1");

    await expect(orderBook.connect(requester).settleOrder(orderId))
      .to.emit(orderBook, "OrderStatusChanged")
      .withArgs(orderId, 4);

    expect(await treasury.escrowedWei(orderId)).to.equal(0);
  });

  it("requires explicit approval above threshold and can fail/refund orders", async () => {
    const { requester, provider, registry, policy, treasury, orderBook } = await deployFixture();
    const agentId = ethers.id("approval-agent");
    const price = ethers.parseEther("0.03");

    await registry.connect(provider).registerAgent(
      agentId,
      "Approval Agent",
      "https://agent.example/approval",
      "approval-required",
      price,
    );

    await policy.connect(requester).setPolicy(
      ethers.parseEther("0.10"),
      ethers.parseEther("0.20"),
      ethers.parseEther("1"),
      ethers.parseEther("0.02"),
      0,
      0,
      false,
      true,
    );
    await policy.connect(requester).setAgentAllowed(agentId, true);

    const predictedOrderId = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "address", "address", "bytes32", "uint256"],
        [(await ethers.provider.getNetwork()).chainId, await orderBook.getAddress(), requester.address, agentId, 0],
      ),
    );

    await expect(
      orderBook.connect(requester).createOrder(agentId, "ipfs://request-approval", { value: price }),
    ).to.be.revertedWith("approval required");

    await policy.connect(requester).approveSpend(predictedOrderId, true);
    await orderBook.connect(requester).createOrder(agentId, "ipfs://request-approval", { value: price });
    expect(await treasury.escrowedWei(predictedOrderId)).to.equal(price);

    await expect(orderBook.connect(provider).failOrder(predictedOrderId, "agent unavailable"))
      .to.emit(orderBook, "OrderFailed")
      .withArgs(predictedOrderId, "agent unavailable");
    expect(await treasury.escrowedWei(predictedOrderId)).to.equal(0);
  });

  it("blocks orders when emergency pause is enabled", async () => {
    const { requester, provider, registry, policy, orderBook } = await deployFixture();
    const agentId = ethers.id("blocked-agent");
    const price = ethers.parseEther("0.01");

    await registry.connect(provider).registerAgent(
      agentId,
      "Blocked Agent",
      "https://agent.example/mcp",
      "research",
      price,
    );

    await policy.connect(requester).setPolicy(0, 0, 0, 0, 0, 0, true, false);

    await expect(
      orderBook.connect(requester).createOrder(agentId, "ipfs://request-2", { value: price }),
    ).to.be.revertedWith("emergency paused");
  });

  it("blocks weekly limit overflow", async () => {
    const { requester, provider, registry, policy, orderBook } = await deployFixture();
    const agentId = ethers.id("weekly-agent");
    const price = ethers.parseEther("0.02");

    await registry.connect(provider).registerAgent(
      agentId,
      "Weekly Agent",
      "https://agent.example/weekly",
      "weekly-limit",
      price,
    );

    await policy.connect(requester).setPolicy(
      ethers.parseEther("0.02"),
      ethers.parseEther("0.02"),
      ethers.parseEther("0.03"),
      0,
      0,
      0,
      false,
      true,
    );
    await policy.connect(requester).setAgentAllowed(agentId, true);

    const week = 7 * 24 * 60 * 60;
    const current = await time.latest();
    const nextWeekStart = Math.floor(current / week) * week + week;
    await time.increaseTo(nextWeekStart + 24 * 60 * 60);

    await orderBook.connect(requester).createOrder(agentId, "ipfs://weekly-1", { value: price });
    await time.increase(1 * 24 * 60 * 60);
    await expect(orderBook.connect(requester).createOrder(agentId, "ipfs://weekly-2", { value: price }))
      .to.be.revertedWith("weekly limit");
  });
});
