// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MessageHashUtils} from "openzeppelin-contracts/contracts/utils/cryptography/MessageHashUtils.sol";

/// @dev Diamond-safe EIP-712 helpers. Uses `address(this)` at runtime so the domain
///      separator always references the Diamond proxy, not a facet implementation.
library LibSutrartEIP712 {
    bytes32 internal constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    bytes32 internal constant SIGNED_LISTING_TYPEHASH = keccak256(
        "SignedListing(address seller,address nftContract,uint256 tokenId,uint256 price,uint256 expiry,uint256 nonce)"
    );

    bytes32 internal constant HASHED_NAME = keccak256(bytes("Sutrart"));
    bytes32 internal constant HASHED_VERSION = keccak256(bytes("1"));

    function domainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(EIP712_DOMAIN_TYPEHASH, HASHED_NAME, HASHED_VERSION, block.chainid, address(this))
        );
    }

    function hashSignedListing(
        address seller,
        address nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 expiry,
        uint256 nonce
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(SIGNED_LISTING_TYPEHASH, seller, nftContract, tokenId, price, expiry, nonce)
        );
    }

    function hashTypedData(bytes32 structHash) internal view returns (bytes32) {
        return MessageHashUtils.toTypedDataHash(domainSeparator(), structHash);
    }
}
