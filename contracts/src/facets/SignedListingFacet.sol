// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ECDSA} from "openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {ISutrartMarket} from "../interfaces/ISutrartMarket.sol";
import {LibSutrartEIP712} from "../libraries/LibSutrartEIP712.sol";
import {SutrartPayouts} from "../libraries/SutrartPayouts.sol";
import {SutrartSettlement} from "../libraries/SutrartSettlement.sol";
import {SutrartStorage} from "../libraries/SutrartStorage.sol";
import {SutrartValidation} from "../libraries/SutrartValidation.sol";

contract SignedListingFacet {
    using ECDSA for bytes32;

    function domainSeparator() external view returns (bytes32) {
        return LibSutrartEIP712.domainSeparator();
    }

    function hashSignedListing(ISutrartMarket.SignedListing memory listing) external pure returns (bytes32) {
        return LibSutrartEIP712.hashSignedListing(
            listing.seller, listing.nftContract, listing.tokenId, listing.price, listing.expiry, listing.nonce
        );
    }

    function signedListingMinNonce(address seller) external view returns (uint256) {
        return SutrartStorage.layout().signedListingMinNonce[seller];
    }

    function filledSignedListings(bytes32 digest) external view returns (bool) {
        return SutrartStorage.layout().filledSignedListings[digest];
    }

    function isSignedListingValid(ISutrartMarket.SignedListing memory listing) external view returns (bool) {
        return SutrartValidation.isSignedListingValid(_toStorageListing(listing));
    }

    function previewSignedPayouts(ISutrartMarket.SignedListing memory listing, uint96 marketplaceFeeBps)
        external
        view
        returns (ISutrartMarket.PayoutPreview memory)
    {
        require(listing.seller != address(0), "Seller is zero");
        require(listing.price > 0, "Price is zero");

        return SutrartPayouts.computePayoutPreview(
            listing.nftContract, listing.tokenId, listing.price, marketplaceFeeBps
        );
    }

    function incrementSignedListingNonce() external {
        SutrartStorage.Layout storage ds = SutrartStorage.layout();
        uint256 newMinNonce = ds.signedListingMinNonce[msg.sender] + 1;
        ds.signedListingMinNonce[msg.sender] = newMinNonce;
        emit ISutrartMarket.SignedListingNonceIncremented(msg.sender, newMinNonce);
    }

    function buySignedListing(
        ISutrartMarket.SignedListing memory listing,
        bytes calldata signature,
        address marketplaceFeeRecipient,
        uint96 marketplaceFeeBps
    ) external payable {
        SutrartStorage.enterNonReentrant();
        _buySignedListing(listing, signature, marketplaceFeeRecipient, marketplaceFeeBps);
        SutrartStorage.exitNonReentrant();
    }

    function _buySignedListing(
        ISutrartMarket.SignedListing memory listing,
        bytes calldata signature,
        address marketplaceFeeRecipient,
        uint96 marketplaceFeeBps
    ) private {
        require(SutrartValidation.isSignedListingValid(_toStorageListing(listing)), "Signed listing is not valid");
        require(msg.sender != listing.seller, "Seller cannot buy own listing");
        require(msg.value == listing.price, "Incorrect ETH amount");

        bytes32 structHash = _verifySignedListingSignature(listing, signature);

        SutrartStorage.layout().filledSignedListings[structHash] = true;

        ISutrartMarket.PayoutPreview memory payout = SutrartSettlement.executeSale(
            listing.seller,
            msg.sender,
            listing.nftContract,
            listing.tokenId,
            listing.price,
            marketplaceFeeRecipient,
            marketplaceFeeBps
        );

        emit ISutrartMarket.SignedListingFilled(
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

    function _verifySignedListingSignature(ISutrartMarket.SignedListing memory listing, bytes calldata signature)
        private
        view
        returns (bytes32 structHash)
    {
        structHash = LibSutrartEIP712.hashSignedListing(
            listing.seller, listing.nftContract, listing.tokenId, listing.price, listing.expiry, listing.nonce
        );
        address signer = LibSutrartEIP712.hashTypedData(structHash).recover(signature);
        require(signer == listing.seller, "Invalid signature");
    }

    function _toStorageListing(ISutrartMarket.SignedListing memory listing)
        private
        pure
        returns (SutrartStorage.SignedListing memory)
    {
        return SutrartStorage.SignedListing({
            seller: listing.seller,
            nftContract: listing.nftContract,
            tokenId: listing.tokenId,
            price: listing.price,
            expiry: listing.expiry,
            nonce: listing.nonce
        });
    }
}
