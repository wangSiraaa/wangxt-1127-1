import { useState } from "react";
import { Search, PackageCheck, Package, FileCheck, ScanLine } from "lucide-react";
import { useStore } from "@/store";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, formatRelativeTime } from "@/utils/dateUtils";
import { showToast } from "@/components/ui/Toast";

export default function DispatchOutbound() {
  const dispatchOrders = useStore((s) => s.dispatchOrders);
  const getApplicationById = useStore((s) => s.getApplicationById);
  const getArchiveById = useStore((s) => s.getArchiveById);
  const getShelfById = useStore((s) => s.getShelfById);
  const getUserById = useStore((s) => s.getUserById);
  const confirmOutbound = useStore((s) => s.confirmOutbound);
  const shelves = useStore((s) => s.shelves);

  const [scanCode, setScanCode] = useState("");
  const [tab, setTab] = useState<"pending" | "outbound">("pending");

  const list = dispatchOrders
    .filter((d) => d.status === tab)
    .sort((a, b) =>
      new Date(b.dispatch_time).getTime() - new Date(a.dispatch_time).getTime()
    );

  const pendingCount = dispatchOrders.filter((d) => d.status === "pending").length;
  const outboundCount = dispatchOrders.filter((d) => d.status === "outbound").length;

  const handleOutbound = (id: string) => {
    confirmOutbound(id);
    showToast("出库确认成功，档案已发往阅览室", "success");
  };

  const handleScan = () => {
    const code = scanCode.trim();
    if (!code) {
      showToast("请输入或扫描档案编码", "warning");
      return;
    }
    const found = dispatchOrders.find((d) => {
      const app = getApplicationById(d.application_id);
      const arc = app ? getArchiveById(app.archive_id) : undefined;
      return arc?.code.toLowerCase() === code.toLowerCase() && d.status === "pending";
    });
    if (found) {
      confirmOutbound(found.id);
      showToast(`档案 ${code} 出库确认成功`, "success");
      setScanCode("");
    } else {
      showToast("未找到该编码的待出库档案", "error");
    }
  };

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-archive-navy-700">
          出库登记
        </h1>
        <p className="text-sm text-slate-500 mt-1">扫描或手动确认档案出库</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-6">
            <h3 className="font-serif text-lg font-semibold text-archive-navy-700 mb-4 flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-archive-navy-500" />
              快速出库扫描
            </h3>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="input pl-9 pr-24 font-mono"
                  placeholder="输入档案编码..."
                  value={scanCode}
                  onChange={(e) => setScanCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                />
                <button
                  className="absolute right-1 top-1 bottom-1 px-3 rounded-md bg-archive-navy-500 text-white text-xs font-medium hover:bg-archive-navy-600 transition"
                  onClick={handleScan}
                >
                  确认
                </button>
              </div>
              <div className="text-xs text-slate-400">
                支持扫码枪扫描或手动输入档案编码
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-800">待出库</span>
                </div>
                <div className="text-2xl font-bold text-emerald-700">{pendingCount}</div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">今日已出库</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">{outboundCount}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setTab("pending")}
                className={`flex-1 px-5 py-4 text-sm font-medium transition relative ${
                  tab === "pending"
                    ? "text-archive-navy-700 bg-archive-navy-50/40"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <PackageCheck className="w-4 h-4" />
                  待出库
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    tab === "pending" ? "bg-archive-navy-500 text-white" : "bg-slate-200"
                  }`}>
                    {pendingCount}
                  </span>
                </span>
                {tab === "pending" && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-archive-navy-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setTab("outbound")}
                className={`flex-1 px-5 py-4 text-sm font-medium transition relative ${
                  tab === "outbound"
                    ? "text-archive-navy-700 bg-archive-navy-50/40"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Package className="w-4 h-4" />
                  已出库
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    tab === "outbound" ? "bg-archive-navy-500 text-white" : "bg-slate-200"
                  }`}>
                    {outboundCount}
                  </span>
                </span>
                {tab === "outbound" && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-archive-navy-500 rounded-full" />
                )}
              </button>
            </div>

            <div className="p-4 max-h-[600px] overflow-y-auto space-y-3">
              {list.length === 0 && (
                <div className="py-20 text-center">
                  <Package className="w-14 h-14 mx-auto text-slate-300 mb-3" />
                  <div className="text-slate-400">
                    {tab === "pending" ? "暂无待出库档案" : "暂无出库记录"}
                  </div>
                </div>
              )}
              {list.map((d) => {
                const app = getApplicationById(d.application_id);
                const arc = app ? getArchiveById(app.archive_id) : undefined;
                const shelf = arc ? getShelfById(arc.shelf_id) : undefined;
                const staff = getUserById(d.staff_id);
                return (
                  <div
                    key={d.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-archive-navy-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-slate-400">
                            {d.id.slice(-8).toUpperCase()}
                          </span>
                          <StatusBadge kind="dispatch" value={d.status} pulse />
                        </div>
                        <div className="font-medium text-slate-800">{arc?.title}</div>
                        <div className="flex items-center gap-2 mt-1.5 text-xs">
                          <span className="text-slate-400">{arc?.code}</span>
                          {arc && <StatusBadge kind="level" value={arc.level} />}
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500">
                            {shelf?.code} · {arc?.layer}层{arc?.cell}格
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                          <span>派单人：{staff?.name}</span>
                          <span>派单：{formatRelativeTime(d.dispatch_time)}</span>
                          {d.outbound_time && (
                            <span className="text-emerald-600 font-medium">
                              出库：{formatDate(d.outbound_time, "HH:mm:ss")}
                            </span>
                          )}
                        </div>
                      </div>
                      {tab === "pending" && (
                        <button
                          onClick={() => handleOutbound(d.id)}
                          className="btn-success flex-shrink-0 whitespace-nowrap"
                        >
                          <PackageCheck className="w-4 h-4" />
                          确认出库
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
