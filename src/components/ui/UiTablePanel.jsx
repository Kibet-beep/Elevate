import { UiCard, UiCardHeader } from "./UiCard"

export default function UiTablePanel({ title, subtitle, right, children, className = "" }) {
  return (
    <UiCard className={`overflow-hidden ${className}`}>
      {title ? <UiCardHeader title={title} subtitle={subtitle} right={right} /> : null}
      <div className="overflow-x-auto">{children}</div>
    </UiCard>
  )
}