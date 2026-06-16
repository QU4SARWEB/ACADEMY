'use client'

import { type ReactNode } from 'react'

export default function ConfirmDeleteForm({
  message,
  action,
  children,
}: {
  message: string
  action: (formData: FormData) => void
  children: ReactNode
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) {
          e.preventDefault()
        }
      }}
    >
      {children}
    </form>
  )
}
