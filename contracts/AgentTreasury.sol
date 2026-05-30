// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract AgentTreasury {
    address public owner;
    address public orderBook;
    mapping(bytes32 => uint256) public escrowedWei;

    event OrderBookSet(address indexed orderBook);
    event Deposited(bytes32 indexed orderId, uint256 amountWei);
    event Settled(bytes32 indexed orderId, address indexed recipient, uint256 amountWei);
    event Refunded(bytes32 indexed orderId, address indexed recipient, uint256 amountWei);

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

    function deposit(bytes32 orderId) external payable onlyOrderBook {
        require(orderId != bytes32(0), "order id required");
        require(msg.value > 0, "value required");
        escrowedWei[orderId] += msg.value;
        emit Deposited(orderId, msg.value);
    }

    function settle(bytes32 orderId, address payable recipient) external onlyOrderBook {
        uint256 amount = escrowedWei[orderId];
        require(amount > 0, "nothing escrowed");
        escrowedWei[orderId] = 0;
        (bool ok, ) = recipient.call{value: amount}("");
        require(ok, "settle failed");
        emit Settled(orderId, recipient, amount);
    }

    function refund(bytes32 orderId, address payable recipient) external onlyOrderBook {
        uint256 amount = escrowedWei[orderId];
        require(amount > 0, "nothing escrowed");
        escrowedWei[orderId] = 0;
        (bool ok, ) = recipient.call{value: amount}("");
        require(ok, "refund failed");
        emit Refunded(orderId, recipient, amount);
    }
}

