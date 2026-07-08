import { useId } from 'react'
import './Dropdown.scss'

type PropType = {
  label: React.ReactNode
  children: React.ReactNode
  // Extra classes for the toggle button (e.g. 'btn-primary').
  buttonClassName?: string
}

// Generic dropdown built on the native Popover API + CSS anchor positioning
// (Chromium). Open/light-dismiss/Esc are handled natively by the popover; the
// menu anchors itself just below the toggle button. useId gives each instance
// a unique popover id and anchor name so multiple dropdowns don't collide.
export function Dropdown({ label, children, buttonClassName }: PropType) {
  const id = useId()
  const popoverId = `dropdown-${id}`
  const anchorName = `--dropdown-${id.replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        popoverTarget={popoverId}
        style={{ anchorName } as React.CSSProperties}
      >
        {label}
      </button>
      <div
        id={popoverId}
        popover="auto"
        className="dropdown-menu"
        style={{ positionAnchor: anchorName } as React.CSSProperties}
      >
        {children}
      </div>
    </>
  )
}
