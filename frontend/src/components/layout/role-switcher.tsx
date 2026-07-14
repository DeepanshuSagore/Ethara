"use client";

import { ChevronsUpDown, UserCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLES, ROLE_DESCRIPTIONS, type Role } from "@/lib/constants";
import { useRole } from "@/lib/demo-role";

export function RoleSwitcher() {
  const { role, setRole } = useRole();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Accessible name comes from the visible "Viewing as {role}" text
            (label-in-name); default size matches the 40px theme toggle. */}
        <Button variant="outline" className="gap-2">
          <UserCircle2 className="text-primary" aria-hidden="true" />
          <span className="hidden sm:inline">Viewing as</span>
          <Badge variant="accent" className="px-2">
            {role}
          </Badge>
          <ChevronsUpDown className="text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Demo Mode: switch role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={role} onValueChange={(v) => setRole(v as Role)}>
          {ROLES.map((r) => (
            <DropdownMenuRadioItem key={r} value={r} className="items-start py-2">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{r}</span>
                <span className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
