"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  ShoppingCart,
  Users,
  Package,
  Wallet,
  Receipt,
  Layers,
  Settings,
  ScanLine,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Camera,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getBusinessProfile, BusinessProfile } from "@/lib/storage";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const SIDEBAR_COLLAPSE_EVENT = "GSTLENS_SIDEBAR_COLLAPSE_CHANGED";

export default function AppSidebar() {
  const pathname = usePathname();
  const { userProfile } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("gstlens_sidebar_collapsed", String(next));
        window.dispatchEvent(
          new CustomEvent(SIDEBAR_COLLAPSE_EVENT, { detail: { isCollapsed: next } })
        );
      }
      return next;
    });
  }, []);

  useEffect(() => {
    getBusinessProfile().then(setProfile).catch(() => {});

    if (typeof window !== "undefined") {
      const savedCollapse = localStorage.getItem("gstlens_sidebar_collapsed") === "true";
      setIsCollapsed(savedCollapse);
    }

    const handleToggle = () => {
      if (typeof window !== "undefined" && window.innerWidth >= 768) {
        toggleCollapse();
      } else {
        setMobileOpen((prev) => !prev);
      }
    };
    window.addEventListener("TOGGLE_APP_SIDEBAR", handleToggle);

    // Ctrl+B keyboard shortcut to toggle sidebar
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        handleToggle();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("TOGGLE_APP_SIDEBAR", handleToggle);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleCollapse]);

  const isUnlimited = Boolean(
    userProfile?.unlimited_credits ||
    (userProfile?.subscription?.active && (
      userProfile?.subscription?.unlimited_credits === true ||
      userProfile?.subscription?.unlimited_credits === "true" ||
      userProfile?.subscription?.plan?.toLowerCase().includes("unlimited")
    ))
  );

  // Main navigation items
  const mainGroups: NavGroup[] = [
    {
      group: "Core billing",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: <Home className="w-4 h-4" /> },
        { label: "Invoices & sales", href: "/invoices", icon: <FileText className="w-4 h-4" /> },
        { label: "Purchase bills", href: "/purchases", icon: <ShoppingCart className="w-4 h-4" /> },
        { label: "Parties & ledgers", href: "/clients", icon: <Users className="w-4 h-4" /> },
        { label: "Items & stock", href: "/inventory", icon: <Package className="w-4 h-4" /> },
        { label: "Expenses", href: "/expenses", icon: <Wallet className="w-4 h-4" /> },
        { label: "Payment receipts", href: "/receipts", icon: <Receipt className="w-4 h-4" /> },
      ],
    },
    {
      group: "GST returns & tax",
      items: [
        { label: "GSTR-1 outward", href: "/gstr-1", icon: <FileText className="w-4 h-4" /> },
        { label: "GSTR-2B reconcile", href: "/gstr-2b", icon: <Layers className="w-4 h-4" /> },
        { label: "GSTR-3B tax summary", href: "/gstr-3b", icon: <Layers className="w-4 h-4" /> },
      ],
    },
  ];

  const footerItems: NavItem[] = [
    {
      label: "OCR credits",
      href: "/credits",
      icon: <ScanLine className="w-4 h-4" />,
      badge: isUnlimited ? "∞" : `${userProfile?.credits ?? 0}`,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#fafaf9] dark:bg-[#12110f] border-r border-black/[0.08] dark:border-white/[0.08] select-none text-[13px]">
      
      {/* 1. Brand Header */}
      <div
        className={`h-14 flex items-center border-b border-black/[0.08] dark:border-white/[0.08] shrink-0 px-3 ${
          isCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden min-w-0">
          <div className="w-8 h-8 bg-emerald-700 text-white rounded-lg flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <div
            className={`overflow-hidden transition-all duration-200 whitespace-nowrap ${
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            }`}
          >
            <span className="font-semibold text-stone-900 dark:text-stone-100 text-sm tracking-tight truncate block leading-none">
              GST<span className="text-emerald-700 dark:text-emerald-400">Lens</span>
            </span>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate max-w-[140px] mt-1 font-normal">
              {profile?.tradeName || profile?.businessName || "Ledger & returns"}
            </p>
          </div>
        </Link>

        {!isCollapsed && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden md:flex p-1.5 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition cursor-pointer"
            title="Collapse sidebar (Ctrl+B)"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-md text-stone-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Primary Action Bar */}
      <div className="p-2 shrink-0">
        {isCollapsed ? (
          <Link
            href="/invoices/new"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium text-xs transition"
            title="Create new invoice"
          >
            <Plus className="w-4 h-4" />
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            <Link
              href="/invoices/new"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium text-xs transition"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>New invoice</span>
            </Link>
            <Link
              href="/purchases"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white dark:bg-[#1a1917] hover:bg-stone-100 dark:hover:bg-[#23211e] text-stone-800 dark:text-stone-200 rounded-lg font-medium text-xs border border-black/[0.08] dark:border-white/[0.08] transition"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>Scan bill</span>
            </Link>
          </div>
        )}
      </div>

      {/* 3. Core Navigation Items */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 space-y-3">
        {mainGroups.map((grp) => (
          <div key={grp.group} className="space-y-0.5">
            {!isCollapsed && (
              <p className="px-2.5 py-1 text-[11px] font-medium text-stone-400 dark:text-stone-500">
                {grp.group}
              </p>
            )}
            {grp.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-2.5 rounded-lg text-xs font-normal transition-colors ${
                    active
                      ? "bg-stone-200/70 dark:bg-white/[0.08] text-stone-900 dark:text-stone-100 font-medium"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                  } ${isCollapsed ? "justify-center p-2" : "px-2.5 py-1.5"}`}
                >
                  <span
                    className={`shrink-0 ${
                      active
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-stone-400 dark:text-stone-500"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <div
                    className={`overflow-hidden transition-all duration-200 flex items-center justify-between flex-1 ${
                      isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-1.5 tabular-nums">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* 4. Pinned Bottom Footer */}
      <div className="mt-auto p-2 border-t border-black/[0.08] dark:border-white/[0.08] shrink-0 space-y-0.5 bg-[#f6f5f3] dark:bg-[#0f0e0d]">
        {footerItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-2.5 rounded-lg text-xs font-normal transition-colors ${
                active
                  ? "bg-stone-200/70 dark:bg-white/[0.08] text-stone-900 dark:text-stone-100 font-medium"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
              } ${isCollapsed ? "justify-center p-2" : "px-2.5 py-1.5"}`}
            >
              <span className={`shrink-0 ${active ? "text-emerald-700 dark:text-emerald-400" : "text-stone-400 dark:text-stone-500"}`}>
                {item.icon}
              </span>
              <div
                className={`overflow-hidden transition-all duration-200 flex items-center justify-between flex-1 ${
                  isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                }`}
              >
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-1.5 tabular-nums">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={toggleCollapse}
          className={`hidden md:flex items-center rounded-lg text-xs text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition cursor-pointer ${
            isCollapsed ? "justify-center p-2 w-full" : "justify-between px-2.5 py-1.5 w-full"
          }`}
          title={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-stone-500 hover:text-emerald-700 dark:hover:text-emerald-400" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <PanelLeftClose className="w-4 h-4" />
                <span>Collapse</span>
              </div>
              <kbd className="text-[10px] font-mono bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-1.5 py-0.5 rounded border border-black/[0.05] dark:border-white/[0.05]">
                Ctrl+B
              </kbd>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden md:block fixed left-0 top-0 bottom-0 z-40 transition-all duration-200 ease-out ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-200 ${
          mobileOpen ? "visible" : "invisible pointer-events-none"
        }`}
      >
        <div
          className={`fixed inset-0 bg-stone-950/40 backdrop-blur-xs transition-opacity duration-200 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={`fixed inset-y-0 left-0 w-64 max-w-[80vw] shadow-xl z-50 transition-transform duration-200 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
