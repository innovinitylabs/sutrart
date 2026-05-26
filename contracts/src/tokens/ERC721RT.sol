// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "openzeppelin-contracts/contracts/token/common/ERC2981.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {Strings} from "openzeppelin-contracts/contracts/utils/Strings.sol";

/// @notice Creator-owned ERC721 collection with ERC2981 royalties and metadata hooks.
contract ERC721RT is ERC721, ERC2981, Ownable {
    uint256 public nextTokenId = 1;

    string private _baseTokenURI;
    string private _contractURI;

    constructor(
        string memory name_,
        string memory symbol_,
        address owner_,
        string memory baseURI_,
        string memory contractURI_,
        address royaltyRecipient_,
        uint96 royaltyBps_
    ) ERC721(name_, symbol_) Ownable(owner_) {
        _setBaseURIInternal(baseURI_);
        _contractURI = contractURI_;

        if (royaltyRecipient_ != address(0) && royaltyBps_ > 0) {
            _setDefaultRoyalty(royaltyRecipient_, royaltyBps_);
        }
    }

    function mint(address to) external onlyOwner returns (uint256 tokenId) {
        tokenId = nextTokenId;
        nextTokenId += 1;
        _safeMint(to, tokenId);
    }

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        _setBaseURIInternal(baseURI_);
    }

    function setContractURI(string calldata contractURI_) external onlyOwner {
        _contractURI = contractURI_;
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function contractURI() external view returns (string memory) {
        return _contractURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory base = _baseURI();
        if (bytes(base).length == 0) {
            return "";
        }

        return string(abi.encodePacked(base, Strings.toString(tokenId)));
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _setBaseURIInternal(string memory baseURI_) internal {
        _baseTokenURI = baseURI_;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
