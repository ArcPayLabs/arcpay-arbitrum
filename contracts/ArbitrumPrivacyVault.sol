// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IERC20Privacy {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract ArbitrumPrivacyVault {
    struct PrivateIntent {
        address operator;
        address token;
        uint256 amount;
        string encryptedMemoUri;
        bool released;
        bool cancelled;
        uint256 createdAt;
    }

    address public constant NATIVE_TOKEN = address(0);

    mapping(bytes32 => PrivateIntent) public intents;
    mapping(bytes32 => bool) public nullifiers;

    event PrivateIntentCreated(
        bytes32 indexed commitment,
        address indexed operator,
        address indexed token,
        uint256 amount,
        string encryptedMemoUri
    );
    event PrivateIntentReleased(bytes32 indexed commitment, bytes32 indexed nullifier, address indexed recipient);
    event PrivateIntentCancelled(bytes32 indexed commitment);

    modifier onlyOperator(bytes32 commitment) {
        require(intents[commitment].operator == msg.sender, "not operator");
        _;
    }

    function createNativeIntent(bytes32 commitment, string calldata encryptedMemoUri) external payable {
        require(msg.value > 0, "amount required");
        _createIntent(commitment, NATIVE_TOKEN, msg.value, encryptedMemoUri);
    }

    function createTokenIntent(bytes32 commitment, address token, uint256 amount, string calldata encryptedMemoUri) external {
        require(token != address(0), "token required");
        require(amount > 0, "amount required");
        require(IERC20Privacy(token).transferFrom(msg.sender, address(this), amount), "transfer failed");
        _createIntent(commitment, token, amount, encryptedMemoUri);
    }

    function releaseIntent(bytes32 commitment, bytes32 nullifier, address payable recipient) external onlyOperator(commitment) {
        require(nullifier != bytes32(0), "nullifier required");
        require(!nullifiers[nullifier], "nullifier used");
        require(recipient != address(0), "recipient required");

        PrivateIntent storage intent = intents[commitment];
        require(!intent.released, "already released");
        require(!intent.cancelled, "cancelled");

        nullifiers[nullifier] = true;
        intent.released = true;

        if (intent.token == NATIVE_TOKEN) {
            (bool ok,) = recipient.call{value: intent.amount}("");
            require(ok, "native transfer failed");
        } else {
            require(IERC20Privacy(intent.token).transfer(recipient, intent.amount), "token transfer failed");
        }

        emit PrivateIntentReleased(commitment, nullifier, recipient);
    }

    function cancelIntent(bytes32 commitment) external onlyOperator(commitment) {
        PrivateIntent storage intent = intents[commitment];
        require(!intent.released, "already released");
        require(!intent.cancelled, "cancelled");
        intent.cancelled = true;

        if (intent.token == NATIVE_TOKEN) {
            (bool ok,) = payable(intent.operator).call{value: intent.amount}("");
            require(ok, "native refund failed");
        } else {
            require(IERC20Privacy(intent.token).transfer(intent.operator, intent.amount), "token refund failed");
        }

        emit PrivateIntentCancelled(commitment);
    }

    function _createIntent(bytes32 commitment, address token, uint256 amount, string calldata encryptedMemoUri) internal {
        require(commitment != bytes32(0), "commitment required");
        require(intents[commitment].operator == address(0), "intent exists");
        require(bytes(encryptedMemoUri).length > 0, "memo required");

        intents[commitment] = PrivateIntent({
            operator: msg.sender,
            token: token,
            amount: amount,
            encryptedMemoUri: encryptedMemoUri,
            released: false,
            cancelled: false,
            createdAt: block.timestamp
        });

        emit PrivateIntentCreated(commitment, msg.sender, token, amount, encryptedMemoUri);
    }
}
