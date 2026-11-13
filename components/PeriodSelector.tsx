"use client";

import React, { useMemo } from "react";
import { Calendar } from "lucide-react";

export const MONTHS = [
  { val: "01", name: "January", short: "Jan" },
  { val: "02", name: "February", short: "Feb" },
  { val: "03", name: "March", short: "Mar" },
  { val: "04", name: "April", short: "Apr" },
  { val: "05", name: "May", short: "May" },
  { val: "06", name: "June", short: "Jun" },
  { val: "07", name: "July", short: "Jul" },
  { val: "08", name: "August", short: "Aug" },
  { val: "09", name: "September", short: "Sep" },
  { val: "10", name: "October", short: "Oct" },
  { val: "11", name: "November", short: "Nov" },
  { val: "12", name: "December", short: "Dec" },
];

/**
 * Returns default monthly range for the current calendar month:
 * e.g. startDate: "2026-11-01", endDate: "2026-11-30"
 */
export function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const mStr = String(m + 1).padStart(2, "0");
  return {
    startDate: `${y}-${mStr}-01`,
    endDate: `${y}-${mStr}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function getPresetRanges() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-indexed

  // 1. Current Month
  const curLastDay = new Date(y, m + 1, 0).getDate();
  const curMStr = String(m + 1).padStart(2, "0");
  const currentMonth = {
    start: `${y}-${curMStr}-01`,
    end: `${y}-${curMStr}-${String(curLastDay).padStart(2, "0")}`,
  };

  // 2. Last Month
  const prevY = m === 0 ? y - 1 : y;
  const prevM = m === 0 ? 11 : m - 1;
  const prevLastDay = new Date(prevY, prevM + 1, 0).getDate();
  const prevMStr = String(prevM + 1).padStart(2, "0");
  const lastMonth = {
    start: `${prevY}-${prevMStr}-01`,
    end: `${prevY}-${prevMStr}-${String(prevLastDay).padStart(2, "0")}`,
  };

  // 3. Last 30 Days
  const past30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last30 = {
    start: past30.toISOString().split("T")[0],
    end: today.toISOString().split("T")[0],
  };

  // 4. Current Quarter
  const qMonth = Math.floor(m / 3) * 3;
  const qStart = new Date(y, qMonth, 1);
  const qEnd = new Date(y, qMonth + 3, 0);
  const quarter = {
    start: `${qStart.getFullYear()}-${String(qStart.getMonth() + 1).padStart(2, "0")}-01`,
    end: `${qEnd.getFullYear()}-${String(qEnd.getMonth() + 1).padStart(2, "0")}-${String(qEnd.getDate()).padStart(2, "0")}`,
  };

  // 5. This Financial Year (April 1 to March 31)
  const fyStartYear = m >= 3 ? y : y - 1;
  const fy = {
    start: `${fyStartYear}-04-01`,
    end: `${fyStartYear + 1}-03-31`,
  };

  return { currentMonth, lastMonth, last30, quarter, fy };
}

export type PresetKey = "current_month" | "last_month" | "last_30" | "quarter" | "fy" | "custom";

export function getActivePreset(startDate: string, endDate: string): PresetKey {
  const p = getPresetRanges();
  if (startDate === p.currentMonth.start && endDate === p.currentMonth.end) return "current_month";
  if (startDate === p.lastMonth.start && endDate === p.lastMonth.end) return "last_month";
  if (startDate === p.last30.start && endDate === p.last30.end) return "last_30";
  if (startDate === p.quarter.start && endDate === p.quarter.end) return "quarter";
  if (startDate === p.fy.start && endDate === p.fy.end) return "fy";
  return "custom";
}

export function getActivePresetLabel(startDate: string, endDate: string): string {
  const key = getActivePreset(startDate, endDate);
  switch (key) {
    case "current_month":
      return "Current Month";
    case "last_month":
      return "Last Month";
    case "last_30":
      return "Last 30 Days";
    case "quarter":
      return "Current Quarter";
    case "fy":
      return "Financial Year";
    default:
      return "Custom Range";
  }
}

/**
 * Normalizes any date string (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY) into ISO YYYY-MM-DD
 */
export function toComparableDate(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const cleaned = dateStr.replace(/[./]/g, "-").trim();
  const parts = cleaned.split("-");
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const y = parts[0];
      const m = parts[1].padStart(2, "0");
      const d = parts[2].padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    // DD-MM-YYYY
    const d = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    let y = parts[2];
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m}-${d}`;
  }
  return "";
}

