import {
  LayoutDashboard,
  FileText,
  Warehouse,
  BookOpen,
  AlertTriangle,
  LogOut,
  Archive,
  BarChart3,
  Search,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "@/store";
import { userRoleMap } from "@/utils/statusMapper";

const navGroups = [
  {
    title: "工作台",
    items: [{ path: "/dashboard", label: "首页概览", icon: LayoutDashboard }],
  },
  {
    title: "利用申请",
    items: [
      { path: "/application", label: "申请列表", icon: FileText },
      { path: "/application/new", label: "提交申请", icon: Archive },
    ],
  },
  {
    title: "库房调卷",
    items: [
      { path: "/dispatch", label: "密集架派单", icon: Warehouse },
      { path: "/dispatch/outbound", label: "出库登记", icon: BarChart3 },
      { path: "/dispatch/inventory", label: "盘点管理", icon: Search },
    ],
  },
  {
    title: "阅览归还",
    items: [
      { path: "/return/receive", label: "接收登记", icon: BookOpen },
      { path: "/return/reading", label: "阅览管理", icon: FileText },
      { path: "/return/confirm", label: "归还确认", icon: RefreshCw },
      { path: "/return/overdue", label: "逾期管理", icon: AlertTriangle },
    ],
  },
];

const breadcrumbMap: Record<string, string[]> = {
  "/dashboard": ["工作台", "首页概览"],
  "/application": ["利用申请", "申请列表"],
  "/application/new": ["利用申请", "提交申请"],
  "/dispatch": ["库房调卷", "密集架派单"],
  "/dispatch/outbound": ["库房调卷", "出库登记"],
  "/dispatch/inventory": ["库房调卷", "盘点管理"],
  "/return/receive": ["阅览归还", "接收登记"],
  "/return/reading": ["阅览归还", "阅览管理"],
  "/return/confirm": ["阅览归还", "归还确认"],
  "/return/overdue": ["阅览归还", "逾期管理"],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.getCurrentUser());
  const resetAll = useStore((s) => s.resetAll);
  const setCurrentUser = useStore((s) => s.setCurrentUser);

  const getBreadcrumb = (): string[] => {
    const path = location.pathname;
    if (breadcrumbMap[path]) return breadcrumbMap[path];
    for (const key of Object.keys(breadcrumbMap)) {
      if (path.startsWith(key) && path !== key) {
        return [...breadcrumbMap[key], "详情"];
      }
    }
    return ["工作台"];
  };

  const crumbs = getBreadcrumb();

  const handleLogout = () => {
    if (confirm("确定重置所有数据并退出？")) {
      resetAll();
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-screen z-20">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-200 bg-gradient-to-r from-archive-navy-500 to-archive-navy-600">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Archive className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-white font-serif text-base font-semibold">档案馆密集架</div>
            <div className="text-white/70 text-xs">调卷管理系统</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        isActive ? "sidebar-item-active" : "sidebar-item-inactive"
                      }
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-500">切换角色</label>
          </div>
          <select
            value={currentUser?.id}
            onChange={(e) => setCurrentUser(e.target.value)}
            className="input text-xs"
          >
            {useStore.getState().users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {userRoleMap[u.role]}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-archive-navy-400 to-archive-gold-500 flex items-center justify-center text-white text-sm font-semibold">
              {currentUser?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">
                {currentUser?.name}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {userRoleMap[currentUser?.role || "user"]} · {currentUser?.department}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
              title="重置数据"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-10 flex items-center px-6 justify-between">
          <div className="flex items-center gap-2 text-sm">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-slate-300">/</span>}
                <span
                  className={
                    i === crumbs.length - 1
                      ? "text-archive-navy-700 font-medium"
                      : "text-slate-500"
                  }
                >
                  {c}
                </span>
              </span>
            ))}
          </div>
          <div className="text-xs text-slate-400">
            {new Date().toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
