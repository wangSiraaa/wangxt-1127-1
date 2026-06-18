import { useState, useMemo } from "react";
import { Package, MapPin, Search, Send, ShieldAlert, Eye, Archive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import { formatDate, formatRelativeTime } from "@/utils/dateUtils";
import { showToast } from "@/components/ui/Toast";
import { isSecretLevel } from "@/types";
import type { Shelf, Application } from "@/types";

export default function DispatchShelf() {
  const navigate = useNavigate();
  const shelves = useStore((s) => s.shelves);
  const getArchivesByShelf = useStore((s) => s.getArchivesByShelf);
  const getApplicationById = useStore((s) => s.getApplicationById);
  const getArchiveById = useStore((s) => s.getArchiveById);
  const getUserById = useStore((s) => s.getUserById);
  const applications = useStore((s) => s.applications);
  const createDispatch = useStore((s) => s.createDispatch);
  const currentUser = useStore((s) => s.getCurrentUser());

  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [keyword, setKeyword] = useState("");

  const pendingApps = useMemo(() => {
    return applications
      .filter((a) => a.status === "approved")
      .map((a) => {
        const arc = getArchiveById(a.archive_id);
        const shelf = arc ? shelves.find((s) => s.id === arc.shelf_id) : undefined;
        return { app: a, arc, shelf };
      })
      .filter((x) => {
        if (!keyword) return true;
        const k = keyword.toLowerCase();
        return (
          x.arc?.title.toLowerCase().includes(k) ||
          x.arc?.code.toLowerCase().includes(k) ||
          x.app.reason.toLowerCase().includes(k)
        );
      });
  }, [applications, shelves, keyword, getArchiveById]);

  const handleDispatch = (appId: string) => {
    const res = createDispatch(appId, currentUser?.id || "u003");
    if (res.success) {
      showToast(res.message + "，请前往出库登记", "success");
      setSelectedApp(null);
    } else {
      showToast(res.message, "error");
    }
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

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-archive-navy-700">
            密集架派单中心
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            可视化架位管理 · 共 {shelves.length} 组密集架 · 待派单 {pendingApps.length} 份
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
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition">
                          <MapPin className="w-4 h-4 text-white/80" />
                        </div>
                        {shelf.status !== "normal" && (
                          <div className="absolute top-3 left-3 px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-medium">
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
                              <td className="table-td"><StatusBadge kind="level" value={a.level} /></td>
                              <td className="table-td"><StatusBadge kind="archive" value={a.status} /></td>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-semibold text-archive-navy-700">
                待派单申请
              </h2>
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

            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {pendingApps.length === 0 && (
                <div className="py-16 text-center">
                  <Archive className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <div className="text-slate-400 text-sm">暂无待派单申请</div>
                </div>
              )}
              {pendingApps.map(({ app, arc, shelf }) => {
                const applicant = getUserById(app.user_id);
                const isSecret = arc ? isSecretLevel(arc.level) : false;
                const isInventory = shelf?.status === "inventory";
                const isLocked = shelf?.status === "locked";
                const disabled = isInventory || isLocked;
                return (
                  <div
                    key={app.id}
                    className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                      disabled
                        ? "bg-slate-50 border-slate-200 opacity-75"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 truncate">
                          {arc?.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">{arc?.code}</span>
                          {arc && <StatusBadge kind="level" value={arc.level} />}
                          {isSecret && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                              <ShieldAlert className="w-3 h-3" />
                              已审批
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="p-1.5 rounded-md text-slate-400 hover:bg-archive-navy-50 hover:text-archive-navy-600 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {shelf?.code} · {arc?.layer}层{arc?.cell}格
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-3 h-3 inline-block text-center">👤</span>
                        {applicant?.name}
                      </div>
                      <div>预约：{formatDate(app.expect_read_time, "MM-DD HH:mm")}</div>
                      <div>{formatRelativeTime(app.apply_time)}</div>
                    </div>

                    {isInventory && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                        ⚠️ 该密集架正在盘点，暂无法派单
                      </div>
                    )}
                    {isLocked && (
                      <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                        ⚠️ 该密集架已锁定
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/application/${app.id}`)}
                        className="btn-secondary flex-1 py-1.5 text-xs"
                      >
                        查看详情
                      </button>
                      <button
                        onClick={() => handleDispatch(app.id)}
                        disabled={disabled}
                        className="btn-primary flex-1 py-1.5 text-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        立即派单
                      </button>
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
        title="派单确认"
        width="max-w-xl"
      >
        {selectedApp && (() => {
          const arc = getArchiveById(selectedApp.archive_id);
          const sh = arc ? shelves.find((x) => x.id === arc.shelf_id) : undefined;
          const applicant = getUserById(selectedApp.user_id);
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-archive-navy-50/60 border border-archive-navy-100">
                <div className="text-xs text-slate-500 mb-1">档案信息</div>
                <div className="font-serif text-lg font-semibold text-archive-navy-700">
                  {arc?.title}
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm">
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
                  <div className="font-medium">{applicant?.name} · {applicant?.department}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">调阅事由</div>
                  <div className="text-slate-700 line-clamp-2">{selectedApp.reason}</div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                请确认前往库房 <strong>{sh?.location}</strong> 调取档案
              </div>
            </div>
          );
        })()}
        {{
          footer: (
            <>
              <button className="btn-secondary" onClick={() => setSelectedApp(null)}>
                取消
              </button>
              <button
                className="btn-primary"
                onClick={() => selectedApp && handleDispatch(selectedApp.id)}
              >
                <Send className="w-4 h-4" />
                确认派单
              </button>
            </>
          ),
        } as any}
      </Modal>
    </div>
  );
}
