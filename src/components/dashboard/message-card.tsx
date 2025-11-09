import type { ReactNode } from "react"
import Image from "next/image"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faReply, faTimes } from "@fortawesome/free-solid-svg-icons"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { MessageCardData } from "@/types/dashboard"

export type MessageAction =
  | {
      type: "accept" | "decline" | "reply"
      label: string
      onClick?: () => void
    }
  | {
      type: "custom"
      label: string
      icon?: ReactNode
      onClick?: () => void
    }

export type MessageCardProps = MessageCardData & {
  actions?: MessageAction[]
  className?: string
}

const ACTION_ICON_MAP: Record<string, React.ReactNode> = {
  accept: <FontAwesomeIcon icon={faReply} className="size-3.5" />, // using reply icon for accept by default
  decline: <FontAwesomeIcon icon={faTimes} className="size-3.5" />,
  reply: <FontAwesomeIcon icon={faReply} className="size-3.5" />,
}

export function MessageCard({
  senderName,
  senderAvatarUrl,
  timestampLabel,
  messagePreview,
  actions = [],
  className,
}: MessageCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border/50 bg-white/90 p-4 shadow-soft transition-colors hover:bg-primary-50",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative size-8 overflow-hidden rounded-full bg-primary-200">
            {senderAvatarUrl ? (
              <Image
                src={senderAvatarUrl}
                alt={senderName}
                fill
                className="object-cover"
                sizes="32px"
              />
            ) : (
              <span className="grid size-full place-items-center text-xs font-semibold uppercase text-primary-700">
                {senderName
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </span>
            )}
          </div>
          <span className="text-sm font-semibold text-primary-800">{senderName}</span>
        </div>
        <span className="text-xs text-muted-foreground">{timestampLabel}</span>
      </div>
      <p className="text-sm leading-relaxed text-primary-700/80">{messagePreview}</p>
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant={action.type === "accept" ? "secondary" : action.type === "decline" ? "outline" : "ghost"}
              onClick={action.onClick}
              className={cn(
                action.type === "accept" && "bg-secondary-600 hover:bg-secondary-700 text-white",
                action.type === "decline" && "border border-border/70 text-primary-700 hover:bg-primary-100"
              )}
            >
              <span className="inline-flex items-center gap-1 text-xs font-semibold">
                {(action.type === "custom" && action.icon) || ACTION_ICON_MAP[action.type] || null}
                <span>{action.label}</span>
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
