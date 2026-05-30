// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IReputationOrderBook {
    function orders(bytes32 orderId) external view returns (
        bytes32,
        bytes32 agentId,
        address requester,
        address provider,
        uint256,
        string memory,
        string memory,
        uint8 status,
        uint256,
        uint256
    );
}

contract AgentReputationBook {
    struct Reputation {
        uint256 reviewCount;
        uint256 totalScore;
        uint256 completedCount;
        uint256 disputeCount;
        uint256 lastUpdatedAt;
    }

    struct Review {
        bytes32 orderId;
        bytes32 agentId;
        address reviewer;
        uint8 score;
        bool disputed;
        string evidenceUri;
        uint256 createdAt;
    }

    IReputationOrderBook public immutable orderBook;

    mapping(bytes32 => Reputation) public reputations;
    mapping(bytes32 => Review) public reviews;
    mapping(bytes32 => mapping(address => bool)) public reviewedBy;

    event ReputationRecorded(
        bytes32 indexed reviewId,
        bytes32 indexed agentId,
        bytes32 indexed orderId,
        address reviewer,
        uint8 score,
        bool disputed,
        string evidenceUri
    );

    constructor(address orderBook_) {
        require(orderBook_ != address(0), "order book required");
        orderBook = IReputationOrderBook(orderBook_);
    }

    function recordReview(
        bytes32 orderId,
        bytes32 agentId,
        uint8 score,
        bool disputed,
        string calldata evidenceUri
    ) external returns (bytes32 reviewId) {
        require(orderId != bytes32(0), "order id required");
        require(agentId != bytes32(0), "agent id required");
        require(score > 0 && score <= 100, "bad score");
        require(bytes(evidenceUri).length > 0, "evidence required");

        (, bytes32 orderAgentId, address requester, address provider,,,, uint8 status,,) = orderBook.orders(orderId);
        require(orderAgentId == agentId, "agent mismatch");
        require(msg.sender == requester || msg.sender == provider, "not participant");
        require(_reviewable(status), "order not reviewable");
        require(!reviewedBy[orderId][msg.sender], "already reviewed");

        reviewId = keccak256(abi.encodePacked(block.chainid, address(this), orderId, msg.sender));
        reviewedBy[orderId][msg.sender] = true;

        reviews[reviewId] = Review({
            orderId: orderId,
            agentId: agentId,
            reviewer: msg.sender,
            score: score,
            disputed: disputed,
            evidenceUri: evidenceUri,
            createdAt: block.timestamp
        });

        Reputation storage reputation = reputations[agentId];
        reputation.reviewCount += 1;
        reputation.totalScore += score;
        if (status == 3 || status == 4) reputation.completedCount += 1;
        if (disputed || status == 5 || status == 6) reputation.disputeCount += 1;
        reputation.lastUpdatedAt = block.timestamp;

        emit ReputationRecorded(reviewId, agentId, orderId, msg.sender, score, disputed, evidenceUri);
    }

    function reputationScore(bytes32 agentId) external view returns (uint256) {
        Reputation storage reputation = reputations[agentId];
        if (reputation.reviewCount == 0) return 0;
        return reputation.totalScore / reputation.reviewCount;
    }

    function _reviewable(uint8 status) internal pure returns (bool) {
        return status == 3 || status == 4 || status == 5 || status == 6;
    }
}
