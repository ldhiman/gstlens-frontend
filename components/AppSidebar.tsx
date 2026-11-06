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
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Camera,
  X,
  PanelLeftClose,
  PanelLeftOpen,
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

    // Ctrl+B / Cmd+B keyboard shortcut to toggle sidebar
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

  // Main navigation items (compact, zero scroll on desktop)
  const mainGroups: NavGroup[] = [
    {
      group: "Core Billing",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: <Home className="w-4 h-4" /> },
        { label: "Invoices & Sales", href: "/invoices", icon: <FileText className="w-4 h-4" /> },
        { label: "Purchase Bills", href: "/purchases", icon: <ShoppingCart className="w-4 h-4" /> },
        { label: "Parties (Vendors/Clients)", href: "/clients", icon: <Users className="w-4 h-4" /> },
        { label: "Items & Inventory", href: "/inventory", icon: <Package className="w-4 h-4" /> },
        { label: "Expenses", href: "/expenses", icon: <Wallet className="w-4 h-4" /> },
        { label: "Payment Receipts", href: "/receipts", icon: <Receipt className="w-4 h-4" /> },
      ],
    },
    {
      group: "GST Returns & Tax",
      items: [
        { label: "GSTR-1 Outward", href: "/gstr-1", icon: <FileText className="w-4 h-4" /> },
        { label: "GSTR-2B Reconcile", href: "/gstr-2b", icon: <Layers className="w-4 h-4" /> },
        { label: "GSTR-3B Tax Summary", href: "/gstr-3b", icon: <Layers className="w-4 h-4" /> },
      ],
    },
  ];

  // Pinned bottom footer items
  const footerItems: NavItem[] = [
    {
      label: "AI Credits",
      href: "/credits",
      icon: <Sparkles className="w-4 h-4 text-amber-500" />,
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
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 select-none">
      
      {/* 1. Brand Header with Cleanly Integrated Collapse Toggle */}
      <div
        className={`h-14 flex items-center border-b border-slate-200/80 dark:border-slate-800/80 shrink-0 px-3 transition-all duration-300 ${
          isCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 group overflow-hidden min-w-0">
          <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-xs">
            <Receipt className="w-4 h-4" />
          </div>
          <div
            className={`overflow-hidden transition-all duration-300 whitespace-nowrap ${
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            }`}
          >
            <span className="font-black text-slate-900 dark:text-white text-sm tracking-tight truncate block leading-none">
              GST<span className="text-indigo-600 dark:text-indigo-400">Lens</span>
            </span>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[130px] mt-0.5">
              {profile?.tradeName || profile?.businessName || "Billing & Tax"}
            </p>
          </div>
        </Link>

        {/* Embedded Header Collapse Button (Desktop) */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Collapse Sidebar (Ctrl+B)"
            aria-label="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Compact Action Bar (New Bill & Scan) */}
      <div className="p-2 shrink-0">
        {isCollapsed ? (
          <Link
            href="/invoices/new"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-semibold text-xs shadow-xs transition"
            title="Create New Invoice (+)"
          >
            <Plus className="w-4 h-4" />
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            <Link
              href="/invoices/new"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-semibold text-xs shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>New Bill</span>
            </Link>
            <Link
              href="/purchases"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 active:scale-95 text-slate-800 dark:text-slate-200 rounded-xl font-semibold text-xs border border-slate-200 dark:border-slate-700/80 transition"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Scan Bill</span>
            </Link>
          </div>
        )}
      </div>

      {/* 3. Core Navigation Items (Zero Scroll: Compact Height) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-2 py-0.5 space-y-3">
        {mainGroups.map((grp) => (
          <div key={grp.group} className="space-y-0.5">
            <div
              className={`overflow-hidden transition-all duration-300 ${
                isCollapsed ? "h-0 opacity-0 mb-0" : "h-auto opacity-100 mb-0.5"
              }`}
            >
              <p className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">
                {grp.group}
              </p>
            </div>
            {grp.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-2 rounded-xl text-xs font-medium transition-colors ${
                    active
                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-900"
                  } ${isCollapsed ? "justify-center p-2" : "px-2.5 py-1.5"}`}
                >
                  <span
                    className={`shrink-0 ${
                      active
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <div
                    className={`overflow-hidden transition-all duration-300 flex items-center justify-between flex-1 ${
                      isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    }`}
                  >
                    <span className="truncate whitespace-nowrap">{item.label}</span>
                    {item.badge && (
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ml-1.5">
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

      {/* 4. Pinned Bottom Footer (Settings, AI Credits & Embedded Collapse Toggle) */}
      <div className="mt-auto p-2 border-t border-slate-100 dark:border-slate-800/80 shrink-0 space-y-0.5 bg-slate-50/40 dark:bg-slate-950/40">
        {footerItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-2 rounded-xl text-xs font-medium transition-colors ${
                active
                  ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-900"
              } ${isCollapsed ? "justify-center p-2" : "px-2.5 py-1.5"}`}
            >
              <span className="shrink-0">{item.icon}</span>
              <div
                className={`overflow-hidden transition-all duration-300 flex items-center justify-between flex-1 ${
                  isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                }`}
              >
                <span className="truncate whitespace-nowrap">{item.label}</span>
                {item.badge && (
                  <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ml-1.5">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}

        {/* Embedded Bottom Collapse Toggle */}
        <button
          type="button"
          onClick={toggleCollapse}
          className={`hidden md:flex items-center rounded-xl text-xs font-medium text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition cursor-pointer ${
            isCollapsed ? "justify-center p-2 w-full" : "justify-between px-2.5 py-1.5 w-full"
          }`}
          title={isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <PanelLeftClose className="w-4 h-4" />
                <span>Collapse</span>
              </div>
              <kbd className="text-[9px] font-mono bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
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
      {/* Desktop Persistent Sidebar (Zero Scroll, Perfectly Aligned) */}
      <aside
        className={`hidden md:block fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Sliding Drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          mobileOpen ? "visible" : "invisible pointer-events-none"
        }`}
      >
        <div
          className={`fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl z-50 transition-transform duration-300 ease-in-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
