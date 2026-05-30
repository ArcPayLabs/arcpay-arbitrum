// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract OperatorControls {
    struct ClaimCode {
        address operator;
        bytes32 agentId;
        string metadataUri;
        bool redeemed;
        address redeemer;
        uint256 expiresAt;
        uint256 createdAt;
    }

    struct Circuit {
        uint256 windowStart;
        uint256 failureCount;
        uint256 openedUntil;
        uint256 lastFailureAt;
    }

    mapping(bytes32 => ClaimCode) public claimCodes;
    mapping(bytes32 => Circuit) public webhookCircuits;

    uint256 public constant FAILURE_WINDOW = 20 minutes;
    uint256 public constant FAILURE_THRESHOLD = 5;
    uint256 public constant OPEN_DURATION = 5 minutes;

    event ClaimCodeCreated(bytes32 indexed claimHash, address indexed operator, bytes32 indexed agentId, string metadataUri, uint256 expiresAt);
    event ClaimCodeRedeemed(bytes32 indexed claimHash, address indexed redeemer);
    event WebhookSuccess(bytes32 indexed originHash);
    event WebhookFailure(bytes32 indexed originHash, uint256 failureCount, uint256 openedUntil);
    event WebhookCircuitReset(bytes32 indexed originHash);

    function createClaimCode(bytes32 claimHash, bytes32 agentId, string calldata metadataUri, uint256 ttlSeconds) external {
        require(claimHash != bytes32(0), "claim required");
        require(agentId != bytes32(0), "agent required");
        require(claimCodes[claimHash].operator == address(0), "claim exists");
        uint256 expiresAt = ttlSeconds == 0 ? 0 : block.timestamp + ttlSeconds;

        claimCodes[claimHash] = ClaimCode({
            operator: msg.sender,
            agentId: agentId,
            metadataUri: metadataUri,
            redeemed: false,
            redeemer: address(0),
            expiresAt: expiresAt,
            createdAt: block.timestamp
        });

        emit ClaimCodeCreated(claimHash, msg.sender, agentId, metadataUri, expiresAt);
    }

    function redeemClaimCode(string calldata code) external returns (bytes32 claimHash, bytes32 agentId) {
        claimHash = keccak256(bytes(code));
        ClaimCode storage claim = claimCodes[claimHash];
        require(claim.operator != address(0), "claim missing");
        require(!claim.redeemed, "claim redeemed");
        require(claim.expiresAt == 0 || block.timestamp <= claim.expiresAt, "claim expired");

        claim.redeemed = true;
        claim.redeemer = msg.sender;
        agentId = claim.agentId;
        emit ClaimCodeRedeemed(claimHash, msg.sender);
    }

    function isWebhookOpen(bytes32 originHash) external view returns (bool) {
        return webhookCircuits[originHash].openedUntil > block.timestamp;
    }

    function recordWebhookSuccess(bytes32 originHash) external {
        delete webhookCircuits[originHash];
        emit WebhookSuccess(originHash);
    }

    function recordWebhookFailure(bytes32 originHash) external {
        Circuit storage circuit = webhookCircuits[originHash];
        if (circuit.windowStart == 0 || block.timestamp > circuit.windowStart + FAILURE_WINDOW) {
            circuit.windowStart = block.timestamp;
            circuit.failureCount = 0;
        }

        circuit.failureCount += 1;
        circuit.lastFailureAt = block.timestamp;
        if (circuit.failureCount >= FAILURE_THRESHOLD) {
            circuit.openedUntil = block.timestamp + OPEN_DURATION;
        }

        emit WebhookFailure(originHash, circuit.failureCount, circuit.openedUntil);
    }

    function resetWebhookCircuit(bytes32 originHash) external {
        delete webhookCircuits[originHash];
        emit WebhookCircuitReset(originHash);
    }
}
