// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract ArbitrumExecutionRouter {
    enum AdapterKind {
        GMX,
        ZeroDev,
        Stylus,
        Dune,
        Fhenix,
        RobinhoodChain,
        Manual
    }

    enum IntentStatus {
        Proposed,
        Approved,
        Executed,
        Cancelled
    }

    struct ExecutionIntent {
        bytes32 intentId;
        bytes32 agentId;
        address operator;
        AdapterKind adapter;
        address target;
        uint256 maxValueWei;
        bytes32 calldataHash;
        string policyUri;
        string evidenceUri;
        IntentStatus status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    mapping(bytes32 => ExecutionIntent) public intents;
    mapping(address => bytes32[]) private operatorIntents;

    event ExecutionIntentProposed(
        bytes32 indexed intentId,
        bytes32 indexed agentId,
        address indexed operator,
        AdapterKind adapter,
        address target,
        uint256 maxValueWei,
        bytes32 calldataHash,
        string policyUri
    );
    event ExecutionIntentApproved(bytes32 indexed intentId, string evidenceUri);
    event ExecutionIntentExecuted(bytes32 indexed intentId, bytes32 txHashOrReceiptHash, string evidenceUri);
    event ExecutionIntentCancelled(bytes32 indexed intentId, string reason);

    modifier onlyIntentOperator(bytes32 intentId) {
        require(intents[intentId].operator == msg.sender, "not intent operator");
        _;
    }

    function proposeIntent(
        bytes32 agentId,
        AdapterKind adapter,
        address target,
        uint256 maxValueWei,
        bytes32 calldataHash,
        string calldata policyUri
    ) external returns (bytes32 intentId) {
        require(agentId != bytes32(0), "agent id required");
        require(calldataHash != bytes32(0), "calldata hash required");
        require(bytes(policyUri).length > 0, "policy uri required");

        intentId = keccak256(abi.encodePacked(block.chainid, address(this), msg.sender, agentId, adapter, calldataHash, operatorIntents[msg.sender].length));
        require(intents[intentId].operator == address(0), "intent exists");

        intents[intentId] = ExecutionIntent({
            intentId: intentId,
            agentId: agentId,
            operator: msg.sender,
            adapter: adapter,
            target: target,
            maxValueWei: maxValueWei,
            calldataHash: calldataHash,
            policyUri: policyUri,
            evidenceUri: "",
            status: IntentStatus.Proposed,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        operatorIntents[msg.sender].push(intentId);

        emit ExecutionIntentProposed(intentId, agentId, msg.sender, adapter, target, maxValueWei, calldataHash, policyUri);
    }

    function approveIntent(bytes32 intentId, string calldata evidenceUri) external onlyIntentOperator(intentId) {
        ExecutionIntent storage intent = intents[intentId];
        require(intent.status == IntentStatus.Proposed, "bad status");
        require(bytes(evidenceUri).length > 0, "evidence required");

        intent.status = IntentStatus.Approved;
        intent.evidenceUri = evidenceUri;
        intent.updatedAt = block.timestamp;
        emit ExecutionIntentApproved(intentId, evidenceUri);
    }

    function recordExecution(bytes32 intentId, bytes32 txHashOrReceiptHash, string calldata evidenceUri) external onlyIntentOperator(intentId) {
        ExecutionIntent storage intent = intents[intentId];
        require(intent.status == IntentStatus.Approved, "not approved");
        require(txHashOrReceiptHash != bytes32(0), "tx hash required");
        require(bytes(evidenceUri).length > 0, "evidence required");

        intent.status = IntentStatus.Executed;
        intent.evidenceUri = evidenceUri;
        intent.updatedAt = block.timestamp;
        emit ExecutionIntentExecuted(intentId, txHashOrReceiptHash, evidenceUri);
    }

    function cancelIntent(bytes32 intentId, string calldata reason) external onlyIntentOperator(intentId) {
        ExecutionIntent storage intent = intents[intentId];
        require(intent.status == IntentStatus.Proposed || intent.status == IntentStatus.Approved, "bad status");
        require(bytes(reason).length > 0, "reason required");

        intent.status = IntentStatus.Cancelled;
        intent.evidenceUri = reason;
        intent.updatedAt = block.timestamp;
        emit ExecutionIntentCancelled(intentId, reason);
    }

    function getOperatorIntents(address operator) external view returns (bytes32[] memory) {
        return operatorIntents[operator];
    }
}
