// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Test.sol";
import "../src/Proxy.sol";
import "../src/Greeter.sol";

contract ProxySignedAccessOwnerTest is Test {
    Proxy proxy;
    Greeter greeter;

    uint256 ownerKey;
    address owner;

    bytes32 private DOMAIN_SEPARATOR;
    bytes32 constant TYPEHASH = keccak256("signedAccess(address,bytes,uint256)");

    function setUp() public {
        // OWNER is the signer now
        ownerKey = 0xA11CE;
        owner = vm.addr(ownerKey);

        proxy = new Proxy(owner);
        greeter = new Greeter("hello");

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("Proxy")),
                keccak256(bytes("1")),
                block.chainid,
                address(proxy)
            )
        );        
    }

    function testSignedAccessOwnerSignature() public {
        // ---------------------------------------
        // 1. Prepare calldata for Greeter.setGreeting
        // ---------------------------------------
        string memory newGreeting = "gm owner";

        bytes memory callData = abi.encodeWithSelector(
            Greeter.setGreeting.selector,
            newGreeting
        );

        // ---------------------------------------
        // 2. Recompute Proxy’s EIP‑712 digest
        // ---------------------------------------
        bytes32 structHash = keccak256(
            abi.encode(
                TYPEHASH,
                address(greeter),
                keccak256(callData),
                0 // nonce
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                structHash
            )
        );

        // ---------------------------------------
        // 3. Sign digest with OWNER key
        // ---------------------------------------
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, digest);

        // ---------------------------------------
        // 4. Expect event from Greeter
        // ---------------------------------------
        // Expect Greeter.SetGreeting (first event)
        vm.expectEmit(true, true, false, true, address(greeter));
        emit Greeter.SetGreeting(address(proxy), newGreeting);

        // Expect Proxy.CallResult (second event)
        vm.expectEmit(false, false, false, false, address(proxy));
        emit Proxy.CallResult(address(greeter), bytes(""));


        // ---------------------------------------
        // 5. Call signedAccess on Proxy
        // ---------------------------------------
        proxy.signedAccess(address(greeter), callData, v, r, s);

        // ---------------------------------------
        // 6. Verify state change
        // ---------------------------------------
        assertEq(greeter.greet(), newGreeting);
    }

    function testSignedAccessNonOwnerSignature() public {
        // ---------------------------------------
        // 1. Prepare calldata for Greeter.setGreeting
        // ---------------------------------------
        string memory newGreeting = "gm rando";
        string memory oldGreeting = greeter.greet();

        bytes memory callData = abi.encodeWithSelector(
            Greeter.setGreeting.selector,
            newGreeting
        );

        // ---------------------------------------
        // 2. Recompute Proxy’s EIP‑712 digest
        // ---------------------------------------
        bytes32 structHash = keccak256(
            abi.encode(
                TYPEHASH,
                address(greeter),
                keccak256(callData),
                0 // nonce
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                structHash
            )
        );

        // ---------------------------------------
        // 3. Sign digest with a different key
        // ---------------------------------------
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xbad060a7, digest);

        // ---------------------------------------
        // 4. Call signedAccess on Proxy
        // ---------------------------------------
        vm.expectRevert("Signature invalid or not by owner");
        proxy.signedAccess(address(greeter), callData, v, r, s);

        // ---------------------------------------
        // 5. Verify state did not change
        // ---------------------------------------
        assertEq(greeter.greet(), oldGreeting);
    }    

    function testSignedAccessOwnerSignatureTwice() public {
        // ---------------------------------------
        // 1. Prepare calldata for Greeter.setGreeting
        // ---------------------------------------
        string memory greeting1 = "gm owner";
        string memory greeting2 = "good morning owner";        

        bytes memory callData = abi.encodeWithSelector(
            Greeter.setGreeting.selector,
            greeting1
        );

        // ---------------------------------------
        // 2. Recompute Proxy’s EIP‑712 digest
        // ---------------------------------------
        bytes32 structHash = keccak256(
            abi.encode(
                TYPEHASH,
                address(greeter),
                keccak256(callData),
                0 // nonce
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                structHash
            )
        );

        // ---------------------------------------
        // 3. Sign digest with OWNER key
        // ---------------------------------------
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, digest);

        // ---------------------------------------
        // 4. Call signedAccess on Proxy
        // ---------------------------------------
        proxy.signedAccess(address(greeter), callData, v, r, s);

        // ---------------------------------------
        // 5. Verify state change
        // ---------------------------------------
        assertEq(greeter.greet(), greeting1);

        // ---------------------------------------
        // 6. Prepare calldata for second call
        // ---------------------------------------
        callData = abi.encodeWithSelector(
            Greeter.setGreeting.selector,
            greeting2
        );

        // ---------------------------------------
        // 7. Recompute Proxy’s EIP‑712 digest
        // ---------------------------------------

        structHash = keccak256(
            abi.encode(
                TYPEHASH,
                address(greeter),
                keccak256(callData),
                1 // nonce
            )
        );

        digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                structHash
            )
        );

        // ---------------------------------------
        // 8. Sign digest with OWNER key
        // ---------------------------------------
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(ownerKey, digest);

        // ---------------------------------------
        // 9. Call signedAccess on Proxy
        // ---------------------------------------
        proxy.signedAccess(address(greeter), callData, v2, r2, s2);

        // ---------------------------------------
        // 10. Verify state change
        // ---------------------------------------
        assertEq(greeter.greet(), greeting2);        
    }

    function testReplayAttack() public {
        // ---------------------------------------
        // 1. Prepare calldata for Greeter.setGreeting
        // ---------------------------------------
        string memory greeting1 = "gm owner";

        bytes memory callData = abi.encodeWithSelector(
            Greeter.setGreeting.selector,
            greeting1
        );

        // ---------------------------------------
        // 2. Recompute Proxy’s EIP‑712 digest
        // ---------------------------------------
        bytes32 structHash = keccak256(
            abi.encode(
                TYPEHASH,
                address(greeter),
                keccak256(callData),
                0 // nonce
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                structHash
            )
        );

        // ---------------------------------------
        // 3. Sign digest with OWNER key
        // ---------------------------------------
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, digest);

        // ---------------------------------------
        // 4. Call signedAccess on Proxy
        // ---------------------------------------
        proxy.signedAccess(address(greeter), callData, v, r, s);

        // ---------------------------------------
        // 5. Verify state change
        // ---------------------------------------
        assertEq(greeter.greet(), greeting1);

        // ---------------------------------------
        // 6. Attempt replay with same signature
        // ---------------------------------------
        vm.expectRevert("Signature invalid or not by owner");
        proxy.signedAccess(address(greeter), callData, v, r, s);
    }
}    