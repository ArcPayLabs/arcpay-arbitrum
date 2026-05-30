import { expect } from "chai";
import { ethers } from "hardhat";

describe("AgentInvoiceBook", () => {
  it("creates and pays native ETH invoices", async () => {
    const [issuer, payer] = await ethers.getSigners();
    const book = await ethers.deployContract("AgentInvoiceBook");
    const invoiceId = ethers.id("native-invoice-1");
    const amount = ethers.parseEther("0.01");

    await expect(book.connect(issuer).createInvoice(invoiceId, payer.address, ethers.ZeroAddress, amount, "invoice://native-1"))
      .to.emit(book, "InvoiceCreated")
      .withArgs(invoiceId, issuer.address, payer.address, ethers.ZeroAddress, amount, "invoice://native-1");

    await expect(book.connect(payer).payNativeInvoice(invoiceId, { value: amount }))
      .to.emit(book, "InvoicePaid")
      .withArgs(invoiceId, payer.address, ethers.ZeroAddress, amount);

    const invoice = await book.invoices(invoiceId);
    expect(invoice.status).to.equal(1);
    await expect(book.connect(payer).payNativeInvoice(invoiceId, { value: amount })).to.be.revertedWith("bad status");
  });

  it("creates and pays USDC token invoices", async () => {
    const [issuer, payer] = await ethers.getSigners();
    const token = await ethers.deployContract("MockERC20");
    const book = await ethers.deployContract("AgentInvoiceBook");
    const invoiceId = ethers.id("usdc-invoice-1");
    const amount = 5_000_000n;

    await token.mint(payer.address, amount);
    await book.connect(issuer).createInvoice(invoiceId, payer.address, await token.getAddress(), amount, "invoice://usdc-1");
    await token.connect(payer).approve(await book.getAddress(), amount);

    await expect(book.connect(payer).payTokenInvoice(invoiceId))
      .to.emit(book, "InvoicePaid")
      .withArgs(invoiceId, payer.address, await token.getAddress(), amount);

    expect(await token.balanceOf(issuer.address)).to.equal(amount);
  });

  it("enforces payer restriction and cancellation", async () => {
    const [issuer, payer, wrongPayer] = await ethers.getSigners();
    const book = await ethers.deployContract("AgentInvoiceBook");
    const invoiceId = ethers.id("cancel-invoice-1");
    const amount = ethers.parseEther("0.01");

    await book.connect(issuer).createInvoice(invoiceId, payer.address, ethers.ZeroAddress, amount, "invoice://cancel-1");
    await expect(book.connect(wrongPayer).payNativeInvoice(invoiceId, { value: amount })).to.be.revertedWith("wrong payer");

    await expect(book.connect(issuer).cancelInvoice(invoiceId))
      .to.emit(book, "InvoiceCancelled")
      .withArgs(invoiceId);

    await expect(book.connect(payer).payNativeInvoice(invoiceId, { value: amount })).to.be.revertedWith("bad status");
  });
});
