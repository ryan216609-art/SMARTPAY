// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SPAYToken
 * @notice Token ERC-20 fictício para testes acadêmicos do SmartPay.
 * Não representa moeda, depósito ou ativo financeiro real.
 */
contract SPAYToken is ERC20, Ownable {
    constructor(address initialOwner)
        ERC20("SmartPay Demo Token", "SPAY")
        Ownable(initialOwner)
    {
        _mint(initialOwner, 100_000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Endereco invalido");
        _mint(to, amount);
    }
}
