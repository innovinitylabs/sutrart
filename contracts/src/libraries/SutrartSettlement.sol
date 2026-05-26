// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {ISutrartMarket} from "../interfaces/ISutrartMarket.sol";
import {SutrartPayouts} from "./SutrartPayouts.sol";
import {SutrartStorage} from "./SutrartStorage.sol";

library SutrartSettlement {
    function executeSale(
        address seller,
        address buyer,
        address nftContract,
        uint256 tokenId,
        uint256 price,
        address marketplaceFeeRecipient,
        uint96 marketplaceFeeBps
    ) internal returns (ISutrartMarket.PayoutPreview memory payout) {
        SutrartStorage.Layout storage ds = SutrartStorage.layout();

        payout = SutrartPayouts.computePayoutPreview(nftContract, tokenId, price, marketplaceFeeBps);

        if (payout.marketplaceFee > 0) {
            require(marketplaceFeeRecipient != address(0), "Marketplace fee recipient is zero");
        }

        IERC721(nftContract).safeTransferFrom(seller, buyer, tokenId);

        if (payout.protocolFee > 0) {
            require(ds.protocolTreasury != address(0), "Protocol treasury not set");
            (bool sentProtocolFee,) = payable(ds.protocolTreasury).call{value: payout.protocolFee}("");
            require(sentProtocolFee, "Protocol fee transfer failed");
        }

        if (payout.marketplaceFee > 0) {
            (bool sentMarketplaceFee,) = payable(marketplaceFeeRecipient).call{value: payout.marketplaceFee}("");
            require(sentMarketplaceFee, "Marketplace fee transfer failed");
        }

        uint256 royaltyPaid = SutrartPayouts.royaltyPayoutAmount(payout.royaltyAmount, payout.royaltyRecipient);
        if (royaltyPaid > 0) {
            (bool sentRoyalty,) = payable(payout.royaltyRecipient).call{value: royaltyPaid}("");
            require(sentRoyalty, "Royalty transfer failed");
        }

        (bool sentSeller,) = payable(seller).call{value: payout.sellerProceeds}("");
        require(sentSeller, "ETH transfer failed");
    }
}
