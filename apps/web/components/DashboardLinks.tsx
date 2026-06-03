import { LinkIncludingShortenedCollectionAndTags } from "@linkwarden/types/global";
import { CollectionIncludingMembersAndLinkCount } from "@linkwarden/types/global";
import LinkCard from "./LinkViews/LinkComponents/LinkCard";
import { useCollections } from "@linkwarden/router/collections";
import { useUser } from "@linkwarden/router/user";
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

  return (
    <div
      className={`flex gap-3 overflow-x-auto overflow-y-hidden hide-scrollbar w-full min-h-fit`}
    >
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
            <div key={i} className="min-w-64 w-64 sm:min-w-72 sm:w-72 md:min-w-80 md:w-80 h-full shrink-0">
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
              />
            </div>
          );
        })
      )}
    </div>
  );
}
