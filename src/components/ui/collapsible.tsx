"use client"

import * as React from "react"
import { cn } from "@/src/lib/utils"

const Collapsible = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { open?: boolean, onOpenChange?: (open: boolean) => void, defaultOpen?: boolean }
>(({ className, open: controlledOpen, onOpenChange, defaultOpen, children, ...props }, ref) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen || false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : uncontrolledOpen

    const setOpen = React.useCallback((value: boolean) => {
        if (!isControlled) {
            setUncontrolledOpen(value)
        }
        onOpenChange?.(value)
    }, [isControlled, onOpenChange])

    return (
        <div
            ref={ref}
            data-state={open ? "open" : "closed"}
            className={cn(className)}
            {...props}
        >
            <CollapsibleContext.Provider value={{ open, setOpen }}>
                {children}
            </CollapsibleContext.Provider>
        </div>
    )
})
Collapsible.displayName = "Collapsible"

const CollapsibleTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, onClick, ...props }, ref) => {
    const { open, setOpen } = useCollapsible()

    return (
        <button
            ref={ref}
            className={cn(className)}
            onClick={(e) => {
                setOpen(!open)
                onClick?.(e)
            }}
            data-state={open ? "open" : "closed"} // for styling
            {...props}
        >
            {children}
        </button>
    )
})
CollapsibleTrigger.displayName = "CollapsibleTrigger"

const CollapsibleContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { open } = useCollapsible()

    if (!open) return null

    return (
        <div
            ref={ref}
            className={cn("overflow-hidden animate-in slide-in-from-top-1", className)}
            {...props}
        >
            {children}
        </div>
    )
})
CollapsibleContent.displayName = "CollapsibleContent"

/* Context */
interface CollapsibleContextValue {
    open: boolean
    setOpen: (open: boolean) => void
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | undefined>(undefined)

function useCollapsible() {
    const context = React.useContext(CollapsibleContext)
    if (!context) {
        throw new Error("useCollapsible must be used within a Collapsible")
    }
    return context
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
