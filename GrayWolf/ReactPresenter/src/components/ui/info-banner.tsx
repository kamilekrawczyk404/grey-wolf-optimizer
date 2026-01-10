import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import React from "react";

interface InfoBannerProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
    variant?: "blue" | "yellow";
}

export function InfoBanner({ title = "Tip", children, className, variant = "blue" }: InfoBannerProps) {
    return (
        <div className={cn(
            "p-4 rounded-md border",
            variant === "blue" && "bg-blue-900/10 border-blue-900/30",
            variant === "yellow" && "bg-yellow-900/10 border-yellow-900/30",
            className
        )}>
            <h4 className={cn(
                "text-sm font-medium mb-1 flex items-center gap-2",
                variant === "blue" && "text-blue-400",
                variant === "yellow" && "text-yellow-400"
            )}>
                <Info className="h-4 w-4" />
                {title}
            </h4>
            <p className={cn(
                "text-xs",
                variant === "blue" && "text-blue-300/70",
                variant === "yellow" && "text-yellow-300/70"
            )}>
                {children}
            </p>
        </div>
    );
}