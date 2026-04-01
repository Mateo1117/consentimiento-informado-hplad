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
        "flex items-center gap-3 p-4 md:p-5 rounded-xl border-2 transition-all duration-200 text-left w-full min-h-[56px] active:scale-[0.98]",
        "hover:shadow-md hover:border-primary/30",
        isActive 
          ? "border-primary bg-primary/5 shadow-md" 
          : "border-border bg-card hover:bg-card/80"
      )}
    >
      <div className={cn(
        "w-11 h-11 md:w-12 md:h-12 rounded-lg flex items-center justify-center shrink-0",
        iconBgColor
      )}>
        <Icon className={cn("h-5 w-5 md:h-6 md:w-6", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-sm md:text-base truncate",
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
