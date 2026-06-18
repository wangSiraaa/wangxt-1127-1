import { useState } from "react";
import { Play, Square, Calendar, Search, Eye, MapPin, Clock, User } from "lucide-react";
import { useStore } from "@/store";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import { formatDate, formatRelativeTime } from "@/utils/dateUtils";
import { showToast } from "@/components/ui/Toast";
import type { Shelf } from "@/types";

export default function DispatchInventory() {
  const shelves = useStore((s) => s.shelves);
  const inventoryTasks = useStore((s) => s.inventoryTasks);
  const getArchivesByShelf = useStore((s) => s.getArchivesByShelf);
  const getUserById = useStore((s) => s.getUserById);
  const startInventory = useStore((s) => s.startInventory);
  const endInventory = useStore((s) => s.endInventory);
  const getInventoryByShelf = useStore((s) => s.getInventoryByShelf);
  const currentUser = useStore((s) => s.getCurrentUser());

  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
  const [remark, setRemark] = useState("");
  const [showEndConfirm, setShowEndConfirm] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [tab, setTab] = useState<"ongoing" | "completed">("ongoing");

  const ongoingCount = inventoryTasks.filter((t) => t.status === "ongoing").length;
  const completedCount = inventoryTasks.filter((t) => t.status === "completed").length;

  const filteredTasks = inventoryTasks
    .filter((t) => t.status === tab)
    .filter((t) => {
      if (!keyword) return true;
      const shelf = shelves.find((s) => s.id === t.shelf_id);
      const staff = getUserById(t.staff_id);
      const k = keyword.toLowerCase();
      return (
        shelf?.code.toLowerCase().includes(k) ||
        shelf?.location.toLowerCase().includes(k) ||
        staff?.name.toLowerCase().includes(k) ||
        (t.remark || "").toLowerCase().includes(k)
      );
    })
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const handleStart = () => {
    if (!selectedShelf) return;
    if (selectedShelf.status === "inventory") {
      showToast("该架位已在盘点中", "warning");
      return;
    }
    startInventory(selectedShelf.id, currentUser?.id || "u003", remark || "例行盘点");
    showToast(`架位 ${selectedShelf.code} 已开始盘点`, "success");
    setSelectedShelf(null);
    setRemark("");
  };

  const handleEnd = (taskId: string) => {
    endInventory(taskId);
    showToast("盘点已完成，架位恢复正常", "success");
    setShowEndConfirm(null);
  };

  const availableShelves = shelves.filter((s) => s.status !== "inventory");

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-archive-navy-700">
            盘点管理
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            启动/结束盘点 · 盘点期间架位自动锁定，禁止派单
          </p>
        </div>
        <button className="btn-gold" onClick={() => setSelectedShelf(shelves[0])}>
          <Play className="w-4 h-4" />
          启动盘点
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-xs text-slate-500 mb-1">密集架总数</div>
          <div className="text-3xl font-bold text-archive-navy-700">{shelves.length}</div>
          <div className="text-xs text-slate-400 mt-2">
            可用 {availableShelves.length} 组
          </div>
        </div>
        <div className="card p-5 border-l-4 border-l-amber-400">
          <div className="text-xs text-slate-500 mb-1">正在盘点</div>
          <div className="text-3xl font-bold text-amber-600">{ongoingCount}</div>
          <div className="text-xs text-slate-400 mt-2">盘点中架位锁定</div>
        </div>
        <div className="card p-5 border-l-4 border-l-emerald-400">
          <div className="text-xs text-slate-500 mb-1">已完成盘点</div>
          <div className="text-3xl font-bold text-emerald-600">{completedCount}</div>
          <div className="text-xs text-slate-400 mt-2">历史记录</div>
        </div>
        <div className="card p-5 border-l-4 border-l-blue-400">
          <div className="text-xs text-slate-500 mb-1">档案总数</div>
          <div className="text-3xl font-bold text-blue-600">
            {shelves.reduce((sum, s) => sum + getArchivesByShelf(s.id).length, 0)}
          </div>
          <div className="text-xs text-slate-400 mt-2">在册档案</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5">
          <div className="flex">
            <button
              onClick={() => setTab("ongoing")}
              className={`px-5 py-4 text-sm font-medium transition relative ${
                tab === "ongoing"
                  ? "text-archive-navy-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              进行中 ({ongoingCount})
              {tab === "ongoing" && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-amber-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setTab("completed")}
              className={`px-5 py-4 text-sm font-medium transition relative ${
                tab === "completed"
                  ? "text-archive-navy-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              已完成 ({completedCount})
              {tab === "completed" && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9 w-60 text-sm"
              placeholder="搜索架位/盘点人..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">架位</th>
                <th className="table-th">库房位置</th>
                <th className="table-th">档案数</th>
                <th className="table-th">盘点人</th>
                <th className="table-th">开始时间</th>
                {tab === "completed" && <th className="table-th">完成时间</th>}
                <th className="table-th">状态</th>
                <th className="table-th">备注</th>
                <th className="table-th text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t) => {
                const shelf = shelves.find((s) => s.id === t.shelf_id);
                const staff = getUserById(t.staff_id);
                const archives = getArchivesByShelf(t.shelf_id);
                return (
                  <tr key={t.id} className="table-tr-hover">
                    <td className="table-td">
                      <div className="font-medium text-slate-800">{shelf?.code}</div>
                      <div className="text-xs text-slate-400">
                        {shelf?.row}排{shelf?.column}列
                      </div>
                    </td>
                    <td className="table-td text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {shelf?.location}
                      </div>
                    </td>
                    <td className="table-td">
                      <span className="font-medium">{archives.length}</span>
                      <span className="text-slate-400 text-xs"> 份</span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {staff?.name}
                      </div>
                    </td>
                    <td className="table-td text-slate-500 text-xs">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(t.start_time)}
                      </div>
                      <div className="text-slate-400 mt-0.5">{formatRelativeTime(t.start_time)}</div>
                    </td>
                    {tab === "completed" && (
                      <td className="table-td text-xs text-emerald-600">
                        {t.end_time && formatDate(t.end_time)}
                      </td>
                    )}
                    <td className="table-td">
                      {t.status === "ongoing" ? (
                        <span className="badge bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          盘点中
                        </span>
                      ) : (
                        <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                          已完成
                        </span>
                      )}
                    </td>
                    <td className="table-td text-slate-500 text-xs max-w-[140px] truncate">
                      {t.remark || "-"}
                    </td>
                    <td className="table-td text-right">
                      {t.status === "ongoing" ? (
                        <button
                          className="btn-danger text-xs py-1 px-3"
                          onClick={() => setShowEndConfirm(t.id)}
                        >
                          <Square className="w-3.5 h-3.5" />
                          结束盘点
                        </button>
                      ) : (
                        <button className="btn-ghost text-xs py-1 px-3">
                          <Eye className="w-3.5 h-3.5" />
                          查看
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={tab === "completed" ? 9 : 8} className="py-16 text-center">
                    <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <div className="text-slate-400">暂无盘点记录</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!selectedShelf}
        onClose={() => {
          setSelectedShelf(null);
          setRemark("");
        }}
        title="启动盘点"
        width="max-w-lg"
        footer={
          <>
            <button
              className="btn-secondary"
              onClick={() => {
                setSelectedShelf(null);
                setRemark("");
              }}
            >
              取消
            </button>
            <button className="btn-gold" onClick={handleStart}>
              <Play className="w-4 h-4" />
              确认启动
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="input-label">选择架位</label>
            <select
              className="input"
              value={selectedShelf?.id || ""}
              onChange={(e) => {
                const s = shelves.find((x) => x.id === e.target.value);
                setSelectedShelf(s || null);
              }}
            >
              <option value="">请选择架位</option>
              {shelves.map((s) => (
                <option key={s.id} value={s.id} disabled={s.status === "inventory"}>
                  {s.code} - {s.location}
                  {s.status === "inventory" ? "（盘点中）" : ""}
                </option>
              ))}
            </select>
          </div>
          {selectedShelf && (
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500">档案数</div>
                <div className="font-medium text-lg">
                  {getArchivesByShelf(selectedShelf.id).length} 份
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500">层数</div>
                <div className="font-medium text-lg">{selectedShelf.total_layers} 层</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500">状态</div>
                <div className="mt-1">
                  <StatusBadge kind="shelf" value={selectedShelf.status} />
                </div>
              </div>
            </div>
          )}
          <div>
            <label className="input-label">盘点备注</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="填写盘点说明，如：季度例行盘点、专项检查等..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            ⚠️ 盘点启动后，该架位将被锁定，期间无法派单调取档案。盘点完成后请及时结束盘点以解锁。
          </div>
        </div>
      </Modal>

      <Modal
        open={!!showEndConfirm}
        onClose={() => setShowEndConfirm(null)}
        title="结束盘点确认"
        width="max-w-md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowEndConfirm(null)}>
              取消
            </button>
            <button
              className="btn-success"
              onClick={() => showEndConfirm && handleEnd(showEndConfirm)}
            >
              <Square className="w-4 h-4" />
              确认完成
            </button>
          </>
        }
      >
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <div className="text-sm text-emerald-800">
            确认结束该架位盘点？结束后架位将恢复正常状态，可正常派单调卷。
          </div>
        </div>
      </Modal>
    </div>
  );
}
