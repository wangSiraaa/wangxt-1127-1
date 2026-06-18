import { useState, useEffect } from "react";
import { Play, Square, Search, Clock, User, Armchair, Timer } from "lucide-react";
import { useStore } from "@/store";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, formatRelativeTime } from "@/utils/dateUtils";
import { showToast } from "@/components/ui/Toast";

function useElapsed(startTime?: string) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    if (!startTime) {
      setElapsed("");
      return;
    }
    const calc = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const diff = Math.max(0, now - start);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [startTime]);
  return elapsed;
}

function ElapsedDisplay({ time }: { time?: string }) {
  const elapsed = useElapsed(time);
  if (!time || !elapsed) return <span className="text-slate-400">-</span>;
  return (
    <span className="font-mono text-lg font-bold text-archive-navy-600 tabular-nums">
      {elapsed}
    </span>
  );
}

export default function ReturnReading() {
  const returnRecords = useStore((s) => s.returnRecords);
  const getApplicationById = useStore((s) => s.getApplicationById);
  const getArchiveById = useStore((s) => s.getArchiveById);
  const getUserById = useStore((s) => s.getUserById);
  const startReading = useStore((s) => s.startReading);
  const endReading = useStore((s) => s.endReading);

  const [keyword, setKeyword] = useState("");

  const list = returnRecords
    .filter((r) => r.status !== "returned")
    .filter((r) => {
      if (!keyword) return true;
      const app = getApplicationById(r.application_id);
      const arc = app ? getArchiveById(app.archive_id) : undefined;
      const applicant = app ? getUserById(app.user_id) : undefined;
      const k = keyword.toLowerCase();
      return (
        arc?.title.toLowerCase().includes(k) ||
        arc?.code.toLowerCase().includes(k) ||
        applicant?.name.toLowerCase().includes(k) ||
        (r.seat_no || "").toLowerCase().includes(k)
      );
    })
    .sort((a, b) => new Date(b.receive_time).getTime() - new Date(a.receive_time).getTime());

  const handleStart = (id: string) => {
    startReading(id);
    showToast("开始阅览计时", "success");
  };

  const handleEnd = (id: string) => {
    endReading(id);
    showToast("已结束阅览，可前往确认归还", "info");
  };

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-archive-navy-700">
          阅览管理
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          监控阅览状态 · 共 {list.length} 份档案在阅览区
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm text-blue-700 font-medium">
                已接收：{list.filter((r) => r.status === "received").length}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200">
              <Timer className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-700 font-medium">
                阅览中：{list.filter((r) => r.status === "reading").length}
              </span>
            </div>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9 text-sm"
              placeholder="搜索档案/阅览位/申请人..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">阅览位</th>
                <th className="table-th">档案信息</th>
                <th className="table-th">利用者</th>
                <th className="table-th">接收时间</th>
                <th className="table-th">阅览时长</th>
                <th className="table-th">应归还时间</th>
                <th className="table-th">状态</th>
                <th className="table-th text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const app = getApplicationById(r.application_id);
                const arc = app ? getArchiveById(app.archive_id) : undefined;
                const reader = r.reader_id ? getUserById(r.reader_id) : undefined;
                const applicant = app ? getUserById(app.user_id) : undefined;
                const isOverdue = r.due_time && new Date() > new Date(r.due_time);
                return (
                  <tr key={r.id} className="table-tr-hover">
                    <td className="table-td">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-r from-archive-navid-50 to-archive-gold-50 border border-archive-gold-200 font-semibold text-archive-navy-700">
                        <Armchair className="w-3.5 h-3.5" />
                        {r.seat_no}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="font-medium text-slate-800 max-w-[240px] truncate">
                        {arc?.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400 font-mono">{arc?.code}</span>
                        {arc && <StatusBadge kind="level" value={arc.level} />}
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="font-medium">{applicant?.name}</div>
                          <div className="text-xs text-slate-400">{applicant?.department}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td text-slate-500 text-xs">
                      <div>{formatDate(r.receive_time, "MM-DD HH:mm")}</div>
                      <div className="text-slate-400 mt-0.5">{formatRelativeTime(r.receive_time)}</div>
                    </td>
                    <td className="table-td">
                      <ElapsedDisplay time={r.start_read_time} />
                      {!r.start_read_time && (
                        <div className="text-xs text-slate-400 mt-1">未开始</div>
                      )}
                    </td>
                    <td className="table-td">
                      <div className={isOverdue ? "text-red-600 font-semibold" : "text-slate-700"}>
                        {formatDate(r.due_time, "MM-DD HH:mm")}
                      </div>
                      {isOverdue && (
                        <div className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
                          <Clock className="w-3 h-3" />
                          已逾期
                        </div>
                      )}
                    </td>
                    <td className="table-td">
                      <StatusBadge kind="return" value={r.status} pulse />
                    </td>
                    <td className="table-td text-right">
                      <div className="inline-flex gap-1">
                        {r.status === "received" && (
                          <button
                            onClick={() => handleStart(r.id)}
                            className="btn-success text-xs py-1 px-3"
                          >
                            <Play className="w-3.5 h-3.5" />
                            开始
                          </button>
                        )}
                        {r.status === "reading" && !r.end_read_time && (
                          <button
                            onClick={() => handleEnd(r.id)}
                            className="btn-warning text-xs py-1 px-3"
                          >
                            <Square className="w-3.5 h-3.5" />
                            结束
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <Timer className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <div className="text-slate-400">暂无阅览记录</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
