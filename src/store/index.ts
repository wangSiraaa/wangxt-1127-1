import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  User,
  Archive,
  Shelf,
  Application,
  DispatchOrder,
  ReturnRecord,
  OverdueRecord,
  InventoryTask,
  ArchiveLevel,
  ReadingSeat,
  AbnormalCheckRecord,
  SecretReviewRecord,
  ApplicationPriority,
  SplitRecord,
  ReturnCheckItem,
} from "@/types";
import {
  isSecretLevel,
  needsSecondReview,
  SECRET_LEVEL_RANK,
} from "@/types";
import {
  generateId,
  addDays,
  daysBetween,
  isOverdue as checkIsOverdue,
} from "@/utils/dateUtils";
import {
  canCreateApplication,
  canDispatchApplication,
  canApproveApplication,
  splitBatchApplication,
  validateReturnCheckItems,
  getPriorityRank,
  type SplitResult,
} from "@/utils/businessRules";
import {
  mockUsers,
  mockArchives,
  mockShelves,
  mockApplications,
  mockDispatchOrders,
  mockReturnRecords,
  mockOverdueRecords,
  mockInventoryTasks,
  mockReadingSeats,
  mockAbnormalChecks,
} from "./mockData";

interface AppStore {
  users: User[];
  currentUserId: string;
  archives: Archive[];
  shelves: Shelf[];
  applications: Application[];
  dispatchOrders: DispatchOrder[];
  returnRecords: ReturnRecord[];
  overdueRecords: OverdueRecord[];
  inventoryTasks: InventoryTask[];
  readingSeats: ReadingSeat[];
  abnormalChecks: AbnormalCheckRecord[];

  // Users
  getCurrentUser: () => User | undefined;
  setCurrentUser: (id: string) => void;
  suspendUser: (userId: string, preserveApproved?: boolean) => void;
  restoreUser: (userId: string) => void;
  getUserById: (id: string) => User | undefined;

  // Archives
  getArchiveById: (id: string) => Archive | undefined;
  getArchivesByShelf: (shelfId: string) => Archive[];
  updateArchiveStatus: (id: string, status: Archive["status"]) => void;
  searchArchives: (keyword: string, level?: ArchiveLevel) => Archive[];

  // Shelves
  getShelfById: (id: string) => Shelf | undefined;
  setShelfStatus: (id: string, status: Shelf["status"]) => void;
  isShelfAvailable: (shelfId: string) => boolean;

  // Reading Seats
  getAvailableSeats: (
    maxLevel: ArchiveLevel
  ) => ReadingSeat[];
  assignSeat: (
    seatId: string,
    applicationId: string,
    readerId: string
  ) => void;
  releaseSeat: (seatId: string) => void;

  // Applications
  getApplicationById: (id: string) => Application | undefined;
  getApplicationsByUser: (userId: string) => Application[];
  getApplicationsByGroup: (groupId: string) => Application[];
  createBatchApplication: (data: {
    user_id: string;
    archive_ids: string[];
    reason: string;
    expect_read_time: string;
    priority?: ApplicationPriority;
  }) => {
    success: boolean;
    message: string;
    ids?: string[];
    splitResult?: SplitResult;
  };
  createApplication: (data: {
    user_id: string;
    archive_id: string;
    reason: string;
    expect_read_time: string;
    priority?: ApplicationPriority;
  }) => { success: boolean; message: string; id?: string };
  approveApplication: (
    id: string,
    approverId: string,
    opinion: string
  ) => void;
  rejectApplication: (
    id: string,
    approverId: string,
    opinion: string
  ) => void;
  cancelApplication: (id: string) => void;
  suspendApplication: (id: string, reason: string) => void;
  resumeApplication: (id: string) => void;

  // Secret Review
  addSecretReview: (
    applicationId: string,
    reviewerId: string,
    isSecondReview: boolean,
    result: "pass" | "reject" | "pending",
    opinion?: string
  ) => void;

