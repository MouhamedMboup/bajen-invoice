"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  className,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  function handleTriggerClick() {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleSelect(option: Option) {
    onValueChange(option.value);
    close();
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Closed state: styled button matching SelectTrigger */}
      {!open ? (
        <button
          type="button"
          onClick={handleTriggerClick}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm h-8 whitespace-nowrap transition-colors outline-none select-none",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "dark:bg-input/30 dark:hover:bg-input/50"
          )}
        >
          <span
            className={cn(
              "flex-1 text-left truncate",
              !value && "text-muted-foreground"
            )}
          >
            {selectedLabel || placeholder}
          </span>
          <ChevronDown className="size-4 text-muted-foreground shrink-0 pointer-events-none" />
        </button>
      ) : (
        /* Open state: search input replacing the trigger */
        <div className="flex w-full items-center gap-1.5 rounded-lg border border-ring ring-3 ring-ring/50 bg-transparent pr-2 pl-2.5 h-8">
          <Search className="size-4 text-muted-foreground shrink-0 pointer-events-none" />
          <input
            ref={inputRef}
            className="flex-1 min-w-0 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered.length === 1) {
                e.preventDefault();
                handleSelect(filtered[0]);
              }
            }}
          />
          <ChevronDown className="size-4 text-muted-foreground shrink-0 pointer-events-none" />
        </div>
      )}

      {/* Dropdown list */}
      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full min-w-48 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 overflow-hidden"
        >
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-4 text-sm text-center text-muted-foreground">
                No results
              </p>
            ) : (
              filtered.map((option) => (
                <div
                  key={option.value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(option);
                  }}
                  className={cn(
                    "relative flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm select-none",
                    "hover:bg-accent hover:text-accent-foreground",
                    value === option.value && "bg-accent/40"
                  )}
                >
                  <span className="flex-1">{option.label}</span>
                  {value === option.value && (
                    <Check className="absolute right-2 size-4 shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
