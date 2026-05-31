import { MyNftsPanel } from "@/components/my-nfts-panel";
import { Nav } from "@/components/nav";

export default function MyNftsPage() {
  return (
    <div>
      <Nav />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">My NFTs</h1>
          <p className="text-muted-foreground text-sm">
            Mint, approve, and list NFTs on the local PARI market.
          </p>
        </div>
        <MyNftsPanel />
      </main>
    </div>
  );
}
