import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/src/lib/utils";

// Since we didn't install cva and radix-ui/react-slot, I will iterate to a simpler version without those dependencies for now,
// OR I should install them. The plan said "recharts clsx tailwind-merge".
// I will implement a simpler version without cva/slot to avoid extra installs unless strictly needed,
// but cva is very standard. I'll stick to a simpler implementation for speed and stability unless requested otherwise.

// Actually, let's make it robust but without extra deps if possible, or just use clsx/tailwind-merge manually.

const buttonVariants = (
  variant: string = "default",
  size: string = "default",
  className?: string,
) => {
  const base =
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  const variants: Record<string, string> = {
    default: "bg-primary text-white hover:bg-primary/90",
    destructive:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline:
      "border border-input bg-white hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  };

  const sizes: Record<string, string> = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };

  return cn(base, variants[variant], sizes[size], className);
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      ...props
    },
    ref,
  ) => {
    // asChild is ignored here for simplicity as we don't have Radix Slot
    return (
      <button
        className={buttonVariants(variant, size, className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
