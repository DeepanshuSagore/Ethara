"use client";

import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ROLES, roleCanAccess, type Role } from "@/lib/constants";
import { useRole } from "@/lib/demo-role";

/**
 * Deep-link guard for persona-gated pages: the sidebar already hides them,
 * this covers typed URLs and stale bookmarks. Children render only when the
 * current demo role may access `href`; everyone else gets a composed
 * explanation instead of a half-broken page.
 */
export function RoleGate({
  href,
  eyebrow,
  title,
  children,
}: {
  href: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  const { role } = useRole();
  if (roleCanAccess(role, href)) return <>{children}</>;

  const allowed = ROLES.filter((r: Role) => roleCanAccess(r, href));
  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description="This page is not part of the current view."
      />
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={Lock}
            title={`Not available in the ${role} view`}
            description={`Switch to the ${allowed.join(", ").replace(/, ([^,]+)$/, " or $1")} view from the top bar to open this page.`}
            action={
              <Button asChild variant="outline">
                <Link href="/">
                  <ArrowLeft /> Back to dashboard
                </Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    </>
  );
}
