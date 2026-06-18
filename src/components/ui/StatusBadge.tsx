import { archiveStatusMap, applicationStatusMap, userStatusMap, archiveLevelMap, dispatchStatusMap, returnStatusMap, shelfStatusMap } from "@/utils/statusMapper";
import type { ArchiveStatus, ApplicationStatus, UserStatus, ArchiveLevel, DispatchStatus, ReturnStatus, ShelfStatus } from "@/types";

type StatusType =
  | { kind: "archive"; value: ArchiveStatus }
  | { kind: "application"; value: ApplicationStatus }
  | { kind: "user"; value: UserStatus }
  | { kind: "level"; value: ArchiveLevel }
  | { kind: "dispatch"; value: DispatchStatus }
  | { kind: "return"; value: ReturnStatus }
  | { kind: "shelf"; value: ShelfStatus };

const maps = {
  archive: archiveStatusMap,
  application: applicationStatusMap,
  user: userStatusMap,
  level: archiveLevelMap,
  dispatch: dispatchStatusMap,
  return: returnStatusMap,
  shelf: shelfStatusMap,
} as const;

export default function StatusBadge({
  kind,
  value,
  pulse = false,
  className = "",
}: StatusType & { pulse?: boolean; className?: string }) {
  const map = maps[kind];
  const item = map[value];
  if (!item) return null;

  return (
    <span
      className={`badge border ${item.bgColor} ${item.color} ${pulse ? "animate-pulse-once" : ""} ${className}`}
    >
      {item.label}
    </span>
  );
}
