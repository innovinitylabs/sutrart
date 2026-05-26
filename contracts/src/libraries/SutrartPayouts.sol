// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC2981} from "openzeppelin-contracts/contracts/interfaces/IERC2981.sol";
import {IERC165} from "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";
import {ISutrartMarket} from "../interfaces/ISutrartMarket.sol";
import {SutrartStorage} from "./SutrartStorage.sol";

library SutrartPayouts {
    function computePayoutPreview(address nftContract, uint256 tokenId, uint256 grossPrice, uint96 marketplaceFeeBps)
        internal
        view
        returns (ISutrartMarket.PayoutPreview memory preview)
    {
        SutrartStorage.Layout storage ds = SutrartStorage.layout();

        preview.grossPrice = grossPrice;
        preview.protocolFee = (grossPrice * uint256(ds.protocolFeeBps)) / 10_000;
        require(marketplaceFeeBps <= SutrartStorage.MAX_MARKETPLACE_FEE_BPS, "Marketplace fee too high");
        preview.marketplaceFee = (grossPrice * uint256(marketplaceFeeBps)) / 10_000;

        uint256 remainingAfterFees = grossPrice - preview.protocolFee - preview.marketplaceFee;

        (preview.royaltyRecipient, preview.royaltyAmount) = lookupRoyalty(nftContract, tokenId, grossPrice);
        require(preview.royaltyAmount <= remainingAfterFees, "Royalty exceeds seller proceeds");

        uint256 royaltyPaid = royaltyPayoutAmount(preview.royaltyAmount, preview.royaltyRecipient);
        preview.sellerProceeds = remainingAfterFees - royaltyPaid;
    }

    function lookupRoyalty(address nftContract, uint256 tokenId, uint256 salePrice)
        internal
        view
        returns (address royaltyRecipient, uint256 royaltyAmount)
    {
        if (!supportsERC2981(nftContract)) {
            return (address(0), 0);
        }

        (royaltyRecipient, royaltyAmount) = IERC2981(nftContract).royaltyInfo(tokenId, salePrice);
    }

    function royaltyPayoutAmount(uint256 royaltyAmount, address royaltyRecipient) internal pure returns (uint256) {
        if (royaltyAmount == 0 || royaltyRecipient == address(0)) {
            return 0;
        }

        return royaltyAmount;
    }

    function supportsERC2981(address nftContract) internal view returns (bool) {
        if (nftContract.code.length == 0) {
            return false;
        }

        try IERC165(nftContract).supportsInterface(type(IERC2981).interfaceId) returns (bool supported) {
            return supported;
        } catch {
            return false;
        }
    }
}
