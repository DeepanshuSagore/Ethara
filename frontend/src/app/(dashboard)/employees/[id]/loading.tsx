import { DetailCardSkeleton, PageHeaderSkeleton } from "@/components/layout/skeletons";

/** Employee detail loading state — profile, seat and project cards. */
export default function EmployeeDetailLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading employee…</span>
      <PageHeaderSkeleton withAction />
      <div className="grid gap-4 lg:grid-cols-3">
        <DetailCardSkeleton fields={5} />
        <DetailCardSkeleton fields={3} />
        <DetailCardSkeleton fields={2} />
      </div>
    </div>
  );
}
