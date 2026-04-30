import React from "react"

export default function PaymentIcon({ type, className = "h-4 w-4" }) {
  const common = { className, width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" }

  if (type === "cash") return (
    <svg {...common} aria-hidden>
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 9h16" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    </svg>
  )

  if (type === "mpesa") return (
    <svg {...common} aria-hidden>
      <path d="M3 7c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 11h10M7 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 9.5c0-.83.672-1.5 1.5-1.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  if (type === "bank") return (
    <svg {...common} aria-hidden>
      <path d="M12 3l9 5.5v1H3v-1L12 3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M6 10v6M10 10v6M14 10v6M18 10v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="3" y="16" width="18" height="2" rx="1" fill="currentColor" opacity="0.06" />
    </svg>
  )

  return null
}
