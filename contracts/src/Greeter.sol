// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract Greeter {
    string public greeting;

    event SetGreeting(address sender, string greeting);

    // -----------------------------
    // EIP-712 CONFIG
    // -----------------------------
    bytes32 private constant GREETING_TYPEHASH =
        keccak256("GreetingRequest(string greeting)");

    bytes32 immutable DOMAIN_SEPARATOR;   // explain why not immutable

    struct GreetingRequest {
        string greeting;
    }

    constructor(string memory _greeting) {
        greeting = _greeting;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("Greeter")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
        emit SetGreeting(msg.sender, _greeting);
    }

    // Don't do anything, just to deal with WAGMI probes
    fallback() external {
    }

    // -----------------------------
    // SPONSORED META-TX
    // -----------------------------
    function sponsoredSetGreeting(
        GreetingRequest calldata req,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // Compute EIP-712 digest
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        GREETING_TYPEHASH,
                        keccak256(bytes(req.greeting))
                    )
                )
            )
        );

        // Recover signer
        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "Invalid signature");

        // Apply greeting as if signer called it
        greeting = req.greeting;
        emit SetGreeting(signer, req.greeting);
    }
}
