// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract AgentRegistry {
    struct Agent {
        address owner;
        string name;
        string endpoint;
        string capabilities;
        uint256 priceWei;
        bool active;
        uint256 createdAt;
        uint256 updatedAt;
    }

    mapping(bytes32 => Agent) public agents;
    mapping(address => bytes32[]) private ownerAgents;

    event AgentRegistered(bytes32 indexed agentId, address indexed owner, string name, uint256 priceWei);
    event AgentUpdated(bytes32 indexed agentId, string endpoint, string capabilities, uint256 priceWei, bool active);

    modifier onlyAgentOwner(bytes32 agentId) {
        require(agents[agentId].owner == msg.sender, "not agent owner");
        _;
    }

    function registerAgent(
        bytes32 agentId,
        string calldata name,
        string calldata endpoint,
        string calldata capabilities,
        uint256 priceWei
    ) external {
        require(agentId != bytes32(0), "agent id required");
        require(agents[agentId].owner == address(0), "agent exists");
        require(bytes(name).length > 0, "name required");
        require(bytes(endpoint).length > 0, "endpoint required");

        agents[agentId] = Agent({
            owner: msg.sender,
            name: name,
            endpoint: endpoint,
            capabilities: capabilities,
            priceWei: priceWei,
            active: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        ownerAgents[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, name, priceWei);
    }

    function updateAgent(
        bytes32 agentId,
        string calldata endpoint,
        string calldata capabilities,
        uint256 priceWei,
        bool active
    ) external onlyAgentOwner(agentId) {
        Agent storage agent = agents[agentId];
        require(bytes(endpoint).length > 0, "endpoint required");
        agent.endpoint = endpoint;
        agent.capabilities = capabilities;
        agent.priceWei = priceWei;
        agent.active = active;
        agent.updatedAt = block.timestamp;

        emit AgentUpdated(agentId, endpoint, capabilities, priceWei, active);
    }

    function getOwnerAgents(address owner) external view returns (bytes32[] memory) {
        return ownerAgents[owner];
    }

    function requireActiveAgent(bytes32 agentId) external view returns (address owner, uint256 priceWei) {
        Agent storage agent = agents[agentId];
        require(agent.owner != address(0), "agent missing");
        require(agent.active, "agent inactive");
        return (agent.owner, agent.priceWei);
    }
}