  // Dispatch
  getDispatchByApplication: (appId: string) => DispatchOrder | undefined;
  createDispatch: (
    applicationId: string,
    staffId: string
  ) => { success: boolean; message: string; shouldSuspend?: boolean };
  createBatchDispatch: (
    applicationIds: string[],
    staffId: string
  ) => {
    success: boolean;
    message: string;
    dispatched: string[];
    suspended: string[];
    failed: { id: string; reason: string }[];
  };
  confirmOutbound: (dispatchId: string) => void;

  // Return
  getReturnByApplication: (appId: string) => ReturnRecord | undefined;
  getAbnormalCheckById: (id: string) => AbnormalCheckRecord | undefined;
  confirmReceive: (
    applicationId: string,
    readerId: string,
    seatNo: string
  ) => void;
  startReading: (returnRecordId: string) => void;
  endReading: (returnRecordId: string) => void;
  submitReturnCheck: (
    returnRecordId: string,
    checkItems: ReturnCheckItem[]
  ) => { success: boolean; message: string; hasAbnormal: boolean };
  confirmReturn: (returnRecordId: string) => void;
  createAbnormalCheck: (
    returnRecordId: string,
    handlerId: string,
    abnormalItems: ReturnCheckItem[],
    initialOpinion: string
  ) => string;
  handleAbnormalCheck: (
    checkId: string,
    result: "resolved" | "pending" | "escalated",
    opinion: string
  ) => void;
  resolveAbnormalAndReturn: (
    returnRecordId: string,
    checkId: string,
    opinion: string
  ) => void;

  // Overdue
  checkOverdue: () => void;
  resolveOverdue: (overdueId: string) => void;

  // Inventory
  getInventoryByShelf: (shelfId: string) => InventoryTask | undefined;
  startInventory: (
    shelfId: string,
    staffId: string,
    remark?: string,
    zone?: string
  ) => void;
  endInventory: (inventoryId: string) => void;

  // Reset
  resetAll: () => void;
}

