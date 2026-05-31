// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ECDSA} from "openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {IPariMarket} from "../interfaces/IPariMarket.sol";
import {LibPariEIP712} from "../libraries/LibPariEIP712.sol";
import {PariPayouts} from "../libraries/PariPayouts.sol";
import {PariSettlement} from "../libraries/PariSettlement.sol";
import {PariStorage} from "../libraries/PariStorage.sol";
import {PariValidation} from "../libraries/PariValidation.sol";

contract SignedListingFacet {
    using ECDSA for bytes32;

    function domainSeparator() external view returns (bytes32) {
        return LibPariEIP712.domainSeparator();
    }

    function hashSignedListing(IPariMarket.SignedListing memory listing) external pure returns (bytes32) {
        return LibPariEIP712.hashSignedListing(
            listing.seller, listing.nftContract, listing.tokenId, listing.price, listing.expiry, listing.nonce
        );
    }

    function signedListingMinNonce(address seller) external view returns (uint256) {
        return PariStorage.layout().signedListingMinNonce[seller];
    }

    function filledSignedListings(bytes32 digest) external view returns (bool) {
        return PariStorage.layout().filledSignedListings[digest];
    }

    function isSignedListingValid(IPariMarket.SignedListing memory listing) external view returns (bool) {
        return PariValidation.isSignedListingValid(_toStorageListing(listing));
    }

    function previewSignedPayouts(IPariMarket.SignedListing memory listing, uint96 marketplaceFeeBps)
        external
        view
        returns (IPariMarket.PayoutPreview memory)
    {
        require(listing.seller != address(0), "Seller is zero");
        require(listing.price > 0, "Price is zero");

        return PariPayouts.computePayoutPreview(
            listing.nftContract, listing.tokenId, listing.price, marketplaceFeeBps
        );
    }

    function incrementSignedListingNonce() external {
        PariStorage.Layout storage ds = PariStorage.layout();
        uint256 newMinNonce = ds.signedListingMinNonce[msg.sender] + 1;
        ds.signedListingMinNonce[msg.sender] = newMinNonce;
        emit IPariMarket.SignedListingNonceIncremented(msg.sender, newMinNonce);
    }

    function buySignedListing(
        IPariMarket.SignedListing memory listing,
        bytes calldata signature,
        address marketplaceFeeRecipient,
        uint96 marketplaceFeeBps
    ) external payable {
        PariStorage.enterNonReentrant();
        _buySignedListing(listing, signature, marketplaceFeeRecipient, marketplaceFeeBps);
        PariStorage.exitNonReentrant();
    }

    function _buySignedListing(
        IPariMarket.SignedListing memory listing,
        bytes calldata signature,
        address marketplaceFeeRecipient,
        uint96 marketplaceFeeBps
    ) private {
        require(PariValidation.isSignedListingValid(_toStorageListing(listing)), "Signed listing is not valid");
        require(msg.sender != listing.seller, "Seller cannot buy own listing");
        require(msg.value == listing.price, "Incorrect ETH amount");

        bytes32 structHash = _verifySignedListingSignature(listing, signature);

        PariStorage.layout().filledSignedListings[structHash] = true;

        IPariMarket.PayoutPreview memory payout = PariSettlement.executeSale(
            listing.seller,
            msg.sender,
            listing.nftContract,
            listing.tokenId,
            listing.price,
            marketplaceFeeRecipient,
            marketplaceFeeBps
        );

        emit IPariMarket.SignedListingFilled(
            structHash,
            listing.seller,
            msg.sender,
            listing.nftContract,
            listing.tokenId,
            listing.price,
            payout.protocolFee,
            payout.marketplaceFee,
            payout.sellerProceeds
        );
    }

    function _verifySignedListingSignature(IPariMarket.SignedListing memory listing, bytes calldata signature)
        private
        view
        returns (bytes32 structHash)
    {
        structHash = LibPariEIP712.hashSignedListing(
            listing.seller, listing.nftContract, listing.tokenId, listing.price, listing.expiry, listing.nonce
        );
        address signer = LibPariEIP712.hashTypedData(structHash).recover(signature);
        require(signer == listing.seller, "Invalid signature");
    }

    function _toStorageListing(IPariMarket.SignedListing memory listing)
        private
        pure
        returns (PariStorage.SignedListing memory)
    {
        return PariStorage.SignedListing({
            seller: listing.seller,
            nftContract: listing.nftContract,
            tokenId: listing.tokenId,
            price: listing.price,
            expiry: listing.expiry,
            nonce: listing.nonce
        });
    }
}
