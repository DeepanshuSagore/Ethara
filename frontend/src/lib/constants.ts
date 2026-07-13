import {
  BarChart3,
  FolderKanban,
  LayoutDashboard,
  Sofa,
  Sparkles,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

export const ROLES = ["Admin", "HR", "Project", "Employee"] as const;
export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = "Admin";

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Admin: "Full control over employees, seats & projects",
  HR: "Employee lifecycle & new-joiner allocation",
  Project: "Project membership & seat needs",
  Employee: "Self view & directory search",
};

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Employees", href: "/employees", icon: Users },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Seats", href: "/seats", icon: Sofa },
  { label: "New Joiners", href: "/new-joiners", icon: UserPlus },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Assistant", href: "/assistant", icon: Sparkles },
];
