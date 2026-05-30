// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IInvoiceERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract AgentInvoiceBook {
    enum InvoiceStatus {
        Created,
        Paid,
        Cancelled
    }

    struct Invoice {
        bytes32 invoiceId;
        address issuer;
        address payer;
        address token;
        uint256 amount;
        string metadataUri;
        InvoiceStatus status;
        uint256 createdAt;
        uint256 paidAt;
        uint256 cancelledAt;
    }

    address public constant NATIVE_TOKEN = address(0);

    mapping(bytes32 => Invoice) public invoices;

    event InvoiceCreated(
        bytes32 indexed invoiceId,
        address indexed issuer,
        address indexed payer,
        address token,
        uint256 amount,
        string metadataUri
    );
    event InvoicePaid(bytes32 indexed invoiceId, address indexed payer, address token, uint256 amount);
    event InvoiceCancelled(bytes32 indexed invoiceId);

    modifier onlyIssuer(bytes32 invoiceId) {
        require(invoices[invoiceId].issuer == msg.sender, "not issuer");
        _;
    }

    function createInvoice(
        bytes32 invoiceId,
        address payer,
        address token,
        uint256 amount,
        string calldata metadataUri
    ) external {
        require(invoiceId != bytes32(0), "invoice required");
        require(invoices[invoiceId].issuer == address(0), "invoice exists");
        require(amount > 0, "amount required");
        require(bytes(metadataUri).length > 0, "metadata required");

        invoices[invoiceId] = Invoice({
            invoiceId: invoiceId,
            issuer: msg.sender,
            payer: payer,
            token: token,
            amount: amount,
            metadataUri: metadataUri,
            status: InvoiceStatus.Created,
            createdAt: block.timestamp,
            paidAt: 0,
            cancelledAt: 0
        });

        emit InvoiceCreated(invoiceId, msg.sender, payer, token, amount, metadataUri);
    }

    function payNativeInvoice(bytes32 invoiceId) external payable {
        Invoice storage invoice = _payableInvoice(invoiceId, NATIVE_TOKEN);
        require(msg.value == invoice.amount, "wrong value");
        invoice.status = InvoiceStatus.Paid;
        invoice.paidAt = block.timestamp;
        (bool ok,) = payable(invoice.issuer).call{value: msg.value}("");
        require(ok, "native transfer failed");
        emit InvoicePaid(invoiceId, msg.sender, NATIVE_TOKEN, msg.value);
    }

    function payTokenInvoice(bytes32 invoiceId) external {
        Invoice storage invoice = invoices[invoiceId];
        require(invoice.issuer != address(0), "invoice missing");
        require(invoice.token != NATIVE_TOKEN, "native invoice");
        _requirePayable(invoice);

        invoice.status = InvoiceStatus.Paid;
        invoice.paidAt = block.timestamp;
        require(IInvoiceERC20(invoice.token).transferFrom(msg.sender, invoice.issuer, invoice.amount), "token transfer failed");
        emit InvoicePaid(invoiceId, msg.sender, invoice.token, invoice.amount);
    }

    function cancelInvoice(bytes32 invoiceId) external onlyIssuer(invoiceId) {
        Invoice storage invoice = invoices[invoiceId];
        require(invoice.status == InvoiceStatus.Created, "bad status");
        invoice.status = InvoiceStatus.Cancelled;
        invoice.cancelledAt = block.timestamp;
        emit InvoiceCancelled(invoiceId);
    }

    function _payableInvoice(bytes32 invoiceId, address token) internal view returns (Invoice storage invoice) {
        invoice = invoices[invoiceId];
        require(invoice.issuer != address(0), "invoice missing");
        require(invoice.token == token, "wrong token");
        _requirePayable(invoice);
    }

    function _requirePayable(Invoice storage invoice) internal view {
        require(invoice.status == InvoiceStatus.Created, "bad status");
        require(invoice.payer == address(0) || invoice.payer == msg.sender, "wrong payer");
        require(invoice.issuer != msg.sender, "issuer cannot pay");
    }
}
