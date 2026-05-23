//components\header.jsx
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { checkUser } from "@/lib/checkUser";
import SpendsenseTriggerClient from "@/app/(main)/dashboard/_components/spendsense-trigger-client";

import { LayoutDashboard, PenBox, Menu, Gamepad, Activity } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./ui/dropdown-menu";
import SpendsenseMobileTrigger from "@/app/(main)/dashboard/_components/spendsense-mobile-trigger-client";
const Header = async () => {
  await checkUser();

  return (
    <div className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo (unchanged from your original) */}
        <Link href="/dashboard"> <Image src={"/logo-3.png"} alt="insightivia logo" height={60} width={200} className="h-12 w-auto object-contain" /> </Link>
        {/* Right side: keep structure, only UI changes */}
        <div className="flex items-center space-x-4">
          <SignedIn>
           {/* Desktop: cleaner hierarchy */}
          <div className="hidden md:flex items-center gap-3">
            {/* Dashboard - secondary action */}
            <Link href="/dashboard">
              <Button variant="outline" className="flex items-center gap-2">
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </Button>
            </Link>

            {/* Add Transaction - primary action */}
            <Link href="/transaction/create">
              <Button className="flex items-center gap-2 bg-black text-white hover:bg-gray-800">
                <PenBox size={18} />
                <span>Add Transaction</span>
              </Button>
            </Link>

            {/* Divider between CTAs and features */}
            <div className="w-px h-6 bg-gray-200 mx-2" />

          </div>


            {/* Mobile: collapse actions into a single dropdown */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Open menu">
                    <Menu size={18} />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center gap-2">
                      <LayoutDashboard size={16} />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href="/transaction/create" className="flex items-center gap-2">
                      <PenBox size={16} />
                      <span>Add Transaction</span>
                    </Link>
                  </DropdownMenuItem>

                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            
          </SignedIn>

          {/* Auth (unchanged) */}
          <SignedOut>
            <SignInButton forceRedirectUrl="/dashboard">
              <Button variant="outline">Login</Button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                },
              }}
            />
          </SignedIn>
        </div>
      </nav>
    </div>
  );
};
export default Header;