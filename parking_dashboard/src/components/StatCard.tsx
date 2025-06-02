import { TrendingUp, type LucideIcon } from "lucide-react";

export const StatCard = ({
  title,
  value,
  icon:Icon,
  color,
  trend,
  subtitle,
}: {
  title: string;
  value: number | string;
  color: string;
  trend?: string;
  subtitle: string;
  icon:LucideIcon
}) => (
  <div
    className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${color} transform hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl`}
  >
    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white bg-opacity-10"></div>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <Icon size={32} className="text-white opacity-90" />
        {trend && (
          <div className="flex items-center text-white text-sm bg-white bg-opacity-20 px-2 py-1 rounded-full">
            <TrendingUp size={14} className="mr-1" />
            {trend}
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-white opacity-80 font-medium">{title}</div>
      {subtitle && (
        <div className="text-white opacity-60 text-sm mt-1">{subtitle}</div>
      )}
    </div>
  </div>
);
