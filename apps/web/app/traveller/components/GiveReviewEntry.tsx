"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn, formatDate } from "@/lib/utils";
import { listingApi } from "@/lib/listing-api";
import { readLatestReviewContext, type LatestReviewContext } from "@/services/traveller";

interface GiveReviewEntryProps {
  listingId: string;
  listingName?: string;
  className?: string;
}

export function GiveReviewEntry({ listingId, listingName, className }: GiveReviewEntryProps) {
  const router = useRouter();
  const [context, setContext] = useState<LatestReviewContext | null>(null);

  useEffect(() => {
    setContext(readLatestReviewContext());
  }, [listingId]);

  const hasFutureContextCheckout = Boolean(
    context?.checkOutDate && new Date(context.checkOutDate).getTime() > Date.now(),
  );

  // Validate the actual booking from the backend to ensure:
  // 1. The booking status is 'completed'
  // 2. The checkout date has actually passed
  // 3. The booking has not already been reviewed
  const { data: booking, isLoading } = useQuery({
    queryKey: ["review-entry-booking", context?.bookingId],
    queryFn: async () => {
      if (!context?.bookingId) return null;
      try {
        const res = await listingApi.get(`/guests/me/bookings/${context.bookingId}`);
        return res.data?.data ?? null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(
      context?.bookingId &&
      context.listingId === listingId &&
      !hasFutureContextCheckout,
    ),
    staleTime: 30_000,
  });

  if (!context || context.listingId !== listingId) {
    return null;
  }

  // If the stored context checkout date is in the future, don't show the card
  if (hasFutureContextCheckout) {
    return null;
  }

  // While loading booking data, hide the card to prevent premature flashing
  if (isLoading || !booking) {
    return null;
  }

  // Reviews can only be submitted for bookings whose checkout date has passed and are completed
  if (booking.status !== "completed") {
    return null;
  }

  const checkoutRaw = booking.returnDatetime || booking.checkOut || context.checkOutDate;
  if (!checkoutRaw) {
    return null;
  }

  const checkoutTime = new Date(checkoutRaw).getTime();
  if (isNaN(checkoutTime) || Date.now() < checkoutTime) {
    return null;
  }

  // If already reviewed, do not show prompt again
  if (booking.hasReview) {
    return null;
  }

  const resolvedListingName = listingName ?? context.listingName ?? booking.listing?.title ?? "";
  const reviewUrl = `/traveller/reviews?bookingId=${encodeURIComponent(context.bookingId)}&listingId=${encodeURIComponent(listingId)}${resolvedListingName ? `&listingName=${encodeURIComponent(resolvedListingName)}` : ""}`;
  const displayCompletedDate = booking.completedAt || checkoutRaw;

  return (
    <Card
      padding="lg"
      className={cn(
        "border-emerald-200 bg-emerald-50/70 shadow-[0_12px_40px_rgba(16,185,129,0.08)]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <Star className="h-5 w-5 fill-current" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Ready to review</p>
              <h3 className="mt-1 text-sm font-bold text-slate-950">
                Share feedback for {resolvedListingName || "this listing"}
              </h3>
            </div>
            <Badge label="Eligible" variant="success" />
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Your most recent completed booking is ready for feedback. This link only appears for the stay you just finished.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span>Booking {context.bookingId.slice(0, 8).toUpperCase()}</span>
            <span>·</span>
            <span>Completed {formatDate(displayCompletedDate)}</span>
          </div>
          <Button variant="success" className="w-full sm:w-auto" onClick={() => router.push(reviewUrl)}>
            Leave a review
          </Button>
        </div>
      </div>
    </Card>
  );
}
