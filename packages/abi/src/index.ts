import { pariMarketAbi } from "./generated/pariMarketAbi.js";
import { mockErc721Abi } from "./generated/mockErc721Abi.js";
import { erc721rtAbi } from "./generated/erc721rtAbi.js";
import { erc721rtFactoryAbi } from "./generated/erc721rtFactoryAbi.js";

export { pariMarketAbi, mockErc721Abi, erc721rtAbi, erc721rtFactoryAbi };

export const abis = {
  PariMarket: pariMarketAbi,
  MockERC721: mockErc721Abi,
  ERC721RT: erc721rtAbi,
  ERC721RTFactory: erc721rtFactoryAbi,
} as const;
