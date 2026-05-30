import { expect } from "chai";
import { ethers } from "hardhat";

describe("ArbitrumPrivacyVault", () => {
  it("creates and releases a USDC private intent once", async () => {
    const [operator, recipient] = await ethers.getSigners();
    const token = await ethers.deployContract("MockERC20");
    const vault = await ethers.deployContract("ArbitrumPrivacyVault");
    const amount = 3_000_000n;
    const commitment = ethers.id("private-intent-1");
    const nullifier = ethers.id("release-secret-1");

    await token.mint(operator.address, amount);
    await token.connect(operator).approve(await vault.getAddress(), amount);

    await expect(vault.connect(operator).createTokenIntent(commitment, await token.getAddress(), amount, "encrypted://memo-1"))
      .to.emit(vault, "PrivateIntentCreated")
      .withArgs(commitment, operator.address, await token.getAddress(), amount, "encrypted://memo-1");

    await expect(vault.connect(operator).releaseIntent(commitment, nullifier, recipient.address))
      .to.emit(vault, "PrivateIntentReleased")
      .withArgs(commitment, nullifier, recipient.address);

    expect(await token.balanceOf(recipient.address)).to.equal(amount);
    await expect(vault.connect(operator).releaseIntent(commitment, nullifier, recipient.address))
      .to.be.revertedWith("nullifier used");
  });

  it("cancels native intents back to the operator", async () => {
    const [operator] = await ethers.getSigners();
    const vault = await ethers.deployContract("ArbitrumPrivacyVault");
    const commitment = ethers.id("native-intent");

    await vault.connect(operator).createNativeIntent(commitment, "encrypted://native", { value: ethers.parseEther("0.01") });

    await expect(vault.connect(operator).cancelIntent(commitment))
      .to.emit(vault, "PrivateIntentCancelled")
      .withArgs(commitment);
  });
});
