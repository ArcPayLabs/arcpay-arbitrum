import { expect } from "chai";
import { ethers } from "hardhat";

describe("AgentSpendCardVault", () => {
  it("creates, funds, spends, and freezes USDC agent cards", async () => {
    const [operator, agent, recipient] = await ethers.getSigners();
    const token = await ethers.deployContract("MockERC20");
    const vault = await ethers.deployContract("AgentSpendCardVault");
    const cardId = ethers.id("card-1");
    const oneSomUsd = 1_000_000n;

    await token.mint(operator.address, 20n * oneSomUsd);
    await vault.connect(operator).createCard(cardId, agent.address, await token.getAddress(), 5n * oneSomUsd, "Research Card");
    await token.connect(operator).approve(await vault.getAddress(), 5n * oneSomUsd);
    await vault.connect(operator).topUpCard(cardId, 5n * oneSomUsd);

    await expect(vault.connect(agent).spendCard(cardId, recipient.address, 2n * oneSomUsd, "risk report"))
      .to.emit(vault, "CardSpent")
      .withArgs(cardId, recipient.address, 2n * oneSomUsd, "risk report");

    expect(await token.balanceOf(recipient.address)).to.equal(2n * oneSomUsd);

    await expect(vault.connect(agent).spendCard(cardId, recipient.address, 4n * oneSomUsd, "over limit"))
      .to.be.revertedWith("limit exceeded");

    await vault.connect(operator).setCardStatus(cardId, false);
    await expect(vault.connect(agent).spendCard(cardId, recipient.address, oneSomUsd, "paused"))
      .to.be.revertedWith("card inactive");
  });
});
