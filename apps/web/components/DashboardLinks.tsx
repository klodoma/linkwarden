import { LinkIncludingShortenedCollectionAndTags } from "@linkwarden/types/global";
import { CollectionIncludingMembersAndLinkCount } from "@linkwarden/types/global";
import { useEffect, useRef, useState } from "react";
import LinkCard from "./LinkViews/LinkComponents/LinkCard";
import { useCollections } from "@linkwarden/router/collections";
import { useUser } from "@linkwarden/router/user";
import { cn } from "@linkwarden/lib/utils";
import { useTranslation } from "next-i18next";

export function DashboardLinks({
  links,
  isLoading,
  type,
}: {
  links?: LinkIncludingShortenedCollectionAndTags[];
  isLoading?: boolean;
  type?: "collection" | "recent";
}) {
  const { data: collections = [] } = useCollections();
  const { data: user } = useUser();
  const { t } = useTranslation();

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;

    setShowLeftFade(el.scrollLeft > 0);
    setShowRightFade(el.scrollWidth - el.clientWidth - el.scrollLeft > 1);
  };

  useEffect(() => {
    updateScrollState();

    const observer = new ResizeObserver(updateScrollState);
    if (scrollRef.current) observer.observe(scrollRef.current);
    if (contentRef.current) observer.observe(contentRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative w-full min-h-fit">
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className={`flex overflow-x-auto overflow-y-hidden hide-scrollbar w-full min-h-fit isolate`}
      >
        <div ref={contentRef} className="flex gap-3 min-h-fit">
          {isLoading ? (
            <div className="flex flex-col gap-4 min-w-64 w-64 sm:min-w-72 sm:w-72 md:min-w-80 md:w-80 shrink-0">
              <div className="skeleton h-40 w-full"></div>
              <div className="skeleton h-3 w-2/3"></div>
              <div className="skeleton h-3 w-full"></div>
              <div className="skeleton h-3 w-full"></div>
              <div className="skeleton h-3 w-1/3"></div>
            </div>
          ) : (
            links?.map((e, i) => {
              const collection = collections.find(
                (c) => c.id === e.collection.id
              ) as CollectionIncludingMembersAndLinkCount;
              return (
                <div
                  key={i}
                  className="min-w-64 w-64 sm:min-w-72 sm:w-72 md:min-w-80 md:w-80 h-full shrink-0"
                >
                  <LinkCard
                    link={e}
                    collection={collection}
                    isPublicRoute={false}
                    t={t}
                    user={user}
                    disableDraggable={false}
                    isSelected={false}
                    toggleSelected={() => {}}
                    imageHeightClass=""
                    editMode={false}
                    draggableId={`${e.id}-${type}`}
                    dashboardType={type}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
      <div
        className={cn(
          "absolute left-0 inset-y-0 w-6 bg-gradient-to-r from-base-100 to-transparent pointer-events-none transition-opacity duration-200",
          showLeftFade ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        className={cn(
          "absolute right-0 inset-y-0 w-6 bg-gradient-to-l from-base-100 to-transparent pointer-events-none transition-opacity duration-200",
          showRightFade ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
