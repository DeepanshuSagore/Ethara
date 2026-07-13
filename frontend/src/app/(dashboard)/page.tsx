import { Armchair, CircleSlash, DoorOpen, Users, Wrench } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STATS = [
  { label: "Total Employees", value: "5,000", icon: Users, hint: "across 11 projects" },
  { label: "Total Seats", value: "5,600", icon: Armchair, hint: "5 floors · 10 zones" },
  { label: "Occupied", value: "4,950", icon: DoorOpen, hint: "88.4% utilization" },
  { label: "Available", value: "512", icon: CircleSlash, hint: "ready to allocate" },
  { label: "Reserved / Maintenance", value: "138", icon: Wrench, hint: "blocked from allocation" },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live overview of seats, occupancy and allocation across Ethara."
        actions={<Badge variant="outline">Preview — mock data lands in Phase 2</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {STATS.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-4 text-primary" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-metric text-3xl font-semibold">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project-wise allocation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3" aria-hidden="true">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Floor-wise occupancy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3" aria-hidden="true">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-4 w-9/12" />
            <Skeleton className="h-4 w-7/12" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
