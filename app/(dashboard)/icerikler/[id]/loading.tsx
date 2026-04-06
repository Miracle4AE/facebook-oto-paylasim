import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ContentDetailLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="space-y-3">
        <Skeleton className="h-9 w-44 rounded-md" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="flex flex-col gap-6 border-b border-border/60 pb-6 lg:flex-row lg:justify-between">
        <div className="flex-1 space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-10 w-full max-w-2xl" />
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-8">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="aspect-video rounded-xl border border-border/40" />
          <Skeleton className="aspect-video rounded-xl border border-border/40" />
          <Skeleton className="hidden aspect-video rounded-xl border border-border/40 xl:block" />
        </div>
      </div>
    </div>
  );
}
