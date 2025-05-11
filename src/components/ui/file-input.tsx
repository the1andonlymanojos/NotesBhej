"use client"

import * as React from "react"

export interface FileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  multiple?: boolean
}

export function FileInput({ className, ...props }: FileInputProps) {
  return (
    <input
      type="file"
      className={`block w-full text-sm text-zinc-500 dark:text-zinc-400
        file:mr-4 file:py-2 file:px-4
        file:rounded-full file:border-0
        file:text-sm file:font-semibold
        file:bg-indigo-50 file:text-indigo-700
        dark:file:bg-indigo-900 dark:file:text-indigo-300
        hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800
        cursor-pointer ${className}`}
      {...props}
    />
  )
} 