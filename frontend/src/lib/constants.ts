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

/** Building layout the backend seeds: 5 floors × zones A/B (PROJECT_PLAN §5b). */
export const FLOORS = [1, 2, 3, 4, 5] as const;
export const ZONES = ["A", "B"] as const;

/** Departments the seeder draws from — options for filters and the joiner form. */
export const DEPARTMENTS = [
  "Data & AI",
  "Design",
  "DevOps",
  "Engineering",
  "Operations",
  "People",
  "Product",
  "Quality",
] as const;

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
