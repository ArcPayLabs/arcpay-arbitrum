// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract AgentIdentity8004 {
    struct Identity {
        uint256 tokenId;
        bytes32 agentId;
        address owner;
        string metadataUri;
        string serviceEndpoint;
        string trustModel;
        bool active;
        uint256 reputationNonce;
        uint256 createdAt;
        uint256 updatedAt;
    }

    mapping(uint256 => Identity) public identities;
    mapping(bytes32 => uint256) public tokenByAgentId;
    mapping(address => uint256[]) private ownerTokens;

    event AgentIdentityRegistered(
        uint256 indexed tokenId,
        bytes32 indexed agentId,
        address indexed owner,
        string metadataUri,
        string serviceEndpoint,
        string trustModel
    );
    event AgentIdentityUpdated(uint256 indexed tokenId, string metadataUri, string serviceEndpoint, string trustModel, bool active);
    event ReputationNonceAdvanced(uint256 indexed tokenId, uint256 reputationNonce);

    modifier onlyIdentityOwner(uint256 tokenId) {
        require(identities[tokenId].owner == msg.sender, "not identity owner");
        _;
    }

    function registerIdentity(
        bytes32 agentId,
        string calldata metadataUri,
        string calldata serviceEndpoint,
        string calldata trustModel
    ) external returns (uint256 tokenId) {
        require(agentId != bytes32(0), "agent id required");
        require(tokenByAgentId[agentId] == 0, "agent identity exists");
        require(bytes(metadataUri).length > 0, "metadata required");
        require(bytes(serviceEndpoint).length > 0, "endpoint required");
        require(bytes(trustModel).length > 0, "trust model required");

        tokenId = uint256(keccak256(abi.encodePacked(block.chainid, address(this), agentId, msg.sender)));
        require(tokenId != 0, "bad token");

        identities[tokenId] = Identity({
            tokenId: tokenId,
            agentId: agentId,
            owner: msg.sender,
            metadataUri: metadataUri,
            serviceEndpoint: serviceEndpoint,
            trustModel: trustModel,
            active: true,
            reputationNonce: 0,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        tokenByAgentId[agentId] = tokenId;
        ownerTokens[msg.sender].push(tokenId);

        emit AgentIdentityRegistered(tokenId, agentId, msg.sender, metadataUri, serviceEndpoint, trustModel);
    }

    function updateIdentity(
        uint256 tokenId,
        string calldata metadataUri,
        string calldata serviceEndpoint,
        string calldata trustModel,
        bool active
    ) external onlyIdentityOwner(tokenId) {
        require(bytes(metadataUri).length > 0, "metadata required");
        require(bytes(serviceEndpoint).length > 0, "endpoint required");
        require(bytes(trustModel).length > 0, "trust model required");

        Identity storage identity = identities[tokenId];
        identity.metadataUri = metadataUri;
        identity.serviceEndpoint = serviceEndpoint;
        identity.trustModel = trustModel;
        identity.active = active;
        identity.updatedAt = block.timestamp;

        emit AgentIdentityUpdated(tokenId, metadataUri, serviceEndpoint, trustModel, active);
    }

    function advanceReputationNonce(uint256 tokenId) external onlyIdentityOwner(tokenId) returns (uint256 reputationNonce) {
        Identity storage identity = identities[tokenId];
        reputationNonce = ++identity.reputationNonce;
        identity.updatedAt = block.timestamp;
        emit ReputationNonceAdvanced(tokenId, reputationNonce);
    }

    function requireActiveIdentity(bytes32 agentId) external view returns (uint256 tokenId, address owner) {
        tokenId = tokenByAgentId[agentId];
        Identity storage identity = identities[tokenId];
        require(identity.owner != address(0), "identity missing");
        require(identity.active, "identity inactive");
        return (tokenId, identity.owner);
    }

    function getOwnerTokens(address owner) external view returns (uint256[] memory) {
        return ownerTokens[owner];
    }
}
