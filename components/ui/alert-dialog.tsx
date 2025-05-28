import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface AlertDialogContentProps {
  className?: string
  children: React.ReactNode
}

interface AlertDialogHeaderProps {
  className?: string
  children: React.ReactNode
}

interface AlertDialogTitleProps {
  className?: string
  children: React.ReactNode
}

interface AlertDialogDescriptionProps {
  className?: string
  children: React.ReactNode
}

interface AlertDialogFooterProps {
  className?: string
  children: React.ReactNode
}

interface AlertDialogActionProps {
  className?: string
  onClick?: () => void
  children: React.ReactNode
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  disabled?: boolean
}

interface AlertDialogCancelProps {
  className?: string
  onClick?: () => void
  children: React.ReactNode
  disabled?: boolean
}

const AlertDialog = ({ open, onOpenChange, children }: AlertDialogProps) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={() => onOpenChange(false)}
      />
      {/* Dialog */}
      <div className="relative z-50">
        {children}
      </div>
    </div>
  )
}

const AlertDialogContent = ({ className, children }: AlertDialogContentProps) => (
  <div
    className={cn(
      "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
      className
    )}
  >
    {children}
  </div>
)

const AlertDialogHeader = ({ className, children }: AlertDialogHeaderProps) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}>
    {children}
  </div>
)

const AlertDialogTitle = ({ className, children }: AlertDialogTitleProps) => (
  <h2 className={cn("text-lg font-semibold", className)}>
    {children}
  </h2>
)

const AlertDialogDescription = ({ className, children }: AlertDialogDescriptionProps) => (
  <p className={cn("text-sm text-muted-foreground", className)}>
    {children}
  </p>
)

const AlertDialogFooter = ({ className, children }: AlertDialogFooterProps) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}>
    {children}
  </div>
)

const AlertDialogAction = ({ 
  className, 
  onClick, 
  children, 
  variant = "default",
  disabled = false
}: AlertDialogActionProps) => (
  <Button
    className={cn("mt-2 sm:mt-0", className)}
    onClick={onClick}
    variant={variant}
    disabled={disabled}
  >
    {children}
  </Button>
)

const AlertDialogCancel = ({ className, onClick, children, disabled = false }: AlertDialogCancelProps) => (
  <Button
    variant="outline"
    className={cn("mt-2 sm:mt-0", className)}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </Button>
)

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} 