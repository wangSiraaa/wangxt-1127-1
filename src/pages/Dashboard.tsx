import { TrendingUp, FileText, PackageCheck, AlertTriangle, ClipboardList } from "lucide-react";
import { useStore } from "@/store";
import { useNavigate } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, formatRelativeTime } from "@/utils/dateUtils";
import { showToast } from "@/components/ui/Toast";

const stats = [
  {
    label: "本月申请数",
    key: "total",
    icon: FileText,
    gradient: "from-archive-navy-500 to-archive-navy-600",
    link: "/application",
  },
  {
    label: "调卷中",
    key: "dispatching",
    icon: PackageCheck,
    gradient: "from-blue-500 to-indigo-500",
    link: "/dispatch",
  },
  {
    label: "阅览中",
    key: "reading",
    icon: ClipboardList,
    gradient: "from-purple-500 to-fuchsia-500",
    link: "/return/reading",
  },
  {
    label: "逾期数",
    key: "overdue",
    icon: AlertTriangle,
    gradient: "from-red-500 to-rose-500",
    link: "/return/overdue",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const applications = useStore((s) => s.applications);
  const archives = useStore((s) => s.archives);
  const currentUser = useStore((s) => s.getCurrentUser());

  const statCounts = {
    total: applications.length,
    dispatching: applications.filter((a) => a.status === "dispatching").length,
    reading: applications.filter((a) => a.status === "reading").length,
    overdue: archives.filter((a) => a.status === "overdue").length,
  };

  const pendingApproval = applications.filter((a) => a.status === "pending_approval").length;
  const pendingDispatch = applications.filter((a) => a.status === "approved").length;
  const pendingReceive = applications.filter((a) => a.status === "dispatching").length;
  const activeOverdue = archives.filter((a) => a.status === "overdue").length;

  const recentApps = [...applications]
    .sort((a, b) => new Date(b.apply_time).getTime() - new Date(a.apply_time).getTime())
    .slice(0, 6);

  const todoItems = [
    {
      count: pendingApproval,
      label: "待审批申请",
      color: "amber",
      link: "/application",
      role: ["approver"],
    },
    {
      count: pendingDispatch,
      label: "待派单申请",
      color: "blue",
      link: "/dispatch",
      role: ["staff"],
    },
    {
      count: pendingReceive,
      label: "待接收档案",
      color: "purple",
      link: "/return/receive",
      role: ["reader"],
    },
    {
      count: activeOverdue,
      label: "逾期未归还",
      color: "red",
      link: "/return/overdue",
      role: ["user", "reader", "approver", "staff"],
    },
  ];

  const colorMap: Record<string, string> = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-archive-navy-700">
            欢迎回来，{currentUser?.name}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {formatDate(new Date(), "YYYY年MM月DD日")} · 档案馆密集架调卷管理工作台
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => navigate("/application/new")}>
            <FileText className="w-4 h-4" />
            提交新申请
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.key}
              onClick={() => navigate(s.link)}
              className={`stat-card bg-gradient-to-br ${s.gradient} cursor-pointer hover:scale-[1.02] transition-transform`}
            >
              <div className="flex items-start justify-between mb-3 relative z-10">
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <TrendingUp className="w-5 h-5 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="text-3xl font-bold">{statCounts[s.key as keyof typeof statCounts]}</div>
                <div className="text-sm text-white/80 mt-1">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-archive-navy-700">待办事项</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {todoItems.map((t) => {
              const visible = currentUser ? t.role.includes(currentUser.role) : true;
              if (!visible) return null;
              return (
                <div
                  key={t.label}
                  onClick={() => navigate(t.link)}
                  className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all ${colorMap[t.color]}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold">{t.count}</div>
                    <div className="font-medium">{t.label}</div>
                  </div>
                  {t.count > 0 && (
                    <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-serif text-lg font-semibold text-archive-navy-700 mb-4">今日动态</h2>
          <div className="relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />
            <div className="space-y-4">
              {recentApps.map((app) => {
                const archive = useStore.getState().getArchiveById(app.archive_id);
                const color =
                  app.status === "completed"
                    ? "emerald"
                    : app.status === "rejected"
                    ? "red"
                    : app.status === "pending_approval"
                    ? "amber"
                    : "blue";
                return (
                  <div
                    key={app.id}
                    onClick={() => navigate(`/application/${app.id}`)}
                    className="relative pl-9 cursor-pointer group"
                  >
                    <div
                      className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center bg-${color}-100 border-2 border-white shadow`}
                      style={{
                        backgroundColor:
                          color === "emerald"
                            ? "#d1fae5"
                            : color === "red"
                            ? "#fee2e2"
                            : color === "amber"
                            ? "#fef3c7"
                            : "#dbeafe",
                      }}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-${color}-500`}
                        style={{
                          backgroundColor:
                            color === "emerald"
                              ? "#10b981"
                              : color === "red"
                              ? "#ef4444"
                              : color === "amber"
                              ? "#f59e0b"
                              : "#3b82f6",
                        }}
                      />
                    </div>
                    <div
                      className={`text-xs text-slate-400 group-hover:text-${color}-600 transition`}
                    >
                      {formatRelativeTime(app.apply_time)}
                    </div>
                    <div className="text-sm font-medium text-slate-700 group-hover:text-archive-navy-600 transition truncate">
                      {archive?.title || "档案"}
                    </div>
                    <div className="mt-1">
                      <StatusBadge kind="application" value={app.status} />
                    </div>
                  </div>
                );
              })}
              {recentApps.length === 0 && (
                <div className="text-sm text-slate-400 text-center py-8">暂无动态</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
