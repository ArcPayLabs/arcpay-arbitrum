// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IAgentRegistry {
    function requireActiveAgent(bytes32 agentId) external view returns (address owner, uint256 priceWei);
}

interface ITreasuryPolicy {
    function validateAndRecord(address operator, bytes32 agentId, bytes32 orderId, uint256 amountWei) external;
}

interface IAgentTreasury {
    function deposit(bytes32 orderId) external payable;
    function settle(bytes32 orderId, address payable recipient) external;
    function refund(bytes32 orderId, address payable recipient) external;
}

contract AgentOrderBook {
    enum OrderStatus {
        Pending,
        Accepted,
        Processing,
        Fulfilled,
        Settled,
        Refunded,
        Failed
    }

    struct Order {
        bytes32 orderId;
        bytes32 agentId;
        address requester;
        address provider;
        uint256 amountWei;
        string requestUri;
        string resultUri;
        OrderStatus status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    IAgentRegistry public immutable registry;
    ITreasuryPolicy public immutable policy;
    IAgentTreasury public immutable treasury;

    mapping(bytes32 => Order) public orders;
    uint256 public orderNonce;

    event OrderCreated(bytes32 indexed orderId, bytes32 indexed agentId, address indexed requester, address provider, uint256 amountWei, string requestUri);
    event OrderStatusChanged(bytes32 indexed orderId, OrderStatus status);
    event OrderFulfilled(bytes32 indexed orderId, string resultUri);
    event OrderFailed(bytes32 indexed orderId, string reason);

    constructor(address registry_, address policy_, address treasury_) {
        require(registry_ != address(0), "registry required");
        require(policy_ != address(0), "policy required");
        require(treasury_ != address(0), "treasury required");
        registry = IAgentRegistry(registry_);
        policy = ITreasuryPolicy(policy_);
        treasury = IAgentTreasury(treasury_);
    }

    function createOrder(bytes32 agentId, string calldata requestUri) external payable returns (bytes32 orderId) {
        (address provider, uint256 priceWei) = registry.requireActiveAgent(agentId);
        require(provider != msg.sender, "self order");
        require(msg.value >= priceWei, "insufficient payment");
        require(bytes(requestUri).length > 0, "request uri required");

        orderId = keccak256(abi.encodePacked(block.chainid, address(this), msg.sender, agentId, orderNonce++));
        policy.validateAndRecord(msg.sender, agentId, orderId, msg.value);

        orders[orderId] = Order({
            orderId: orderId,
            agentId: agentId,
            requester: msg.sender,
            provider: provider,
            amountWei: msg.value,
            requestUri: requestUri,
            resultUri: "",
            status: OrderStatus.Pending,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        treasury.deposit{value: msg.value}(orderId);
        emit OrderCreated(orderId, agentId, msg.sender, provider, msg.value, requestUri);
    }

    function acceptOrder(bytes32 orderId) external {
        Order storage order = orders[orderId];
        require(order.provider == msg.sender, "not provider");
        require(order.status == OrderStatus.Pending, "bad status");
        _setStatus(order, OrderStatus.Accepted);
    }

    function markProcessing(bytes32 orderId) external {
        Order storage order = orders[orderId];
        require(order.provider == msg.sender, "not provider");
        require(order.status == OrderStatus.Accepted, "bad status");
        _setStatus(order, OrderStatus.Processing);
    }

    function fulfillOrder(bytes32 orderId, string calldata resultUri) external {
        Order storage order = orders[orderId];
        require(order.provider == msg.sender, "not provider");
        require(order.status == OrderStatus.Accepted || order.status == OrderStatus.Processing, "bad status");
        require(bytes(resultUri).length > 0, "result uri required");
        order.resultUri = resultUri;
        _setStatus(order, OrderStatus.Fulfilled);
        emit OrderFulfilled(orderId, resultUri);
    }

    function settleOrder(bytes32 orderId) external {
        Order storage order = orders[orderId];
        require(order.requester == msg.sender, "not requester");
        require(order.status == OrderStatus.Fulfilled, "bad status");
        _setStatus(order, OrderStatus.Settled);
        treasury.settle(orderId, payable(order.provider));
    }

    function refundOrder(bytes32 orderId) external {
        Order storage order = orders[orderId];
        require(order.requester == msg.sender, "not requester");
        require(order.status == OrderStatus.Pending || order.status == OrderStatus.Accepted, "bad status");
        _setStatus(order, OrderStatus.Refunded);
        treasury.refund(orderId, payable(order.requester));
    }

    function failOrder(bytes32 orderId, string calldata reason) external {
        Order storage order = orders[orderId];
        require(order.requester == msg.sender || order.provider == msg.sender, "not participant");
        require(
            order.status == OrderStatus.Pending ||
                order.status == OrderStatus.Accepted ||
                order.status == OrderStatus.Processing ||
                order.status == OrderStatus.Fulfilled,
            "bad status"
        );
        _setStatus(order, OrderStatus.Failed);
        treasury.refund(orderId, payable(order.requester));
        emit OrderFailed(orderId, reason);
    }

    function _setStatus(Order storage order, OrderStatus status) internal {
        order.status = status;
        order.updatedAt = block.timestamp;
        emit OrderStatusChanged(order.orderId, status);
    }
}