const createInitialState = () => ({
  users: [...mockUsers],
  currentUserId: "u001",
  archives: JSON.parse(JSON.stringify(mockArchives)),
  shelves: JSON.parse(JSON.stringify(mockShelves)),
  applications: JSON.parse(JSON.stringify(mockApplications)),
  dispatchOrders: JSON.parse(JSON.stringify(mockDispatchOrders)),
  returnRecords: JSON.parse(JSON.stringify(mockReturnRecords)),
  overdueRecords: JSON.parse(JSON.stringify(mockOverdueRecords)),
  inventoryTasks: JSON.parse(JSON.stringify(mockInventoryTasks)),
  readingSeats: JSON.parse(JSON.stringify(mockReadingSeats)),
  abnormalChecks: JSON.parse(JSON.stringify(mockAbnormalChecks)),
});

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      getCurrentUser: () =>
        get().users.find((u) => u.id === get().currentUserId),
      setCurrentUser: (id) => set({ currentUserId: id }),
      suspendUser: (userId, preserveApproved = true) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId ? { ...u, status: "suspended" } : u
          ),
        }));
        if (!preserveApproved) {
          set((state) => ({
            applications: state.applications.map((a) =>
              a.user_id === userId &&
              ["pending_approval", "approved"].includes(a.status)
                ? { ...a, status: "cancelled" }
                : a
            ),
          }));
        }
      },
      restoreUser: (userId) =>
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId ? { ...u, status: "normal" } : u
          ),
        })),
      getUserById: (id) => get().users.find((u) => u.id === id),

      getArchiveById: (id) => get().archives.find((a) => a.id === id),
      getArchivesByShelf: (shelfId) =>
        get().archives.filter((a) => a.shelf_id === shelfId),
      updateArchiveStatus: (id, status) =>
        set((state) => ({
          archives: state.archives.map((a) =>
            a.id === id ? { ...a, status } : a
          ),
        })),
      searchArchives: (keyword, level) => {
        return get().archives.filter((a) => {
          const matchKeyword =
            !keyword ||
            a.title.includes(keyword) ||
            a.code.includes(keyword) ||
            a.category.includes(keyword);
          const matchLevel = !level || a.level === level;
          return matchKeyword && matchLevel;
        });
      },

      getShelfById: (id) => get().shelves.find((s) => s.id === id),
      setShelfStatus: (id, status) =>
        set((state) => ({
          shelves: state.shelves.map((s) =>
            s.id === id ? { ...s, status } : s
          ),
        })),
      isShelfAvailable: (shelfId) => {
        const shelf = get().getShelfById(shelfId);
        return shelf?.status === "normal";
      },

      getAvailableSeats: (maxLevel) => {
        const minRank = SECRET_LEVEL_RANK[maxLevel];
        return get().readingSeats.filter(
          (s) =>
            s.status === "available" &&
            SECRET_LEVEL_RANK[s.max_secret_level] >= minRank
        );
      },
      assignSeat: (seatId, applicationId, readerId) =>
        set((state) => ({
          readingSeats: state.readingSeats.map((s) =>
            s.id === seatId
              ? {
                  ...s,
                  status: "occupied",
                  current_application_id: applicationId,
                  reader_id: readerId,
                }
              : s
          ),
        })),
      releaseSeat: (seatId) =>
        set((state) => ({
          readingSeats: state.readingSeats.map((s) =>
            s.id === seatId
              ? {
                  ...s,
                  status: "available",
                  current_application_id: undefined,
                  reader_id: undefined,
                }
              : s
          ),
        })),

      getApplicationById: (id) =>
        get().applications.find((a) => a.id === id),
      getApplicationsByUser: (userId) =>
        get().applications.filter((a) => a.user_id === userId),
      getApplicationsByGroup: (groupId) =>
        get().applications.filter((a) => a.group_id === groupId),

      createBatchApplication: (data) => {
        const state = get();
        const user = state.getUserById(data.user_id);
        const selectedArchives = data.archive_ids
          .map((id) => state.getArchiveById(id))
          .filter((a): a is Archive => !!a);

        const check = canCreateApplication(
          user,
          selectedArchives,
          true
        );
        if (!check.success)
          return { success: false, message: check.message };

        const priority: ApplicationPriority = data.priority || "normal";
        const splitResult = splitBatchApplication(selectedArchives, priority);
        const groupId = generateId("grp");
        const createdIds: string[] = [];
        const newApplications: Application[] = [];

        splitResult.groups.forEach((group, gIdx) => {
          group.archiveIds.forEach((arcId, aIdx) => {
            const arc = state.getArchiveById(arcId)!;
            const splitRecord: SplitRecord = {
              id: generateId("spl"),
              parent_application_id: groupId,
              split_reason: group.reason,
              split_detail: group.detail,
              split_time: new Date().toISOString(),
            };

            const app: Application = {
              id: generateId("app"),
              user_id: data.user_id,
              archive_id: arcId,
              reason: data.reason,
              apply_time: new Date().toISOString(),
              expect_read_time: data.expect_read_time,
              status:
                isSecretLevel(arc.level) || needsSecondReview(arc.level)
                  ? "pending_approval"
                  : "approved",
              priority: group.priority,
              group_id: gIdx === 0 && aIdx === 0 ? groupId : groupId,
              split_record: splitRecord,
              need_secret_review: isSecretLevel(arc.level),
              second_review_required: needsSecondReview(arc.level),
            };

            if (app.status === "approved") {
              app.approval_id = "auto";
              app.approval_opinion = "非涉密档案自动批准";
              app.approval_time = new Date().toISOString();
            }

            createdIds.push(app.id);
            newApplications.push(app);
          });
        });

        set((s) => ({
          applications: [...newApplications, ...s.applications],
        }));

        return {
          success: true,
          message: `批量申请提交成功，共创建 ${createdIds.length} 条调卷任务${splitResult.warnings.length ? "，存在拆分提示" : ""}`,
          ids: createdIds,
          splitResult,
        };
      },

      createApplication: (data) => {
        const res = get().createBatchApplication({
          ...data,
          archive_ids: [data.archive_id],
          priority: data.priority || "normal",
        });
        return {
          success: res.success,
          message: res.message,
          id: res.ids?.[0],
        };
      },

      approveApplication: (id, approverId, opinion) => {
        const app = get().getApplicationById(id);
        if (!app || app.status !== "pending_approval") return;
        const approvalCheck = canApproveApplication(app);
        if (!approvalCheck.success) return;

        set((state) => ({
          applications: state.applications.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: "approved",
                  approval_id: approverId,
                  approval_opinion: opinion,
                  approval_time: new Date().toISOString(),
                }
              : a
          ),
        }));
      },

      rejectApplication: (id, approverId, opinion) => {
        const app = get().getApplicationById(id);
        if (!app || app.status !== "pending_approval") return;
        set((state) => ({
          applications: state.applications.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: "rejected",
                  approval_id: approverId,
                  approval_opinion: opinion,
                  approval_time: new Date().toISOString(),
                }
              : a
          ),
        }));
      },

      cancelApplication: (id) =>
        set((state) => ({
          applications: state.applications.map((a) =>
            a.id === id &&
            ["pending_approval", "approved", "suspended"].includes(a.status)
              ? { ...a, status: "cancelled" }
              : a
          ),
        })),

      suspendApplication: (id, reason) =>
        set((state) => ({
          applications: state.applications.map((a) =>
            a.id === id && a.status === "approved"
              ? {
                  ...a,
                  status: "suspended",
                  suspend_reason: reason,
                  suspend_time: new Date().toISOString(),
                }
              : a
          ),
        })),

      resumeApplication: (id) =>
        set((state) => ({
          applications: state.applications.map((a) =>
            a.id === id && a.status === "suspended"
              ? {
                  ...a,
                  status: "approved",
                  suspend_reason: undefined,
                  suspend_time: undefined,
                }
              : a
          ),
        })),

      addSecretReview: (applicationId, reviewerId, isSecondReview, result, opinion) => {
        const review: SecretReviewRecord = {
          id: generateId("sr"),
          application_id: applicationId,
          reviewer_id: reviewerId,
          review_result: result,
          review_opinion: opinion,
          review_time: new Date().toISOString(),
          is_second_review: isSecondReview,
        };
        set((state) => ({
          applications: state.applications.map((a) => {
            if (a.id !== applicationId) return a;
            const existing = a.secret_reviews || [];
            const filtered = existing.filter(
              (r) => !(r.is_second_review === isSecondReview)
            );
            return { ...a, secret_reviews: [...filtered, review] };
          }),
        }));
      },

      getDispatchByApplication: (appId) =>
        get().dispatchOrders.find((d) => d.application_id === appId),

      createDispatch: (applicationId, staffId) => {
        const state = get();
        const app = state.getApplicationById(applicationId);
        const archive = app
          ? state.getArchiveById(app.archive_id)
          : undefined;
        const shelf = archive
          ? state.getShelfById(archive.shelf_id)
          : undefined;

        const check = canDispatchApplication(app, archive, shelf);
        if (!check.success) {
          if (check.shouldSuspend && app) {
            state.suspendApplication(app.id, check.suspendReason || "");
            return {
              success: false,
              message: check.message + "，已自动挂起并保留优先级",
              shouldSuspend: true,
            };
          }
          return { success: false, message: check.message };
        }

        const dispatch: DispatchOrder = {
          id: generateId("dis"),
          application_id: applicationId,
          shelf_id: archive!.shelf_id,
          staff_id: staffId,
          dispatch_time: new Date().toISOString(),
          status: "pending",
        };

        set((s) => ({
          dispatchOrders: [dispatch, ...s.dispatchOrders],
          applications: s.applications.map((a) =>
            a.id === applicationId ? { ...a, status: "dispatching" } : a
          ),
        }));
        return { success: true, message: "派单成功" };
      },

      createBatchDispatch: (applicationIds, staffId) => {
        const dispatched: string[] = [];
        const suspended: string[] = [];
        const failed: { id: string; reason: string }[] = [];
        const batchId = generateId("bat");

        const sortedApps = applicationIds
          .map((id) => get().getApplicationById(id))
          .filter((a): a is Application => !!a)
          .sort(
            (a, b) => getPriorityRank(b.priority) - getPriorityRank(a.priority)
          );

        const newDispatches: DispatchOrder[] = [];
        const appStatusUpdates: Map<string, Application["status"]> = new Map();

        for (const app of sortedApps) {
          const archive = get().getArchiveById(app.archive_id);
          const shelf = archive
            ? get().getShelfById(archive.shelf_id)
            : undefined;
          const check = canDispatchApplication(app, archive, shelf);

          if (!check.success) {
            if (check.shouldSuspend) {
              appStatusUpdates.set(app.id, "suspended");
              suspended.push(app.id);
            } else {
              failed.push({ id: app.id, reason: check.message });
            }
            continue;
          }

          const dispatch: DispatchOrder = {
            id: generateId("dis"),
            application_id: app.id,
            shelf_id: archive!.shelf_id,
            staff_id: staffId,
            dispatch_time: new Date().toISOString(),
            status: "pending",
            batch_id: batchId,
          };
          newDispatches.push(dispatch);
          appStatusUpdates.set(app.id, "dispatching");
          dispatched.push(app.id);
        }

        set((s) => ({
          dispatchOrders: [...newDispatches, ...s.dispatchOrders],
          applications: s.applications.map((a) => {
            const newStatus = appStatusUpdates.get(a.id);
            if (!newStatus) return a;
            const updates: Partial<Application> = { status: newStatus };
            if (newStatus === "suspended") {
              const archive = s.archives.find(
                (ar) => ar.id === a.archive_id
              );
              const shelf = archive
                ? s.shelves.find((sh) => sh.id === archive.shelf_id)
                : undefined;
              updates.suspend_reason = shelf
                ? `架位 ${shelf.code} 盘点中，已自动挂起`
                : "已挂起";
              updates.suspend_time = new Date().toISOString();
            }
            return { ...a, ...updates };
          }),
        }));

        let message = `批量派单完成`;
        if (dispatched.length)
          message += `，成功派单 ${dispatched.length} 份`;
        if (suspended.length)
          message += `，${suspended.length} 份因架位盘点已挂起并保留优先级`;
        if (failed.length) message += `，${failed.length} 份失败`;

        return { success: true, message, dispatched, suspended, failed };
      },

      confirmOutbound: (dispatchId) => {
        const state = get();
        const dispatch = state.dispatchOrders.find(
          (d) => d.id === dispatchId
        );
        if (!dispatch || dispatch.status !== "pending") return;

        const app = state.getApplicationById(dispatch.application_id);
        if (app) {
          state.updateArchiveStatus(app.archive_id, "dispatched");
        }

        set((s) => ({
          dispatchOrders: s.dispatchOrders.map((d) =>
            d.id === dispatchId
              ? {
                  ...d,
                  status: "outbound",
                  outbound_time: new Date().toISOString(),
                }
              : d
          ),
        }));
      },

      getReturnByApplication: (appId) =>
        get().returnRecords.find((r) => r.application_id === appId),
      getAbnormalCheckById: (id) =>
        get().abnormalChecks.find((c) => c.id === id),

      confirmReceive: (applicationId, readerId, seatNo) => {
        const state = get();
        const app = state.getApplicationById(applicationId);
        if (!app) return;

        const seat = state.readingSeats.find((s) => s.seat_no === seatNo);
        if (seat && seat.status === "available") {
          state.assignSeat(seat.id, applicationId, readerId);
        }

        const record: ReturnRecord = {
          id: generateId("ret"),
          application_id: applicationId,
          reader_id: readerId,
          receive_time: new Date().toISOString(),
          status: "received",
          due_time: app.expect_read_time,
          seat_no: seatNo,
        };

        state.updateArchiveStatus(app.archive_id, "reading");

        set((s) => ({
          returnRecords: [record, ...s.returnRecords],
          applications: s.applications.map((a) =>
            a.id === applicationId ? { ...a, status: "reading" } : a
          ),
        }));
      },

      startReading: (returnRecordId) =>
        set((state) => ({
          returnRecords: state.returnRecords.map((r) =>
            r.id === returnRecordId && r.status === "received"
              ? {
                  ...r,
                  status: "reading",
                  start_read_time: new Date().toISOString(),
                }
              : r
          ),
        })),

      endReading: (returnRecordId) =>
        set((state) => ({
          returnRecords: state.returnRecords.map((r) =>
            r.id === returnRecordId && r.status === "reading"
              ? { ...r, end_read_time: new Date().toISOString() }
              : r
          ),
        })),

      submitReturnCheck: (returnRecordId, checkItems) => {
        const validate = validateReturnCheckItems(checkItems);

        set((s) => ({
          returnRecords: s.returnRecords.map((r) =>
            r.id === returnRecordId
              ? {
                  ...r,
                  check_items: checkItems,
                  status: validate.hasAbnormal ? "abnormal_check" : r.status,
                }
              : r
          ),
        }));

        return {
          success: true,
          message: validate.message,
          hasAbnormal: validate.hasAbnormal,
        };
      },

      confirmReturn: (returnRecordId) => {
        const state = get();
        const record = state.returnRecords.find(
          (r) => r.id === returnRecordId
        );
        if (!record) return;

        const app = state.getApplicationById(record.application_id);
        if (app) {
          state.updateArchiveStatus(app.archive_id, "in_shelf");
        }

        if (record.seat_no) {
          const seat = state.readingSeats.find(
            (s) => s.seat_no === record.seat_no
          );
          if (seat) state.releaseSeat(seat.id);
        }

        set((s) => ({
          returnRecords: s.returnRecords.map((r) =>
            r.id === returnRecordId
              ? {
                  ...r,
                  status: "returned",
                  return_time: new Date().toISOString(),
                  end_read_time: r.end_read_time || new Date().toISOString(),
                }
              : r
          ),
          applications: s.applications.map((a) =>
            a.id === record.application_id ? { ...a, status: "completed" } : a
          ),
        }));
      },

      createAbnormalCheck: (returnRecordId, handlerId, abnormalItems, initialOpinion) => {
        const check: AbnormalCheckRecord = {
          id: generateId("abn"),
          return_record_id: returnRecordId,
          check_items: abnormalItems,
          handler_id: handlerId,
          handle_result: "pending",
          handle_opinion: initialOpinion,
        };
        set((s) => ({
          abnormalChecks: [check, ...s.abnormalChecks],
          returnRecords: s.returnRecords.map((r) =>
            r.id === returnRecordId
              ? {
                  ...r,
                  status: "abnormal_check",
                  abnormal_check_record_id: check.id,
                }
              : r
          ),
        }));
        return check.id;
      },

      handleAbnormalCheck: (checkId, result, opinion) =>
        set((s) => ({
          abnormalChecks: s.abnormalChecks.map((c) =>
            c.id === checkId
              ? {
                  ...c,
                  handle_result: result,
                  handle_opinion: opinion,
                  handle_time: new Date().toISOString(),
                }
              : c
          ),
        })),

      resolveAbnormalAndReturn: (returnRecordId, checkId, opinion) => {
        const state = get();
        state.handleAbnormalCheck(checkId, "resolved", opinion);
        state.confirmReturn(returnRecordId);
      },

      checkOverdue: () => {
        const state = get();
        const now = new Date();
        state.returnRecords.forEach((r) => {
          if (r.status === "returned") return;
          if (!checkIsOverdue(r.due_time)) return;

          const app = state.getApplicationById(r.application_id);
          if (!app) return;

          const existing = state.overdueRecords.find(
            (o) => o.application_id === r.application_id && o.status === "active"
          );
          if (existing) return;

          const overdueDays = daysBetween(r.due_time, now);
          const ovd: OverdueRecord = {
            id: generateId("ovd"),
            user_id: app.user_id,
            application_id: r.application_id,
            overdue_days: overdueDays,
            record_time: now.toISOString(),
            status: "active",
            preserve_approved: true,
          };

          state.updateArchiveStatus(app.archive_id, "overdue");
          set((s) => ({ overdueRecords: [ovd, ...s.overdueRecords] }));
          state.suspendUser(app.user_id, true);
        });
      },

      resolveOverdue: (overdueId) => {
        const state = get();
        const ovd = state.overdueRecords.find((o) => o.id === overdueId);
        if (!ovd || ovd.status !== "active") return;

        const userActiveOverdue = state.overdueRecords.filter(
          (o) =>
            o.user_id === ovd.user_id &&
            o.status === "active" &&
            o.id !== overdueId
        );
        if (userActiveOverdue.length === 0) {
          state.restoreUser(ovd.user_id);
        }

        set((s) => ({
          overdueRecords: s.overdueRecords.map((o) =>
            o.id === overdueId
              ? {
                  ...o,
                  status: "resolved",
                  resolve_time: new Date().toISOString(),
                }
              : o
          ),
        }));
      },

      getInventoryByShelf: (shelfId) =>
        get().inventoryTasks.find(
          (t) => t.shelf_id === shelfId && t.status === "ongoing"
        ),

      startInventory: (shelfId, staffId, remark, zone) => {
        const state = get();
        const existing = state.getInventoryByShelf(shelfId);
        if (existing) return;
        const task: InventoryTask = {
          id: generateId("inv"),
          shelf_id: shelfId,
          staff_id: staffId,
          start_time: new Date().toISOString(),
          status: "ongoing",
          remark,
          affected_zone: zone,
        };
        state.setShelfStatus(shelfId, "inventory");
        set((s) => ({ inventoryTasks: [task, ...s.inventoryTasks] }));
      },

      endInventory: (inventoryId) => {
        const state = get();
        const task = state.inventoryTasks.find((t) => t.id === inventoryId);
        if (!task || task.status !== "ongoing") return;
        state.setShelfStatus(task.shelf_id, "normal");

        const suspendedApps = state.applications.filter(
          (a) =>
            a.status === "suspended" &&
            a.suspend_reason?.includes(
              state.getShelfById(task.shelf_id)?.code || ""
            )
        );
        suspendedApps.forEach((a) => state.resumeApplication(a.id));

        set((s) => ({
          inventoryTasks: s.inventoryTasks.map((t) =>
            t.id === inventoryId
              ? { ...t, status: "completed", end_time: new Date().toISOString() }
              : t
          ),
        }));
      },

      resetAll: () => set(createInitialState()),
    }),
    {
      name: "archives-compact-racking-store",
      partialize: (state) => ({
        users: state.users,
        currentUserId: state.currentUserId,
        archives: state.archives,
        shelves: state.shelves,
        applications: state.applications,
        dispatchOrders: state.dispatchOrders,
        returnRecords: state.returnRecords,
        overdueRecords: state.overdueRecords,
        inventoryTasks: state.inventoryTasks,
        readingSeats: state.readingSeats,
        abnormalChecks: state.abnormalChecks,
      }),
    }
  )
);
