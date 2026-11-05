"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { ROUTES } from "@/config/routes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut } from "lucide-react";

export function UserMenu() {
  const { user, logout } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 p-0.5"
          aria-label="User navigation menu"
        >
          <Avatar className="h-8 w-8 cursor-pointer border border-border">
            <AvatarFallback>{getInitials(user?.fullName)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="font-normal px-2 py-1.5">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-foreground">
              {user?.fullName || "Student Account"}
            </p>
            <p className="text-xs leading-none text-bano-text-subtle font-mono truncate">
              {user?.email || "student@bano.ai"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ROUTES.PROFILE} className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4 text-bano-text-muted" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={ROUTES.SETTINGS} className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4 text-bano-text-muted" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          className="flex items-center gap-2 text-bano-danger focus:text-bano-danger focus:bg-bano-danger-soft cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
