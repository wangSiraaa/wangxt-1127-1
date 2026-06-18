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
} from "@/types";
import { isSecretLevel } from "@/types";
import { generateId, addDays, daysBetween, isOverdue as checkIsOverdue } from "@/utils/dateUtils";
import {
  canCreateApplication,
  canDispatchApplication,
  canApproveApplication,
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

  // Users
  getCurrentUser: () => User | undefined;
  setCurrentUser: (id: string) => void;
  suspendUser: (userId: string) => void;
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

  // Applications
  getApplicationById: (id: string) => Application | undefined;
  getApplicationsByUser: (userId: string) => Application[];
  createApplication: (data: {
    user_id: string;
    archive_id: string;
    reason: string;
    expect_read_time: string;
  }) => { success: boolean; message: string; id?: string };
  approveApplication: (id: string, approverId: string, opinion: string) => void;
  rejectApplication: (id: string, approverId: string, opinion: string) => void;
  cancelApplication: (id: string) => void;

  // Dispatch
  getDispatchByApplication: (appId: string) => DispatchOrder | undefined;
  createDispatch: (applicationId: string, staffId: string) => { success: boolean; message: string };
  confirmOutbound: (dispatchId: string) => void;

  // Return
  getReturnByApplication: (appId: string) => ReturnRecord | undefined;
  confirmReceive: (applicationId: string, readerId: string, seatNo: string) => void;
  startReading: (returnRecordId: string) => void;
  endReading: (returnRecordId: string) => void;
  confirmReturn: (returnRecordId: string) => void;

  // Overdue
  checkOverdue: () => void;
  resolveOverdue: (overdueId: string) => void;

  // Inventory
  getInventoryByShelf: (shelfId: string) => InventoryTask | undefined;
  startInventory: (shelfId: string, staffId: string, remark?: string) => void;
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
});

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      getCurrentUser: () => get().users.find((u) => u.id === get().currentUserId),
      setCurrentUser: (id) => set({ currentUserId: id }),
      suspendUser: (userId) =>
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId ? { ...u, status: "suspended" } : u
          ),
        })),
      restoreUser: (userId) =>
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId ? { ...u, status: "normal" } : u
          ),
        })),
      getUserById: (id) => get().users.find((u) => u.id === id),

      getArchiveById: (id) => get().archives.find((a) => a.id === id),
      getArchivesByShelf: (shelfId) => get().archives.filter((a) => a.shelf_id === shelfId),
      updateArchiveStatus: (id, status) =>
        set((state) => ({
          archives: state.archives.map((a) => (a.id === id ? { ...a, status } : a)),
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
          shelves: state.shelves.map((s) => (s.id === id ? { ...s, status } : s)),
        })),
      isShelfAvailable: (shelfId) => {
        const shelf = get().getShelfById(shelfId);
        return shelf?.status === "normal";
      },

      getApplicationById: (id) => get().applications.find((a) => a.id === id),
      getApplicationsByUser: (userId) =>
        get().applications.filter((a) => a.user_id === userId),
      createApplication: (data) => {
        const state = get();
        const user = state.getUserById(data.user_id);
        const archive = state.getArchiveById(data.archive_id);
        const check = canCreateApplication(user, archive);
        if (!check.success) return { success: false, message: check.message };

        const app: Application = {
          id: generateId("app"),
          user_id: data.user_id,
          archive_id: data.archive_id,
          reason: data.reason,
          apply_time: new Date().toISOString(),
          expect_read_time: data.expect_read_time,
          status: archive && isSecretLevel(archive.level) ? "pending_approval" : "approved",
        };

        set((s) => ({ applications: [app, ...s.applications] }));
        return { success: true, message: "申请提交成功", id: app.id };
      },
      approveApplication: (id, approverId, opinion) => {
        const app = get().getApplicationById(id);
        if (!app || app.status !== "pending_approval") return;
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
            a.id === id && ["pending_approval", "approved"].includes(a.status)
              ? { ...a, status: "cancelled" }
              : a
          ),
        })),

      getDispatchByApplication: (appId) =>
        get().dispatchOrders.find((d) => d.application_id === appId),
      createDispatch: (applicationId, staffId) => {
        const state = get();
        const app = state.getApplicationById(applicationId);
        const archive = app ? state.getArchiveById(app.archive_id) : undefined;
        const shelf = archive ? state.getShelfById(archive.shelf_id) : undefined;

        const check = canDispatchApplication(app, archive, shelf);
        if (!check.success) return { success: false, message: check.message };

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
      confirmOutbound: (dispatchId) => {
        const state = get();
        const dispatch = state.dispatchOrders.find((d) => d.id === dispatchId);
        if (!dispatch || dispatch.status !== "pending") return;

        const app = state.getApplicationById(dispatch.application_id);
        if (app) {
          state.updateArchiveStatus(app.archive_id, "dispatched");
        }

        set((s) => ({
          dispatchOrders: s.dispatchOrders.map((d) =>
            d.id === dispatchId
              ? { ...d, status: "outbound", outbound_time: new Date().toISOString() }
              : d
          ),
        }));
      },

      getReturnByApplication: (appId) =>
        get().returnRecords.find((r) => r.application_id === appId),
      confirmReceive: (applicationId, readerId, seatNo) => {
        const state = get();
        const app = state.getApplicationById(applicationId);
        if (!app) return;

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
              ? { ...r, status: "reading", start_read_time: new Date().toISOString() }
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
      confirmReturn: (returnRecordId) => {
        const state = get();
        const record = state.returnRecords.find((r) => r.id === returnRecordId);
        if (!record) return;

        const app = state.getApplicationById(record.application_id);
        if (app) {
          state.updateArchiveStatus(app.archive_id, "in_shelf");
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
          };

          state.updateArchiveStatus(app.archive_id, "overdue");
          set((s) => ({ overdueRecords: [ovd, ...s.overdueRecords] }));
          state.suspendUser(app.user_id);
        });
      },
      resolveOverdue: (overdueId) => {
        const state = get();
        const ovd = state.overdueRecords.find((o) => o.id === overdueId);
        if (!ovd || ovd.status !== "active") return;

        const userActiveOverdue = state.overdueRecords.filter(
          (o) => o.user_id === ovd.user_id && o.status === "active" && o.id !== overdueId
        );
        if (userActiveOverdue.length === 0) {
          state.restoreUser(ovd.user_id);
        }

        set((s) => ({
          overdueRecords: s.overdueRecords.map((o) =>
            o.id === overdueId
              ? { ...o, status: "resolved", resolve_time: new Date().toISOString() }
              : o
          ),
        }));
      },

      getInventoryByShelf: (shelfId) =>
        get().inventoryTasks.find((t) => t.shelf_id === shelfId && t.status === "ongoing"),
      startInventory: (shelfId, staffId, remark) => {
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
        };
        state.setShelfStatus(shelfId, "inventory");
        set((s) => ({ inventoryTasks: [task, ...s.inventoryTasks] }));
      },
      endInventory: (inventoryId) => {
        const state = get();
        const task = state.inventoryTasks.find((t) => t.id === inventoryId);
        if (!task || task.status !== "ongoing") return;
        state.setShelfStatus(task.shelf_id, "normal");
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
      }),
    }
  )
);
