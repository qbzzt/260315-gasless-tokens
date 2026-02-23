// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FaucetToken is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 1000 * 1e18;

    constructor() ERC20("FaucetToken", "FAUCET") {}

    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
