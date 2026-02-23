// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract UserProxy {
    address immutable OWNER;
    uint nonce = 0;

    bytes32 private constant SIGNED_ACCESS_TYPEHASH =
        keccak256("signedAccess(address,bytes,uint256)");

    bytes32 private constant SIGNED_ACCESS_PAYABLE_TYPEHASH =
        keccak256("signedAccessPayable(address,bytes,uint256,uint256)");

    bytes32 immutable DOMAIN_SEPARATOR;      

    constructor(address owner_) {
        OWNER = owner_;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("UserProxy")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );        
    }

    event CallResult(address target, bytes returnData);

    function directAccess(address target, bytes calldata data) 
            external returns (bytes memory) {
        require(msg.sender == OWNER, "Only owner can call");
        (bool success, bytes memory returnData) = target.call(data);
        require(success, "Call failed");

        emit CallResult(target, returnData);

        return returnData;
    }

    function directAccessPayable(address target, uint value, bytes calldata data) 
            external payable returns (bytes memory) {
        require(msg.sender == OWNER, "Only owner can call");
        (bool success, bytes memory returnData) = target.call{value: value}(data);
        require(success, "Call failed");

        emit CallResult(target, returnData);

        return returnData;
    }

    
    function signedAccess(
        address target, 
        bytes calldata data,
        uint8 v, 
        bytes32 r, 
        bytes32 s) 
    external returns (bytes memory) {
        // Compute EIP-712 digest
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        SIGNED_ACCESS_TYPEHASH,
                        target,
                        keccak256(data),
                        nonce
                    )
                )
            )
        );

        // Recover signer
        address signer = ecrecover(digest, v, r, s);
        require(signer == OWNER, "Signature invalid or not by owner");

        (bool success, bytes memory returnData) = target.call(data);
        require(success, "Call failed");

        emit CallResult(target, returnData);

        nonce++; // Increment nonce to prevent replay

        return returnData;
    }

    function signedAccessPayable(
        address target, 
        bytes calldata data, 
        uint256 value,
        uint8 v, 
        bytes32 r, 
        bytes32 s
    ) 
    external payable returns (bytes memory) {
        value; // silence unused parameter warning

        // Compute EIP-712 digest
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        SIGNED_ACCESS_PAYABLE_TYPEHASH,
                        target,
                        keccak256(data),
                        value,
                        nonce
                    )
                )
            )
        );

        // Recover signer
        address signer = ecrecover(digest, v, r, s);
        require(signer == OWNER, "Signature invalid or not by owner");

        (bool success, bytes memory returnData) = target.call{value: value}(data);
        require(success, "Call failed");

        emit CallResult(target, returnData);

        nonce++; // Increment nonce to prevent replay

        return returnData;
    }
}