/**
 * Formats a YYYY-MM-DD date into human friendly Indian date string: e.g. "01 Nov 2026"
 */
export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    const y = parts[0];
    const mIdx = parseInt(parts[1], 10) - 1;
    const d = parts[2];
    const mName = MONTHS[mIdx]?.short || parts[1];
    return `${d} ${mName} ${y}`;
  }
  return isoDate;
}

export interface PeriodSelectorProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (startDate: string, endDate: string) => void;
  className?: string;
}

export function PeriodSelector({
  startDate,
  endDate,
  onChange,
  className = "",
}: PeriodSelectorProps) {
  const presets = useMemo(() => getPresetRanges(), []);
  const activePreset = useMemo(() => getActivePreset(startDate, endDate), [startDate, endDate]);

  const handleApplyPreset = (key: Exclude<PresetKey, "custom">) => {
    if (key === "current_month") onChange(presets.currentMonth.start, presets.currentMonth.end);
    else if (key === "last_month") onChange(presets.lastMonth.start, presets.lastMonth.end);
    else if (key === "last_30") onChange(presets.last30.start, presets.last30.end);
    else if (key === "quarter") onChange(presets.quarter.start, presets.quarter.end);
    else if (key === "fy") onChange(presets.fy.start, presets.fy.end);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Quick Pills - tapping any pill directly updates the date selector */}
      <div className="flex items-center gap-1 text-xs flex-wrap">
        <button
          type="button"
          onClick={() => handleApplyPreset("current_month")}
          className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 text-xs ${
            activePreset === "current_month"
              ? "bg-[#047857] text-white shadow-2xs"
              : "bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700/80"
          }`}
          title="Current month"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Current month</span>
        </button>

        <button
          type="button"
          onClick={() => handleApplyPreset("last_month")}
          className={`px-2.5 py-1.5 rounded-xl font-medium transition cursor-pointer text-xs ${
            activePreset === "last_month"
              ? "bg-[#047857] text-white shadow-2xs"
              : "bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700/80"
          }`}
        >
          Last month
        </button>

        <button
          type="button"
          onClick={() => handleApplyPreset("last_30")}
          className={`px-2.5 py-1.5 rounded-xl font-medium transition cursor-pointer text-xs ${
            activePreset === "last_30"
              ? "bg-[#047857] text-white shadow-2xs"
              : "bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700/80"
          }`}
        >
          Last 30 days
        </button>

        <button
          type="button"
          onClick={() => handleApplyPreset("quarter")}
          className={`px-2.5 py-1.5 rounded-xl font-medium transition cursor-pointer text-xs ${
            activePreset === "quarter"
              ? "bg-[#047857] text-white shadow-2xs"
              : "bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700/80"
          }`}
        >
          Quarter
        </button>

        <button
          type="button"
          onClick={() => handleApplyPreset("fy")}
          className={`px-2.5 py-1.5 rounded-xl font-medium transition cursor-pointer text-xs ${
            activePreset === "fy"
              ? "bg-[#047857] text-white shadow-2xs"
              : "bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700/80"
          }`}
        >
          FY
        </button>
      </div>

      {/* Date Selector: Updates smoothly on pill click, or allows custom date entry */}
      <div className="inline-flex items-center gap-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl px-2.5 py-1.5 shadow-2xs">
        <span className="text-[11px] font-semibold text-stone-400">From</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onChange(e.target.value, endDate)}
          className="bg-transparent text-xs font-semibold text-stone-900 dark:text-stone-100 dark:[color-scheme:dark] focus:outline-none cursor-pointer"
        />
        <span className="text-[11px] font-semibold text-stone-400">To</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onChange(startDate, e.target.value)}
          className="bg-transparent text-xs font-semibold text-stone-900 dark:text-stone-100 dark:[color-scheme:dark] focus:outline-none cursor-pointer"
        />
      </div>
    </div>
  );
}
