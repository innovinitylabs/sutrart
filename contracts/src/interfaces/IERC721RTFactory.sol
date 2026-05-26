// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC721RTFactory {
    event CollectionCreated(
        address indexed creator,
        address indexed collection,
        string name,
        string symbol,
        address royaltyRecipient,
        uint96 royaltyBps
    );

    function createCollection(
        string calldata name,
        string calldata symbol,
        string calldata baseURI,
        string calldata contractURI,
        address royaltyRecipient,
        uint96 royaltyBps
    ) external returns (address collection);

    function getCreatorCollections(address creator) external view returns (address[] memory);

    function getCollectionCreator(address collection) external view returns (address);
}
