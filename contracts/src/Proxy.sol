// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract Proxy {
    address immutable OWNER;

    bytes32 private constant SIGNED_ACCESS_TYPEHASH =
        keccak256("signedAccess(address,bytes)");

    bytes32 private constant SIGNED_ACCESS_PAYABLE_TYPEHASH =
        keccak256("signedAccessPayable(address,bytes,uint256)");

    bytes32 immutable DOMAIN_SEPARATOR;      

    constructor(address owner_) {
        OWNER = owner_;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("Proxy")),
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
                        keccak256(data)
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
                        value
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

        return returnData;
    }
}


/*

 Using with Anvil

PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
PRIVATE_KEY_2=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
GREETER=`forge create Greeter --broadcast --private-key $PRIVATE_KEY --constructor-args Hello | awk '/Deployed to:/ {print $3}'`
PROXY=`forge create Proxy --broadcast --private-key $PRIVATE_KEY --constructor-args $ADDRESS | awk '/Deployed to:/ {print $3}'`
CALLDATA=`cast calldata "setGreeting(string)" Hi`
cast send $PROXY --private-key $PRIVATE_KEY "directAccess(address,bytes)" $GREETER $CALLDATA

# This should return "Hi"
cast call $GREETER "greet()" | cast to-ascii

# This should fail
cast send $PROXY --private-key $PRIVATE_KEY_2 "directAccess(address,bytes)" $GREETER $CALLDATA


cast wallet sign --data '{
    "types": {
      "EIP712Domain": [
        {"name": "name", "type": "string"},
        {"name": "version", "type": "string"},
        {"name": "chainId", "type": "uint256"},
        {"name": "verifyingContract", "type": "address"}
      ],
      "signedAccess": [
        {"name": "target", "type": "address"},
        {"name": "data", "type": "bytes"}
      ]
    },
    "primaryType": "signedAccess",
    "domain": {
      "name": "Proxy",
      "version": "1",
      "chainId": 1,
      "verifyingContract": "$PROXY"
    },
    "message": {
      "target": "$GREETER",
      "data": `CALLDATA=`cast calldata "setGreeting(string)" Bye`
    }
  }' --private-key $PRIVATE_KEY


*/