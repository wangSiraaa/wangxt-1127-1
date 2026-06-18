import { useState } from "react";
import { Package, MapPin, User, CheckCircle2, Search, Clock, Armchair } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import { formatDate, formatRelativeTime } from "@/utils/dateUtils";
import { showToast } from "@/components/ui/Toast";
import type { Application } from "@/types";

const seatOptions = ["A-01", "A-02", "A-03", "A-04", "A-05", "B-01", "B-02", "B-03", "C-01", "C-02"];

export default function ReturnReceive() {
  const navigate = useNavigate();
  const applications = useStore((s) => s.applications);
  const getArchiveById = useStore((s) => s.getArchiveById);
  const getShelfById = useStore((s) => s.getShelfById);
  const getUserById = useStore((s) => s.getUserById);
  const confirmReceive = useStore((s) => s.confirmReceive);
  const currentUser = useStore((s) => s.getCurrentUser());

  const [selected, setSelected] = useState<Application | null>(null);
  const [seatNo, setSeatNo] = useState(seatOptions[0]);
  const [keyword, setKeyword] = useState("");

  const list = applications
    .filter((a) => a.status === "dispatching")
    .filter((a) => {
      if (!keyword) return true;
      const arc = getArchiveById(a.archive_id);
      const applicant = getUserById(a.user_id);
      const k = keyword.toLowerCase();
      return (
        arc?.title.toLowerCase().includes(k) ||
        arc?.code.toLowerCase().includes(k) ||
        applicant?.name.toLowerCase().includes(k)
      );
    })
    .sort((a, b) => new Date(b.apply_time).getTime() - new Date(a.apply_time).getTime());

  const handleReceive = () => {
    if (!selected) return;
    confirmReceive(selected.id, currentUser?.id || "u005", seatNo);
    showToast("接收成功，已分配阅览位 " + seatNo, "success");
    setSelected(null);
  };

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-archive-navy-700">
            阅览室接收登记
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            档案到达阅览室后的接收和阅览位分配 · 待接收 {list.length} 份
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => navigate("/return/reading")}>
            <Clock className="w-4 h-4" />
            阅览管理
          </button>
          <button className="btn-primary" onClick={() => navigate("/return/confirm")}>
            <CheckCircle2 className="w-4 h-4" />
            归还确认
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-xs text-slate-500 mb-1">待接收</div>
          <div className="text-3xl font-bold text-blue-600">{list.length}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-slate-500 mb-1">今日已接收</div>
          <div className="text-3xl font-bold text-emerald-600">
            {useStore.getState().returnRecords.filter((r) => {
              const today = new Date().toDateString();
              return new Date(r.receive_time).toDateString() === today;
            }).length}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-slate-500 mb-1">阅览中</div>
          <div className="text-3xl font-bold text-purple-600">
            {useStore.getState().returnRecords.filter((r) => r.status !== "returned").length}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-slate-500 mb-1">今日已归还</div>
          <div className="text-3xl font-bold text-archive-gold-600">
            {useStore.getState().returnRecords.filter((r) => {
              if (!r.return_time) return false;
              const today = new Date().toDateString();
              return new Date(r.return_time).toDateString() === today;
            }).length}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-end">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9 text-sm"
              placeholder="搜索档案/申请人..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[680px] overflow-y-auto">
          {list.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <Package className="w-14 h-14 mx-auto text-slate-300 mb-3" />
              <div className="text-slate-400">暂无待接收档案</div>
            </div>
          )}
          {list.map((app) => {
            const arc = getArchiveById(app.archive_id);
            const shelf = arc ? getShelfById(arc.shelf_id) : undefined;
            const applicant = getUserById(app.user_id);
            return (
              <div
                key={app.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate group-hover:text-archive-navy-700 transition">
                      {arc?.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-slate-400 font-mono">{arc?.code}</span>
                      {arc && <StatusBadge kind="level" value={arc.level} />}
                    </div>
                  </div>
                  <StatusBadge kind="application" value={app.status} pulse />
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>来自 {shelf?.code} · {arc?.layer}层{arc?.cell}格</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{applicant?.name} · {applicant?.department}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>出库 {formatRelativeTime(app.apply_time)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">📅</span>
                    <span>应还：{formatDate(app.expect_read_time, "MM-DD HH:mm")}</span>
                  </div>
                </div>

                <button
                  className="w-full btn-primary py-2"
                  onClick={() => setSelected(app)}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  接收登记
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="接收档案确认"
        width="max-w-xl"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setSelected(null)}>
              取消
            </button>
            <button className="btn-primary" onClick={handleReceive}>
              <CheckCircle2 className="w-4 h-4" />
              确认接收
            </button>
          </>
        }
      >
        {selected && (() => {
          const arc = getArchiveById(selected.archive_id);
          const applicant = getUserById(selected.user_id);
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-archive-navy-50/60 border border-archive-navy-100">
                <div className="text-xs text-slate-500 mb-1">档案</div>
                <div className="font-serif text-lg font-semibold text-archive-navy-700">
                  {arc?.title}
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-sm">
                  <span className="text-slate-500 font-mono">{arc?.code}</span>
                  {arc && <StatusBadge kind="level" value={arc.level} />}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500 mb-1">申请人</div>
                  <div className="font-medium">{applicant?.name}</div>
                  <div className="text-xs text-slate-400">{applicant?.department}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">调阅事由</div>
                  <div className="text-slate-700 line-clamp-2">{selected.reason}</div>
                </div>
              </div>
              <div>
                <label className="input-label flex items-center gap-2">
                  <Armchair className="w-4 h-4" />
                  分配阅览位
                </label>
                <select
                  className="input"
                  value={seatNo}
                  onChange={(e) => setSeatNo(e.target.value)}
                >
                  {seatOptions.map((s) => (
                    <option key={s} value={s}>
                      阅览位 {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                接收完成后，档案状态将变更为"阅览中"，并通知申请人到阅览位就坐
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
