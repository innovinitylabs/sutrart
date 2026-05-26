// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "openzeppelin-contracts/contracts/token/common/ERC2981.sol";

contract MockERC721Royalty is ERC721, ERC2981 {
    uint256 public nextTokenId = 1;

    bool private _useRawRoyalty;
    address private _rawReceiver;
    uint96 private _rawFraction;

    constructor() ERC721("Sutrart Mock Royalty NFT", "SMRNFT") {}

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = nextTokenId;
        nextTokenId += 1;
        _mint(to, tokenId);
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function setRawDefaultRoyalty(address receiver, uint96 feeNumerator) external {
        _useRawRoyalty = true;
        _rawReceiver = receiver;
        _rawFraction = feeNumerator;
    }

    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        public
        view
        override
        returns (address receiver, uint256 amount)
    {
        if (_useRawRoyalty) {
            receiver = _rawReceiver;
            amount = (salePrice * _rawFraction) / 10_000;
            return (receiver, amount);
        }

        return super.royaltyInfo(tokenId, salePrice);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
