// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract TreasuryPolicy {
    struct Policy {
        uint256 hourlyLimitWei;
        uint256 dailyLimitWei;
        uint256 weeklyLimitWei;
        uint256 approvalThresholdWei;
        uint8 allowedStartHourUtc;
        uint8 allowedEndHourUtc;
        bool emergencyPaused;
        bool allowlistEnabled;
    }

    struct SpendWindow {
        uint256 hourStart;
        uint256 hourSpentWei;
        uint256 dayStart;
        uint256 daySpentWei;
        uint256 weekStart;
        uint256 weekSpentWei;
    }

    address public owner;
    address public orderBook;

    mapping(address => Policy) public policies;
    mapping(address => SpendWindow) public spendWindows;
    mapping(address => mapping(bytes32 => bool)) public allowedAgents;
    mapping(address => mapping(bytes32 => bool)) public spendApprovals;

    event OrderBookSet(address indexed orderBook);
    event PolicyUpdated(address indexed operator, uint256 hourlyLimitWei, uint256 dailyLimitWei, uint256 weeklyLimitWei, uint256 approvalThresholdWei, uint8 allowedStartHourUtc, uint8 allowedEndHourUtc, bool emergencyPaused, bool allowlistEnabled);
    event AgentAllowanceUpdated(address indexed operator, bytes32 indexed agentId, bool allowed);
    event SpendApprovalUpdated(address indexed operator, bytes32 indexed orderId, bool approved);
    event SpendRecorded(address indexed operator, bytes32 indexed agentId, uint256 amountWei);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyOrderBook() {
        require(msg.sender == orderBook, "not order book");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setOrderBook(address nextOrderBook) external onlyOwner {
        require(nextOrderBook != address(0), "order book required");
        orderBook = nextOrderBook;
        emit OrderBookSet(nextOrderBook);
    }

    function setPolicy(
        uint256 hourlyLimitWei,
        uint256 dailyLimitWei,
        uint256 weeklyLimitWei,
        uint256 approvalThresholdWei,
        uint8 allowedStartHourUtc,
        uint8 allowedEndHourUtc,
        bool emergencyPaused,
        bool allowlistEnabled
    ) external {
        require(dailyLimitWei == 0 || hourlyLimitWei <= dailyLimitWei, "hourly exceeds daily");
        require(weeklyLimitWei == 0 || dailyLimitWei <= weeklyLimitWei, "daily exceeds weekly");
        require(allowedStartHourUtc < 24, "bad start hour");
        require(allowedEndHourUtc < 24, "bad end hour");

        policies[msg.sender] = Policy({
            hourlyLimitWei: hourlyLimitWei,
            dailyLimitWei: dailyLimitWei,
            weeklyLimitWei: weeklyLimitWei,
            approvalThresholdWei: approvalThresholdWei,
            allowedStartHourUtc: allowedStartHourUtc,
            allowedEndHourUtc: allowedEndHourUtc,
            emergencyPaused: emergencyPaused,
            allowlistEnabled: allowlistEnabled
        });

        emit PolicyUpdated(msg.sender, hourlyLimitWei, dailyLimitWei, weeklyLimitWei, approvalThresholdWei, allowedStartHourUtc, allowedEndHourUtc, emergencyPaused, allowlistEnabled);
    }

    function setAgentAllowed(bytes32 agentId, bool allowed) external {
        allowedAgents[msg.sender][agentId] = allowed;
        emit AgentAllowanceUpdated(msg.sender, agentId, allowed);
    }

    function approveSpend(bytes32 orderId, bool approved) external {
        spendApprovals[msg.sender][orderId] = approved;
        emit SpendApprovalUpdated(msg.sender, orderId, approved);
    }

    function validateAndRecord(address operator, bytes32 agentId, bytes32 orderId, uint256 amountWei) external onlyOrderBook {
        Policy memory policy = policies[operator];
        require(!policy.emergencyPaused, "emergency paused");
        require(_insideAllowedHour(policy), "outside allowed hours");
        if (policy.allowlistEnabled) {
            require(allowedAgents[operator][agentId], "agent not allowed");
        }
        if (policy.approvalThresholdWei > 0) {
            require(amountWei <= policy.approvalThresholdWei || spendApprovals[operator][orderId], "approval required");
        }

        SpendWindow storage window = spendWindows[operator];
        uint256 hourStart = (block.timestamp / 1 hours) * 1 hours;
        uint256 dayStart = (block.timestamp / 1 days) * 1 days;
        uint256 weekStart = (block.timestamp / 7 days) * 7 days;

        if (window.hourStart != hourStart) {
            window.hourStart = hourStart;
            window.hourSpentWei = 0;
        }
        if (window.dayStart != dayStart) {
            window.dayStart = dayStart;
            window.daySpentWei = 0;
        }
        if (window.weekStart != weekStart) {
            window.weekStart = weekStart;
            window.weekSpentWei = 0;
        }

        if (policy.hourlyLimitWei > 0) {
            require(window.hourSpentWei + amountWei <= policy.hourlyLimitWei, "hourly limit");
        }
        if (policy.dailyLimitWei > 0) {
            require(window.daySpentWei + amountWei <= policy.dailyLimitWei, "daily limit");
        }
        if (policy.weeklyLimitWei > 0) {
            require(window.weekSpentWei + amountWei <= policy.weeklyLimitWei, "weekly limit");
        }

        window.hourSpentWei += amountWei;
        window.daySpentWei += amountWei;
        window.weekSpentWei += amountWei;
        emit SpendRecorded(operator, agentId, amountWei);
    }

    function _insideAllowedHour(Policy memory policy) internal view returns (bool) {
        if (policy.allowedStartHourUtc == policy.allowedEndHourUtc) {
            return true;
        }
        uint8 currentHour = uint8((block.timestamp / 1 hours) % 24);
        if (policy.allowedStartHourUtc < policy.allowedEndHourUtc) {
            return currentHour >= policy.allowedStartHourUtc && currentHour < policy.allowedEndHourUtc;
        }
        return currentHour >= policy.allowedStartHourUtc || currentHour < policy.allowedEndHourUtc;
    }
}
