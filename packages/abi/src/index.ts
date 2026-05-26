import { sutrartMarketAbi } from "./generated/sutrartMarketAbi";
import { mockErc721Abi } from "./generated/mockErc721Abi";

export { sutrartMarketAbi, mockErc721Abi };

export const abis = {
  SutrartMarket: sutrartMarketAbi,
  MockERC721: mockErc721Abi,
} as const;
