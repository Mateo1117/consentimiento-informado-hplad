import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConsentTypeCardProps {
  icon: LucideIcon;
  title: string;
  code?: string;
  isActive?: boolean;
  onClick?: () => void;
  iconBgColor?: string;
  iconColor?: string;
}

export function ConsentTypeCard({
  icon: Icon,
  title,
  code,
  isActive,
  onClick,
  iconBgColor = "bg-primary/10",
  iconColor = "text-primary"
}: ConsentTypeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left w-full",
        "hover:shadow-md hover:border-primary/30",
        isActive 
          ? "border-primary bg-primary/5 shadow-md" 
          : "border-border bg-card hover:bg-card/80"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
        iconBgColor
      )}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-sm truncate",
          isActive ? "text-primary" : "text-foreground"
        )}>
          {title}
        </p>
        {code && (
          <p className="text-xs text-muted-foreground truncate">
            {code}
          </p>
        )}
      </div>
    </button>
  );
}
