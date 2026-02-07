import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: string;
  completedSteps?: string[];
}

export function StepIndicator({ steps, currentStep, completedSteps = [] }: StepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);
  
  return (
    <div className="flex items-center justify-center py-4 px-6 bg-card border-b border-border">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id) || index < currentIndex;
          const isCurrent = step.id === currentStep;
          
          return (
            <div key={step.id} className="flex items-center">
              {/* Step indicator */}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                    isCompleted 
                      ? "bg-accent text-accent-foreground" 
                      : isCurrent 
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isCompleted 
                      ? "text-accent" 
                      : isCurrent 
                        ? "text-primary"
                        : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    "w-16 h-1 mx-3 rounded-full transition-colors",
                    isCompleted ? "bg-accent" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
