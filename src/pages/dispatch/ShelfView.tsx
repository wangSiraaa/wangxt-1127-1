import { useState, useMemo } from "react";
import {
  Package,
  MapPin,
  Search,
  Send,
  ShieldAlert,
  Eye,
  Archive,
  Zap,
  Pause,
  Play,
  CheckSquare,
  Square,
  Clock,
  ShieldCheck,
  Layers,
  XCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import { formatDate, formatRelativeTime } from "@/utils/dateUtils";
import { showToast } from "@/components/ui/Toast";
import {
  isSecretLevel,
  needsSecondReview,
  LEVEL_PRIORITY_RANK,
  type ArchiveLevel,
} from "@/types";
import type { Shelf, Application, ApplicationPriority } from "@/types";
import { getPriorityRank } from "@/utils/businessRules";

type TabType = "pending" | "suspended";

const priorityBadge: Record<
  ApplicationPriority,
  { label: string; color: string; iconColor: string }
> = {
  low: { label: "低", color: "text-slate-600 bg-slate-100", iconColor: "text-slate-500" },
  normal: { label: "普通", color: "text-blue-600 bg-blue-50", iconColor: "text-blue-500" },
  high: { label: "高", color: "text-orange-600 bg-orange-50", iconColor: "text-orange-500" },
  urgent: { label: "特急", color: "text-red-600 bg-red-50", iconColor: "text-red-500" },
};

export default function DispatchShelf() {
  const navigate = useNavigate();
  const shelves = useStore((s) => s.shelves);
  const getArchivesByShelf = useStore((s) => s.getArchivesByShelf);
  const getArchiveById = useStore((s) => s.getArchiveById);
  const getUserById = useStore((s) => s.getUserById);
  const applications = useStore((s) => s.applications);
  const createDispatch = useStore((s) => s.createDispatch);
  const createBatchDispatch = useStore((s) => s.createBatchDispatch);
  const suspendApplication = useStore((s) => s.suspendApplication);
  const resumeApplication = useStore((s) => s.resumeApplication);
  const addSecretReview = useStore((s) => s.addSecretReview);
  const currentUser = useStore((s) => s.getCurrentUser());

  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [keyword, setKeyword] = useState("");
  const [tab, setTab] = useState<TabType>("pending");
  const [showBatchResult, setShowBatchResult] = useState<null | {
    dispatched: string[];
    suspended: string[];
    failed: { id: string; reason: string }[];
  }>(null);

  const getProcessedApps = useMemo(() => {
    const targetStatus = tab === "pending" ? "approved" : "suspended";
    return applications
      .filter((a) => a.status === targetStatus)
      .map((a) => {
        const arc = getArchiveById(a.archive_id);
        const shelf = arc ? shelves.find((s) => s.id === arc.shelf_id) : undefined;
        const user = getUserById(a.user_id);
        return { app: a, arc, shelf, user };
      })
      .filter((x) => {
        if (!keyword) return true;
        const k = keyword.toLowerCase();
        return (
          x.arc?.title.toLowerCase().includes(k) ||
          x.arc?.code.toLowerCase().includes(k) ||
          x.app.reason.toLowerCase().includes(k) ||
          x.user?.name.toLowerCase().includes(k)
        );
      })
      .sort((a, b) => {
        const rankA = a.arc ? getPriorityRank(a.app.priority, a.arc.level) : 0;
        const rankB = b.arc ? getPriorityRank(b.app.priority, b.arc.level) : 0;
        if (rankB !== rankA) return rankB - rankA;
        return new Date(a.app.apply_time).getTime() - new Date(b.app.apply_time).getTime();
      });
  }, [applications, shelves, keyword, tab, getArchiveById, getUserById]);

  const pendingCount = applications.filter((a) => a.status === "approved").length;
  const suspendedCount = applications.filter((a) => a.status === "suspended").length;

  const allSelected =
    getProcessedApps.length > 0 &&
    getProcessedApps.every(({ app }) => selectedIds.has(app.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(getProcessedApps.map(({ app }) => app.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSingleDispatch = (appId: string) => {
    const res = createDispatch(appId, currentUser?.id || "u003");
    if (res.success) {
      showToast(res.message + "，请前往出库登记", "success");
      setSelectedApp(null);
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(appId);
        return n;
      });
    } else if (res.shouldSuspend) {
      showToast(res.message + "，可手动挂起保留优先级", "warning");
    } else {
      showToast(res.message, "error");
    }
  };

  const handleSuspend = (appId: string, shelfCode: string) => {
    suspendApplication(appId, `架位 ${shelfCode} 正在盘点，挂起并保留优先级，待盘点结束自动恢复`);
    showToast("已挂起申请，优先级已保留，盘点完成后将自动恢复", "success");
    setSelectedApp(null);
  };

  const handleResume = (appId: string) => {
    resumeApplication(appId);
    showToast("申请已恢复为待派单状态", "success");
  };

  const handleBatchDispatch = () => {
    if (selectedIds.size === 0) return;
    const res = createBatchDispatch(Array.from(selectedIds), currentUser?.id || "u003");
    setShowBatchResult({
      dispatched: res.dispatched,
      suspended: res.suspended,
      failed: res.failed,
    });
    setSelectedIds(new Set());
    if (res.success) {
      showToast(res.message, res.dispatched.length > 0 ? "success" : "warning");
    } else {
      showToast(res.message, "error");
    }
  };

  const handleDoFirstReview = (appId: string) => {
    addSecretReview(appId, currentUser?.id || "u004", false, "pass", "初次涉密复核通过，档案内容符合调阅要求");
    showToast("初次涉密复核已记录", "success");
  };

  const handleDoSecondReview = (appId: string) => {
    addSecretReview(appId, currentUser?.id || "u005", true, "pass", "二次涉密复核通过，同意调出");
    showToast("二次涉密复核已记录", "success");
  };

  const getShelfBadgeColor = (s: Shelf) => {
    if (s.status === "inventory") return "ring-2 ring-amber-400 ring-offset-2";
    if (s.status === "locked") return "ring-2 ring-red-400 ring-offset-2";
    return "";
  };

  const getShelfGradient = (s: Shelf) => {
    if (s.status === "inventory") return "from-amber-400 to-amber-500";
    if (s.status === "locked") return "from-red-400 to-red-500";
    return "from-archive-navy-400 to-archive-navy-500";
  };

  const renderSecretReviewStatus = (app: Application) => {
    const first = app.secret_reviews?.find((r) => !r.is_second_review);
    const second = app.secret_reviews?.find((r) => r.is_second_review);
    return (
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
            first?.review_result === "pass"
              ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
              : "text-slate-500 bg-slate-50 border border-slate-200"
          }`}
        >
          {first?.review_result === "pass" ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <Clock className="w-3 h-3" />
          )}
          初次复核{first?.review_result === "pass" ? "通过" : "待完成"}
        </span>
        {app.second_review_required && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              second?.review_result === "pass"
                ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                : "text-amber-700 bg-amber-50 border border-amber-200"
            }`}
          >
            {second?.review_result === "pass" ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <ShieldAlert className="w-3 h-3" />
            )}
            二次复核{second?.review_result === "pass" ? "通过" : "需完成"}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-archive-navy-700">
            密集架派单中心
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            可视化架位管理 · 共 {shelves.length} 组密集架 · 按优先级排序派单
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => navigate("/dispatch/inventory")}>
            <Eye className="w-4 h-4" />
            盘点管理
          </button>
          <button className="btn-primary" onClick={() => navigate("/dispatch/outbound")}>
            <Package className="w-4 h-4" />
            出库登记
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3 space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-semibold text-archive-navy-700">
                密集架分布图
              </h2>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-archive-navy-400" />
                  <span className="text-slate-500">正常</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-amber-400" />
                  <span className="text-slate-500">盘点中</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-red-400" />
                  <span className="text-slate-500">锁定</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 3 }).map((_, row) => (
                <div key={row} className="contents">
                  {Array.from({ length: 4 }).map((__, col) => {
                    const idx = row * 4 + col;
                    const shelf = shelves[idx];
                    if (!shelf) return <div key={`${row}-${col}`} />;
                    const archives = getArchivesByShelf(shelf.id);
                    const inShelfCount = archives.filter(
                      (a) => a.status === "in_shelf"
                    ).length;
                    const pendingOnShelf = applications.filter((a) => {
                      const arc = getArchiveById(a.archive_id);
                      return (
                        (a.status === "approved" || a.status === "suspended") &&
                        arc?.shelf_id === shelf.id
                      );
                    }).length;
                    return (
                      <button
                        key={shelf.id}
                        onClick={() => setSelectedShelf(shelf)}
                        className={`group relative aspect-[4/5] rounded-xl p-4 bg-gradient-to-br ${getShelfGradient(
                          shelf
                        )} text-white transition-all hover:scale-[1.02] hover:shadow-lg ${getShelfBadgeColor(
                          shelf
                        )}`}
                      >
                        <div className="text-xs font-mono text-white/70">
                          {shelf.row}排-{shelf.column}列
                        </div>
                        <div className="font-serif text-lg font-semibold mt-1">
                          {shelf.code}
                        </div>
                        {pendingOnShelf > 0 && (
                          <div className="absolute top-3 right-3 px-2 py-0.5 bg-white/25 backdrop-blur rounded-full text-[10px] font-bold">
                            待派 {pendingOnShelf}
                          </div>
                        )}
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="flex justify-between text-xs text-white/80 mb-1">
                            <span>在架</span>
                            <span>
                              {inShelfCount}/{archives.length}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                            <div
                              className="h-full bg-white/70 rounded-full transition-all"
                              style={{
                                width: archives.length
                                  ? `${(inShelfCount / archives.length) * 100}%`
                                  : "0%",
                              }}
                            />
                          </div>
                        </div>
                        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition">
                          <MapPin className="w-4 h-4 text-white/80" />
                        </div>
                        {shelf.status !== "normal" && (
                          <div className="absolute bottom-16 left-4 right-4 px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-medium text-center">
                            {shelf.status === "inventory" ? "盘点中" : "锁定"}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <Modal
            open={!!selectedShelf}
            onClose={() => setSelectedShelf(null)}
            title={`架位详情 - ${selectedShelf?.code || ""}`}
            width="max-w-3xl"
          >
            {selectedShelf && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-slate-50">
                    <div className="text-xs text-slate-500">位置</div>
                    <div className="font-medium">{selectedShelf.location}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50">
                    <div className="text-xs text-slate-500">层数</div>
                    <div className="font-medium">{selectedShelf.total_layers} 层</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50">
                    <div className="text-xs text-slate-500">每层格数</div>
                    <div className="font-medium">{selectedShelf.total_cells} 格</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50">
                    <div className="text-xs text-slate-500 mb-1">状态</div>
                    <StatusBadge kind="shelf" value={selectedShelf.status} />
                  </div>
                </div>

                {selectedShelf.status === "inventory" && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    该架位正在盘点，相关申请已自动挂起，盘点结束后将自动恢复
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">
                    档案列表（{getArchivesByShelf(selectedShelf.id).length}份）
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="table-th">层-格</th>
                          <th className="table-th">编码</th>
                          <th className="table-th">题名</th>
                          <th className="table-th">密级</th>
                          <th className="table-th">状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getArchivesByShelf(selectedShelf.id)
                          .sort((a, b) => a.layer - b.layer || a.cell - b.cell)
                          .map((a) => (
                            <tr key={a.id} className="table-tr-hover">
                              <td className="table-td text-sm">
                                {a.layer}层{a.cell}格
                              </td>
                              <td className="table-td font-mono text-xs">{a.code}</td>
                              <td className="table-td max-w-[240px] truncate">{a.title}</td>
                              <td className="table-td">
                                <StatusBadge kind="level" value={a.level} />
                              </td>
                              <td className="table-td">
                                <StatusBadge kind="archive" value={a.status} />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </Modal>
        </div>

        <div className="xl:col-span-2 space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  onClick={() => {
                    setTab("pending");
                    setSelectedIds(new Set());
                  }}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                    tab === "pending"
                      ? "bg-white text-archive-navy-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  待派单
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                      tab === "pending"
                        ? "bg-archive-navy-100 text-archive-navy-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {pendingCount}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setTab("suspended");
                    setSelectedIds(new Set());
                  }}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                    tab === "suspended"
                      ? "bg-white text-amber-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  挂起中
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                      tab === "suspended"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {suspendedCount}
                  </span>
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="input pl-9 text-sm w-52"
                  placeholder="搜索档案..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            </div>

            {tab === "pending" && getProcessedApps.length > 0 && (
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <button
                    onClick={toggleSelectAll}
                    className="text-slate-500 hover:text-archive-navy-600 transition"
                  >
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4 text-archive-navy-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  <span>
                    全选（{selectedIds.size}/{getProcessedApps.length}）
                  </span>
                </label>
                <button
                  className={`btn-gold text-xs py-1.5 ${
                    selectedIds.size === 0 ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={selectedIds.size === 0}
                  onClick={handleBatchDispatch}
                >
                  <Send className="w-3.5 h-3.5" />
                  批量派单（{selectedIds.size}）
                </button>
              </div>
            )}

            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
              {getProcessedApps.length === 0 && (
                <div className="py-16 text-center">
                  <Archive className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <div className="text-slate-400 text-sm">
                    {tab === "pending" ? "暂无待派单申请" : "暂无挂起中的申请"}
                  </div>
                </div>
              )}
              {getProcessedApps.map(({ app, arc, shelf, user }) => {
                const isSecret = arc ? isSecretLevel(arc.level) : false;
                const isInventory = shelf?.status === "inventory";
                const isLocked = shelf?.status === "locked";
                const disabled = tab === "pending" && (isInventory || isLocked);
                const firstReview = app.secret_reviews?.find((r) => !r.is_second_review);
                const secondReview = app.secret_reviews?.find((r) => r.is_second_review);
                const canDispatch =
                  !app.second_review_required ||
                  (firstReview?.review_result === "pass" &&
                    secondReview?.review_result === "pass");
                const pb = priorityBadge[app.priority];
                const selected = selectedIds.has(app.id);
                return (
                  <div
                    key={app.id}
                    className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                      tab === "suspended"
                        ? "bg-gradient-to-br from-amber-50/50 to-white border-amber-200"
                        : disabled
                        ? "bg-slate-50 border-slate-200 opacity-80"
                        : "bg-white border-slate-200"
                    } ${selected ? "ring-2 ring-archive-navy-400 ring-offset-1" : ""}`}
                  >
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {tab === "pending" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(app.id);
                            }}
                            className="mt-0.5 text-slate-500 hover:text-archive-navy-600 transition flex-shrink-0"
                          >
                            {selected ? (
                              <CheckSquare className="w-4 h-4 text-archive-navy-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${pb.color}`}
                            >
                              <Zap className={`w-2.5 h-2.5 ${pb.iconColor}`} />
                              {pb.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              综合分 {arc ? getPriorityRank(app.priority, arc.level) : "-"}
                            </span>
                          </div>
                          <div className="font-medium text-slate-800 truncate">
                            {arc?.title}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400">{arc?.code}</span>
                            {arc && <StatusBadge kind="level" value={arc.level} />}
                            {isSecret && firstReview?.review_result === "pass" && (
                              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                <ShieldCheck className="w-3 h-3" />
                                复核完成
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="p-1.5 rounded-md text-slate-400 hover:bg-archive-navy-50 hover:text-archive-navy-600 transition flex-shrink-0"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    {isSecret && renderSecretReviewStatus(app)}

                    {app.split_record && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-violet-50 text-violet-700 border border-violet-200">
                        <Layers className="w-2.5 h-2.5" />
                        批量拆分 · {app.split_record.split_detail}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 my-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {shelf?.code} · {arc?.layer}层{arc?.cell}格
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-3 h-3 inline-block text-center">👤</span>
                        {user?.name}
                      </div>
                      <div>预约：{formatDate(app.expect_read_time, "MM-DD HH:mm")}</div>
                      <div>{formatRelativeTime(app.apply_time)}</div>
                    </div>

                    {tab === "suspended" && app.suspend_reason && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-start gap-1.5">
                        <Pause className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium mb-0.5">挂起原因</div>
                          <div className="text-amber-600/90">{app.suspend_reason}</div>
                          {app.suspend_time && (
                            <div className="mt-0.5 text-[10px] text-amber-600/70">
                              挂起时间：{formatRelativeTime(app.suspend_time)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {tab === "pending" && isInventory && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                        ⚠️ 密集架 {shelf?.code} 正在盘点，暂无法派单
                      </div>
                    )}
                    {tab === "pending" && isLocked && (
                      <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                        ⚠️ 密集架 {shelf?.code} 已锁定
                      </div>
                    )}
                    {tab === "pending" &&
                      isSecret &&
                      app.second_review_required &&
                      !(
                        firstReview?.review_result === "pass" &&
                        secondReview?.review_result === "pass"
                      ) && (
                        <div className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          需完成涉密复核后方可派单
                        </div>
                      )}

                    <div className="flex gap-2">
                      {tab === "pending" ? (
                        <>
                          <button
                            onClick={() => navigate(`/application/${app.id}`)}
                            className="btn-secondary flex-1 py-1.5 text-xs"
                          >
                            查看详情
                          </button>
                          {isInventory && !isLocked && (
                            <button
                              onClick={() => shelf && handleSuspend(app.id, shelf.code)}
                              className="btn-secondary flex-1 py-1.5 text-xs !text-amber-700 !bg-amber-50 !border-amber-200 hover:!bg-amber-100"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              挂起保留
                            </button>
                          )}
                          <button
                            onClick={() => handleSingleDispatch(app.id)}
                            disabled={disabled || !canDispatch}
                            className={`flex-1 py-1.5 text-xs ${
                              disabled || !canDispatch
                                ? "btn-secondary !text-slate-400 !bg-slate-50 !border-slate-200 cursor-not-allowed"
                                : "btn-primary"
                            }`}
                          >
                            <Send className="w-3.5 h-3.5" />
                            立即派单
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => navigate(`/application/${app.id}`)}
                            className="btn-secondary flex-1 py-1.5 text-xs"
                          >
                            查看详情
                          </button>
                          <button
                            onClick={() => handleResume(app.id)}
                            className="btn-success flex-1 py-1.5 text-xs"
                          >
                            <Play className="w-3.5 h-3.5" />
                            恢复派单
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        title={tab === "pending" ? "派单确认" : "挂起申请详情"}
        width="max-w-2xl"
      >
        {selectedApp && (() => {
          const arc = getArchiveById(selectedApp.archive_id);
          const sh = arc ? shelves.find((x) => x.id === arc.shelf_id) : undefined;
          const applicant = getUserById(selectedApp.user_id);
          const pb = priorityBadge[selectedApp.priority];
          const firstReview = selectedApp.secret_reviews?.find((r) => !r.is_second_review);
          const secondReview = selectedApp.secret_reviews?.find((r) => r.is_second_review);
          const canDispatch =
            !selectedApp.second_review_required ||
            (firstReview?.review_result === "pass" && secondReview?.review_result === "pass");
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-archive-navy-50/60 border border-archive-navy-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="text-xs text-slate-500 mb-1">档案信息</div>
                  <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${pb.color}`}>
                    <Zap className={`w-2.5 h-2.5 ${pb.iconColor}`} />
                    {pb.label} · 综合分 {arc ? getPriorityRank(selectedApp.priority, arc.level) : "-"}
                  </span>
                </div>
                <div className="font-serif text-lg font-semibold text-archive-navy-700">
                  {arc?.title}
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm flex-wrap">
                  <span className="text-slate-500">{arc?.code}</span>
                  {arc && <StatusBadge kind="level" value={arc.level} />}
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">
                    {sh?.code} {arc?.layer}层{arc?.cell}格
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500 mb-1">申请人</div>
                  <div className="font-medium">
                    {applicant?.name} · {applicant?.department}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">调阅事由</div>
                  <div className="text-slate-700 line-clamp-2">{selectedApp.reason}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-slate-50">
                  <div className="text-xs text-slate-500 mb-1">架位状态</div>
                  {sh ? (
                    <StatusBadge kind="shelf" value={sh.status} />
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <div className="text-xs text-slate-500 mb-1">预约阅览</div>
                  <div className="font-medium">{formatDate(selectedApp.expect_read_time, "MM-DD HH:mm")}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <div className="text-xs text-slate-500 mb-1">申请时间</div>
                  <div className="font-medium">{formatRelativeTime(selectedApp.apply_time)}</div>
                </div>
              </div>

              {arc && isSecretLevel(arc.level) && (
                <div className="p-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                  <div className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    涉密复核进度（{needsSecondReview(arc.level) ? "两级复核" : "一级复核"}）
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div
                      className={`p-3 rounded-lg border ${
                        firstReview?.review_result === "pass"
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-700">初次涉密复核</span>
                        {firstReview?.review_result === "pass" ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                            已通过
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                            待完成
                          </span>
                        )}
                      </div>
                      {firstReview?.review_result === "pass" ? (
                        <div className="text-xs text-slate-600">
                          <div>复核人：{getUserById(firstReview.reviewer_id)?.name}</div>
                          <div>意见：{firstReview.review_opinion}</div>
                        </div>
                      ) : tab === "pending" ? (
                        <button
                          className="w-full mt-1 text-xs py-1.5 rounded-md bg-archive-navy-50 text-archive-navy-700 border border-archive-navy-200 hover:bg-archive-navy-100 transition font-medium"
                          onClick={() => handleDoFirstReview(selectedApp.id)}
                        >
                          执行初次复核
                        </button>
                      ) : null}
                    </div>
                    {needsSecondReview(arc.level) && (
                      <div
                        className={`p-3 rounded-lg border ${
                          secondReview?.review_result === "pass"
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-700">二次涉密复核</span>
                          {secondReview?.review_result === "pass" ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                              已通过
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                              需完成
                            </span>
                          )}
                        </div>
                        {secondReview?.review_result === "pass" ? (
                          <div className="text-xs text-slate-600">
                            <div>复核人：{getUserById(secondReview.reviewer_id)?.name}</div>
                            <div>意见：{secondReview.review_opinion}</div>
                          </div>
                        ) : firstReview?.review_result === "pass" && tab === "pending" ? (
                          <button
                            className="w-full mt-1 text-xs py-1.5 rounded-md bg-archive-navy-50 text-archive-navy-700 border border-archive-navy-200 hover:bg-archive-navy-100 transition font-medium"
                            onClick={() => handleDoSecondReview(selectedApp.id)}
                          >
                            执行二次复核
                          </button>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-1">
                            需先完成初次复核
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {sh?.status === "inventory" && tab === "pending" && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">密集架正在盘点</div>
                    <div className="text-xs mt-0.5 text-amber-700/90">
                      建议点击"挂起保留"，申请将保持当前优先级，盘点结束后自动恢复待派单
                    </div>
                  </div>
                </div>
              )}

              {sh?.status !== "inventory" && tab === "pending" && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                  请确认前往库房 <strong>{sh?.location}</strong> 调取档案
                </div>
              )}
            </div>
          );
        })()}
        {{
          footer: (
            <>
              <button className="btn-secondary" onClick={() => setSelectedApp(null)}>
                取消
              </button>
              {tab === "pending" && selectedApp && (() => {
                const arc = getArchiveById(selectedApp.archive_id);
                const sh = arc ? shelves.find((x) => x.id === arc.shelf_id) : undefined;
                const firstReview = selectedApp.secret_reviews?.find((r) => !r.is_second_review);
                const secondReview = selectedApp.secret_reviews?.find((r) => r.is_second_review);
                const canDispatch =
                  !selectedApp.second_review_required ||
                  (firstReview?.review_result === "pass" && secondReview?.review_result === "pass");
                const disabled = (sh?.status !== "normal") || !canDispatch;
                return (
                  <>
                    {sh?.status === "inventory" && (
                      <button
                        className="btn-secondary !text-amber-700 !bg-amber-50 !border-amber-200 hover:!bg-amber-100"
                        onClick={() => sh && handleSuspend(selectedApp!.id, sh.code)}
                      >
                        <Pause className="w-4 h-4" />
                        挂起并保留优先级
                      </button>
                    )}
                    <button
                      className="btn-primary"
                      disabled={disabled}
                      onClick={() => selectedApp && handleSingleDispatch(selectedApp.id)}
                    >
                      <Send className="w-4 h-4" />
                      确认派单
                    </button>
                  </>
                );
              })()}
            </>
          ),
        } as any}
      </Modal>

      <Modal
        open={!!showBatchResult}
        onClose={() => setShowBatchResult(null)}
        title="批量派单结果"
        width="max-w-xl"
      >
        {showBatchResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <div className="text-3xl font-bold text-emerald-700 mb-1">
                  {showBatchResult.dispatched.length}
                </div>
                <div className="text-xs text-emerald-700 font-medium">派单成功</div>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <div className="text-3xl font-bold text-amber-700 mb-1">
                  {showBatchResult.suspended.length}
                </div>
                <div className="text-xs text-amber-700 font-medium">自动挂起</div>
              </div>
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center">
                <div className="text-3xl font-bold text-red-700 mb-1">
                  {showBatchResult.failed.length}
                </div>
                <div className="text-xs text-red-700 font-medium">派单失败</div>
              </div>
            </div>

            {showBatchResult.suspended.length > 0 && (
              <div>
                <div className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-1.5">
                  <Pause className="w-4 h-4" />
                  已自动挂起申请（盘点冲突，保留优先级）
                </div>
                <div className="max-h-32 overflow-y-auto border border-amber-200 rounded-lg divide-y divide-amber-100">
                  {showBatchResult.suspended.map((id) => {
                    const app = applications.find((a) => a.id === id);
                    const arc = app ? getArchiveById(app.archive_id) : undefined;
                    return (
                      <div key={id} className="px-3 py-2 text-xs flex items-center justify-between bg-amber-50/50">
                        <span className="text-slate-700 truncate">
                          {arc?.code} · {arc?.title}
                        </span>
                        <span className="text-amber-600 font-medium">优先级已保留</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {showBatchResult.failed.length > 0 && (
              <div>
                <div className="text-sm font-medium text-red-800 mb-2 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  派单失败明细
                </div>
                <div className="max-h-32 overflow-y-auto border border-red-200 rounded-lg divide-y divide-red-100">
                  {showBatchResult.failed.map((f) => {
                    const app = applications.find((a) => a.id === f.id);
                    const arc = app ? getArchiveById(app.archive_id) : undefined;
                    return (
                      <div key={f.id} className="px-3 py-2 text-xs flex items-center justify-between bg-red-50/50">
                        <span className="text-slate-700 truncate">
                          {arc?.code} · {arc?.title}
                        </span>
                        <span className="text-red-600 font-medium">{f.reason}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {{
          footer: (
            <button className="btn-primary" onClick={() => setShowBatchResult(null)}>
              <CheckCircle2 className="w-4 h-4" />
              完成
            </button>
          ),
        } as any}
      </Modal>
    </div>
  );
}
