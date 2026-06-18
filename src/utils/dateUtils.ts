export const generateId = (prefix: string = "id"): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}${random}`;
};

export const formatDate = (date: Date | string, fmt: string = "YYYY-MM-DD HH:mm"): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  const map: Record<string, string> = {
    YYYY: d.getFullYear().toString(),
    MM: String(d.getMonth() + 1).padStart(2, "0"),
    DD: String(d.getDate()).padStart(2, "0"),
    HH: String(d.getHours()).padStart(2, "0"),
    mm: String(d.getMinutes()).padStart(2, "0"),
    ss: String(d.getSeconds()).padStart(2, "0"),
  };
  return fmt.replace(/YYYY|MM|DD|HH|mm|ss/g, (match) => map[match]);
};

export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  return formatDate(d, "YYYY-MM-DD");
};

export const addDays = (date: Date | string, days: number): Date => {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const addHours = (date: Date | string, hours: number): Date => {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
};

export const daysBetween = (start: Date | string, end: Date | string): number => {
  const s = typeof start === "string" ? new Date(start).getTime() : start.getTime();
  const e = typeof end === "string" ? new Date(end).getTime() : end.getTime();
  return Math.ceil((e - s) / (1000 * 60 * 60 * 24));
};

export const isOverdue = (dueTime: Date | string): boolean => {
  const due = typeof dueTime === "string" ? new Date(dueTime) : dueTime;
  return new Date() > due;
};
