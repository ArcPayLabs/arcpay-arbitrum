// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract AgentSpendCardVault {
    struct SpendCard {
        address operator;
        address agent;
        address token;
        uint256 limit;
        uint256 balance;
        uint256 spent;
        bool active;
        string label;
        uint256 createdAt;
    }

    mapping(bytes32 => SpendCard) public cards;

    event CardCreated(bytes32 indexed cardId, address indexed operator, address indexed agent, address token, uint256 limit, string label);
    event CardFunded(bytes32 indexed cardId, uint256 amount);
    event CardSpent(bytes32 indexed cardId, address indexed recipient, uint256 amount, string memo);
    event CardStatusUpdated(bytes32 indexed cardId, bool active);
    event CardLimitUpdated(bytes32 indexed cardId, uint256 limit);

    modifier onlyOperator(bytes32 cardId) {
        require(cards[cardId].operator == msg.sender, "not operator");
        _;
    }

    function createCard(bytes32 cardId, address agent, address token, uint256 limit, string calldata label) external {
        require(cardId != bytes32(0), "card required");
        require(cards[cardId].operator == address(0), "card exists");
        require(agent != address(0), "agent required");
        require(token != address(0), "token required");
        require(limit > 0, "limit required");

        cards[cardId] = SpendCard({
            operator: msg.sender,
            agent: agent,
            token: token,
            limit: limit,
            balance: 0,
            spent: 0,
            active: true,
            label: label,
            createdAt: block.timestamp
        });

        emit CardCreated(cardId, msg.sender, agent, token, limit, label);
    }

    function topUpCard(bytes32 cardId, uint256 amount) external onlyOperator(cardId) {
        require(amount > 0, "amount required");
        SpendCard storage card = cards[cardId];
        require(IERC20Minimal(card.token).transferFrom(msg.sender, address(this), amount), "transfer failed");
        card.balance += amount;
        emit CardFunded(cardId, amount);
    }

    function setCardStatus(bytes32 cardId, bool active) external onlyOperator(cardId) {
        cards[cardId].active = active;
        emit CardStatusUpdated(cardId, active);
    }

    function setCardLimit(bytes32 cardId, uint256 limit) external onlyOperator(cardId) {
        require(limit >= cards[cardId].spent, "below spent");
        cards[cardId].limit = limit;
        emit CardLimitUpdated(cardId, limit);
    }

    function spendCard(bytes32 cardId, address recipient, uint256 amount, string calldata memo) external {
        SpendCard storage card = cards[cardId];
        require(card.operator != address(0), "card missing");
        require(card.agent == msg.sender, "not agent");
        require(card.active, "card inactive");
        require(recipient != address(0), "recipient required");
        require(amount > 0, "amount required");
        require(card.spent + amount <= card.limit, "limit exceeded");
        require(card.balance >= amount, "insufficient card balance");

        card.spent += amount;
        card.balance -= amount;
        require(IERC20Minimal(card.token).transfer(recipient, amount), "transfer failed");
        emit CardSpent(cardId, recipient, amount, memo);
    }
}
