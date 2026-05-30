// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IArbitrumAgentRequester {
    function createRequest(uint256 agentId, address callback, bytes4 callbackSelector, bytes calldata payload)
        external
        payable
        returns (uint256 requestId);

    function getRequestDeposit() external view returns (uint256);
}

struct AgentResponse {
    bytes result;
}

struct AgentRequest {
    uint256 agentId;
    address callback;
    bytes4 callbackSelector;
    bytes payload;
}

enum AgentResponseStatus {
    Success,
    Failed,
    TimedOut
}

contract ArbitrumAgentRiskOracle {
    struct RiskResult {
        uint256 requestId;
        bytes32 orderId;
        address requester;
        uint256 score;
        string verdict;
        string evidenceUri;
        bool fulfilled;
        AgentResponseStatus responseStatus;
        uint256 requestedAt;
        uint256 fulfilledAt;
    }

    address public owner;
    address public platform;
    uint256 public riskAgentId;
    uint256 public pricePerAgentWei;
    uint256 public subcommitteeSize;

    mapping(uint256 => RiskResult) public results;

    event PlatformUpdated(address indexed platform, uint256 riskAgentId);
    event AgentBudgetUpdated(uint256 pricePerAgentWei, uint256 subcommitteeSize);
    event RiskRequested(uint256 indexed requestId, bytes32 indexed orderId, address indexed requester, string prompt);
    event RiskFulfilled(uint256 indexed requestId, bytes32 indexed orderId, uint256 score, string verdict, string evidenceUri);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyPlatform() {
        require(msg.sender == platform, "not platform");
        _;
    }

    constructor(address platform_, uint256 riskAgentId_) {
        owner = msg.sender;
        platform = platform_;
        riskAgentId = riskAgentId_;
        pricePerAgentWei = 0.07 ether;
        subcommitteeSize = 3;
    }

    function setPlatform(address platform_, uint256 riskAgentId_) external onlyOwner {
        platform = platform_;
        riskAgentId = riskAgentId_;
        emit PlatformUpdated(platform_, riskAgentId_);
    }

    function setAgentBudget(uint256 pricePerAgentWei_, uint256 subcommitteeSize_) external onlyOwner {
        require(subcommitteeSize_ > 0, "subcommittee required");
        pricePerAgentWei = pricePerAgentWei_;
        subcommitteeSize = subcommitteeSize_;
        emit AgentBudgetUpdated(pricePerAgentWei_, subcommitteeSize_);
    }

    function requestRisk(bytes32 orderId, string calldata prompt) external payable returns (uint256 requestId) {
        require(platform != address(0), "platform missing");
        require(orderId != bytes32(0), "order required");
        require(bytes(prompt).length > 0, "prompt required");

        uint256 deposit = IArbitrumAgentRequester(platform).getRequestDeposit() + (pricePerAgentWei * subcommitteeSize);
        require(msg.value >= deposit, "underfunded");

        bytes memory payload = abi.encode(prompt);
        requestId = IArbitrumAgentRequester(platform).createRequest{value: deposit}(
            riskAgentId,
            address(this),
            this.handleResponse.selector,
            payload
        );

        results[requestId] = RiskResult({
            requestId: requestId,
            orderId: orderId,
            requester: msg.sender,
            score: 0,
            verdict: "pending",
            evidenceUri: "",
            fulfilled: false,
            responseStatus: AgentResponseStatus.TimedOut,
            requestedAt: block.timestamp,
            fulfilledAt: 0
        });

        emit RiskRequested(requestId, orderId, msg.sender, prompt);
    }

    function handleResponse(
        uint256 requestId,
        AgentResponse[] calldata responses,
        AgentResponseStatus status,
        AgentRequest calldata
    )
        external
        onlyPlatform
    {
        RiskResult storage result = results[requestId];
        require(result.requester != address(0), "request missing");
        require(!result.fulfilled, "already fulfilled");

        uint256 score = 0;
        string memory verdict = "REVIEW";
        string memory evidenceUri = "arbitrum-agent://no-result";
        if (status == AgentResponseStatus.Success && responses.length > 0) {
            bytes memory raw = responses[0].result;
            if (raw.length >= 32) {
                score = abi.decode(raw, (uint256));
                if (score > 100) {
                    score = 100;
                }
                verdict = score >= 70 ? "APPROVE" : "REJECT";
                evidenceUri = "arbitrum-agent://risk-score";
            } else if (raw.length > 0) {
                verdict = string(raw);
                evidenceUri = "arbitrum-agent://risk-verdict";
            }
        } else if (status == AgentResponseStatus.Failed) {
            verdict = "FAILED";
        } else {
            verdict = "TIMED_OUT";
        }

        _fulfill(requestId, score, verdict, evidenceUri, status);
    }

    function ownerFulfillForDemo(uint256 requestId, uint256 score, string calldata verdict, string calldata evidenceUri)
        external
        onlyOwner
    {
        _fulfill(requestId, score, verdict, evidenceUri, AgentResponseStatus.Success);
    }

    function _fulfill(
        uint256 requestId,
        uint256 score,
        string memory verdict,
        string memory evidenceUri,
        AgentResponseStatus status
    ) internal {
        RiskResult storage result = results[requestId];
        require(result.requester != address(0), "request missing");
        require(!result.fulfilled, "already fulfilled");
        require(score <= 100, "score max 100");

        result.score = score;
        result.verdict = verdict;
        result.evidenceUri = evidenceUri;
        result.fulfilled = true;
        result.responseStatus = status;
        result.fulfilledAt = block.timestamp;

        emit RiskFulfilled(requestId, result.orderId, score, verdict, evidenceUri);
    }

    receive() external payable {}
}
