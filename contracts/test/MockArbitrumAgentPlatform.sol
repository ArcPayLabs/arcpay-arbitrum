// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract MockArbitrumAgentPlatform {
    uint256 public nonce;

    event MockRequestCreated(uint256 indexed agentId, bytes input, address callback, bytes4 callbackSelector);

    function getRequestDeposit() external pure returns (uint256) {
        return 0.03 ether;
    }

    function createRequest(uint256 agentId, address callback, bytes4 callbackSelector, bytes calldata input)
        external
        payable
        returns (uint256 requestId)
    {
        requestId = ++nonce;
        emit MockRequestCreated(agentId, input, callback, callbackSelector);
    }
}
