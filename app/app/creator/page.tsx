import { CreatorPanel } from "@/components/creator-panel";
import { Nav } from "@/components/nav";

export default function CreatorPage() {
  return (
    <div>
      <Nav />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Creator</h1>
          <p className="text-muted-foreground text-sm">
            Deploy sovereign ERC721RT collections and mint from collections you own.
          </p>
        </div>
        <CreatorPanel />
      </main>
    </div>
  );
}
