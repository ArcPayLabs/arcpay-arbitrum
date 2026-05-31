// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {FHE, ebool, euint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @notice CoFHE-backed confidential policy proof anchor for ArcPay on Arbitrum Sepolia.
/// @dev Public state stores handles and commitments only; encrypted computation is delegated to CoFHE.
contract ArbitrumFhenixPolicyVault {
    struct ConfidentialPolicy {
        address operator;
        bytes32 spendHandle;
        bytes32 limitHandle;
        bytes32 allowedHandle;
        bytes32 metadataCommitment;
        uint64 createdAt;
    }

    mapping(bytes32 => ConfidentialPolicy) public policies;

    event ConfidentialPolicyRecorded(
        bytes32 indexed policyId,
        address indexed operator,
        bytes32 spendHandle,
        bytes32 limitHandle,
        bytes32 allowedHandle,
        bytes32 metadataCommitment
    );

    error PolicyExists();
    error UnknownPolicy();

    function recordPolicy(bytes32 policyId, uint32 spendCents, uint32 limitCents, bytes32 metadataCommitment) external {
        if (policies[policyId].createdAt != 0) revert PolicyExists();

        euint32 spend = FHE.asEuint32(spendCents);
        euint32 limit = FHE.asEuint32(limitCents);
        ebool allowed = FHE.lte(spend, limit);

        FHE.allowThis(spend);
        FHE.allowThis(limit);
        FHE.allowThis(allowed);
        FHE.allowSender(spend);
        FHE.allowSender(limit);
        FHE.allowSender(allowed);

        bytes32 spendHandle = FHE.unwrap(spend);
        bytes32 limitHandle = FHE.unwrap(limit);
        bytes32 allowedHandle = FHE.unwrap(allowed);

        policies[policyId] = ConfidentialPolicy({
            operator: msg.sender,
            spendHandle: spendHandle,
            limitHandle: limitHandle,
            allowedHandle: allowedHandle,
            metadataCommitment: metadataCommitment,
            createdAt: uint64(block.timestamp)
        });

        emit ConfidentialPolicyRecorded(policyId, msg.sender, spendHandle, limitHandle, allowedHandle, metadataCommitment);
    }

    function getPolicy(bytes32 policyId) external view returns (ConfidentialPolicy memory policy) {
        policy = policies[policyId];
        if (policy.createdAt == 0) revert UnknownPolicy();
    }
}
