import { expect } from "chai";
import { ethers } from "hardhat";

describe("ArbitrumExecutionRouter", () => {
  it("records GMX/ZeroDev/Dune/Fhenix execution evidence lifecycle", async () => {
    const [operator, other] = await ethers.getSigners();
    const router = await ethers.deployContract("ArbitrumExecutionRouter");
    const agentId = ethers.id("treasury-router");
    const calldataHash = ethers.keccak256(ethers.toUtf8Bytes("gmx-route:ETH-USDC:policy-42"));

    const tx = await router.connect(operator).proposeIntent(
      agentId,
      0,
      "0x0000000000000000000000000000000000000000",
      ethers.parseEther("0.02"),
      calldataHash,
      "ipfs://arcpay/policy/gmx-eth-usdc",
    );
    const receipt = await tx.wait();
    const event = receipt?.logs
      .map((log) => {
        try {
          return router.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed?.name === "ExecutionIntentProposed");
    const intentId = event?.args.intentId as string;

    await expect(router.connect(other).approveIntent(intentId, "ipfs://bad"))
      .to.be.revertedWith("not intent operator");

    await expect(router.connect(operator).approveIntent(intentId, "dune://query/arcpay-gmx-risk"))
      .to.emit(router, "ExecutionIntentApproved")
      .withArgs(intentId, "dune://query/arcpay-gmx-risk");

    const txHash = ethers.keccak256(ethers.toUtf8Bytes("0xarbiscan-tx-hash"));
    await expect(router.connect(operator).recordExecution(intentId, txHash, "https://sepolia.arbiscan.io/tx/0xabc"))
      .to.emit(router, "ExecutionIntentExecuted")
      .withArgs(intentId, txHash, "https://sepolia.arbiscan.io/tx/0xabc");

    const intent = await router.intents(intentId);
    expect(intent.status).to.equal(2);
    expect(await router.getOperatorIntents(operator.address)).to.deep.equal([intentId]);
  });
});
