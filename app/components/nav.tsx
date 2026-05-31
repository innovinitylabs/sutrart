"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { BrandAsset } from "@/components/brand";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/creator", label: "Creator" },
  { href: "/my-nfts", label: "My NFTs" },
  { href: "/marketplace", label: "Marketplace" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-border border-b">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 py-4">
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/" className="text-foreground hover:text-primary" aria-label="PARI home">
            <BrandAsset variant="wordmark" className="hidden md:block" />
            <BrandAsset variant="mark" className="md:hidden" />
          </Link>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium",
                pathname === link.href ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <ConnectButton />
      </div>
    </header>
  );
}
