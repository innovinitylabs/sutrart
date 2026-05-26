// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";

contract MockERC721 is ERC721 {
    uint256 public nextTokenId = 1;

    constructor() ERC721("Sutrart Mock NFT", "SMNFT") {}

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = nextTokenId;
        nextTokenId += 1;
        _mint(to, tokenId);
    }
}
