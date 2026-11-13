"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Edit3,
  Trash2,
  X,
  Layers,
  ArrowUpDown,
  CheckCircle,
  Tag,
  TrendingUp,
  Boxes,
  BadgeAlert,
} from "lucide-react";
import { Header } from "@/components/header";
import {
  Product,
  getAllProducts,
  saveProduct,
  deleteProduct,
  adjustProductStock,
} from "@/lib/storage";
import {
  BUILTIN_UNITS,
  GST_RATES,
  formatINR,
} from "@/lib/gstBillingEngine";
import toast from "react-hot-toast";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState<string>("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState<number>(0);

  // Form states
  const [name, setName] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [hsn, setHsn] = useState<string>("");
  const [unit, setUnit] = useState<string>("Pcs");
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(18);
  const [stock, setStock] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [description, setDescription] = useState<string>("");
  const [isService, setIsService] = useState<boolean>(false);

  const loadProducts = async () => {
    try {
      const data = await getAllProducts();
      setProducts(data);
    } catch (err: any) {
      toast.error("Failed to load products: " + err.message);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setName("");
    setSku("");
    setHsn("");
    setUnit("Pcs");
    setPurchasePrice(0);
    setSellingPrice(0);
    setTaxPercent(18);
    setStock(10);
    setMinStockAlert(5);
    setDescription("");
    setIsService(false);
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku || "");
    setHsn(p.hsn || "");
    setUnit(p.unit || "Pcs");
    setPurchasePrice(p.purchasePrice || 0);
    setSellingPrice(p.sellingPrice || 0);
    setTaxPercent(p.taxPercent || 18);
    setStock(p.stock || 0);
    setMinStockAlert(p.minStockAlert ?? 5);
    setDescription(p.description || "");
    setIsService(p.isService || false);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }

    const payload: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: name.trim(),
      sku: sku.trim() || undefined,
      hsn: hsn.trim() || undefined,
      unit,
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      taxPercent: Number(taxPercent) || 0,
      stock: isService ? 9999 : Number(stock) || 0,
      minStockAlert: Number(minStockAlert) || 0,
      description: description.trim() || undefined,
      isService,
      created_at: editingProduct ? editingProduct.created_at : Date.now(),
    };

    try {
      await saveProduct(payload);
      toast.success(`Saved ${payload.name}`);
      setShowModal(false);
      loadProducts();
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    }
  };

  const handleDelete = async (id: string, prodName: string) => {
    if (!confirm(`Delete product "${prodName}"?`)) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Product deleted");
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    try {
      await adjustProductStock(adjustingProduct.id, Number(stockDelta));
      toast.success("Stock adjusted successfully");
      setShowAdjustModal(false);
      loadProducts();
    } catch (err: any) {
      toast.error("Stock adjustment failed: " + err.message);
    }
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q) ||
      (p.hsn || "").toLowerCase().includes(q);

    if (stockFilter === "low") {
      return matchesSearch && !p.isService && p.stock <= (p.minStockAlert ?? 5) && p.stock > 0;
    }
    if (stockFilter === "out") {
      return matchesSearch && !p.isService && p.stock <= 0;
    }
    return matchesSearch;
  });

  const lowStockCount = products.filter(
    (p) => !p.isService && p.stock <= (p.minStockAlert ?? 5) && p.stock > 0
  ).length;

  const outOfStockCount = products.filter(
    (p) => !p.isService && p.stock <= 0
  ).length;

  const totalInventoryValuation = products
    .filter((p) => !p.isService)
    .reduce((acc, p) => acc + (p.stock || 0) * (p.purchasePrice || p.sellingPrice || 0), 0);

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] text-slate-900 dark:text-slate-100 pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Title */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-[#047857] dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800/50 shadow-xs">
              <Package className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                Inventory & Products Catalog
              </h1>
              <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400">
                Track stock levels, HSN codes, default GST rates, and automated stock replenishment alerts.
              </p>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-medium rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item / Service</span>
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
          <div className="bg-white dark:bg-[#1a1a1c] p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
            <div className="flex items-center justify-between text-stone-400 text-xs font-semibold uppercase tracking-wider">
              <span>Total Catalog Items</span>
              <span className="p-1.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg">
                <Boxes className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold font-mono tabular-nums text-stone-900 dark:text-stone-100 mt-2">
              {products.length}
            </p>
            <p className="text-[11px] text-stone-400 mt-1">
              {products.filter((p) => p.isService).length} services, {products.filter((p) => !p.isService).length} goods
            </p>
          </div>

          <div className="bg-white dark:bg-[#1a1a1c] p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
            <div className="flex items-center justify-between text-stone-400 text-xs font-semibold uppercase tracking-wider">
              <span>Low / Out of Stock</span>
              <span className="p-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800/50">
                <BadgeAlert className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold font-mono tabular-nums text-amber-700 dark:text-amber-400 mt-2">
              {lowStockCount + outOfStockCount}
            </p>
            <p className="text-[11px] text-stone-400 mt-1">
              {outOfStockCount} out of stock, {lowStockCount} below minimum threshold
            </p>
          </div>

          <div className="bg-white dark:bg-[#1a1a1c] p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
            <div className="flex items-center justify-between text-stone-400 text-xs font-semibold uppercase tracking-wider">
              <span>Stock Valuation (Cost)</span>
              <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-[#047857] dark:text-emerald-400 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold font-mono tabular-nums text-[#047857] dark:text-emerald-400 mt-2">
              {formatINR(totalInventoryValuation)}
            </p>
            <p className="text-[11px] text-stone-400 mt-1">Current assets on shelf</p>
          </div>
        </div>

        {/* Low Stock Warning Banner */}
        {lowStockCount + outOfStockCount > 0 && stockFilter === "all" && (
          <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-2xl shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-amber-950 dark:text-amber-200">
                  Stock Alert: {lowStockCount + outOfStockCount} item{lowStockCount + outOfStockCount > 1 ? "s" : ""} require replenishment
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Some items are depleted or have dropped below your safety threshold.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStockFilter("low")}
              className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium rounded-lg shadow-xs transition"
            >
              Filter Low Stock
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-[#1a1a1c] p-3 rounded-xl border border-stone-200/80 dark:border-stone-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by product name, SKU or HSN code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#fafaf9] dark:bg-[#141415] border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#047857]"
            />
          </div>

          <div className="flex bg-stone-100 dark:bg-stone-800/60 p-1 rounded-xl text-xs font-medium border border-stone-200/60 dark:border-stone-800">
            {(["all", "low", "out"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setStockFilter(t)}
                className={`px-3.5 py-1.5 rounded-xl capitalize transition-all ${
                  stockFilter === t
                    ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200 dark:border-stone-700/60 font-medium"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t === "all" ? "All Products" : t === "low" ? "Low Stock" : "Out of Stock"}
              </button>
            ))}
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white dark:bg-[#1a1a1c] rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-20 text-center space-y-3 px-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-stone-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-base font-medium text-stone-900 dark:text-stone-100">
                No inventory items found
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
                {search || stockFilter !== "all"
                  ? "No items match your search or filter criteria. Try resetting the filter."
                  : "Add your goods and services to manage stock levels and automate bill creation."}
              </p>
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded-2xl shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                Add First Item
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#fafaf9] dark:bg-[#141415]/60 text-slate-500 font-bold border-b border-slate-200/80 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Item & SKU</th>
                    <th className="py-3.5 px-4">HSN/SAC</th>
                    <th className="py-3.5 px-4">Purchase Price</th>
                    <th className="py-3.5 px-4">Selling Price</th>
                    <th className="py-3.5 px-4">Tax</th>
                    <th className="py-3.5 px-4">Stock on Hand</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
                  {filtered.map((p) => {
                    const isLow = !p.isService && p.stock <= (p.minStockAlert ?? 5) && p.stock > 0;
                    const isOut = !p.isService && p.stock <= 0;

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-stone-900 dark:text-stone-100">{p.name}</div>
                          {p.sku && (
                            <div className="text-[10px] font-mono text-stone-400 dark:text-slate-500">
                              SKU: {p.sku}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-stone-600 dark:text-stone-400">
                          {p.hsn || "—"}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-stone-600 dark:text-stone-400">
                          {formatINR(p.purchasePrice)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                          {formatINR(p.sellingPrice)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 font-mono text-[10px]">
                            {p.taxPercent}% GST
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {p.isService ? (
                            <span className="text-stone-400 font-semibold text-xs">Service</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1 rounded-full text-[11px] font-bold tabular-nums ${
                                  isOut
                                    ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60"
                                    : isLow
                                    ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60"
                                    : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                                }`}
                              >
                                {p.stock} {p.unit}
                              </span>
                              <button
                                onClick={() => {
                                  setAdjustingProduct(p);
                                  setStockDelta(0);
                                  setShowAdjustModal(true);
                                }}
                                className="text-[11px] text-[#047857] dark:text-emerald-400 hover:underline font-medium"
                              >
                                Adjust
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(p)}
                              title="Edit Item"
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id, p.name)}
                              title="Delete Item"
                              className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-600 rounded-xl transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1c] rounded-2xl w-full max-w-lg p-6 shadow-xl border border-stone-200/80 dark:border-stone-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-base font-medium text-stone-900 dark:text-stone-100">
                {editingProduct ? "Edit Item / Service" : "Add New Item to Inventory"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-stone-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Item / Service Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wireless Mouse or Legal Consultation"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#047857]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    SKU / Item Code
                  </label>
                  <input
                    type="text"
                    placeholder="SKU-1001"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#047857]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    placeholder="8471 or 9983"
                    value={hsn}
                    onChange={(e) => setHsn(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#047857]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#047857]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[#047857]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GST Rate
                  </label>
                  <select
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#047857]"
                  >
                    {GST_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r}% GST
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Unit of Measurement
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#047857]"
                  >
                    {BUILTIN_UNITS.map((u) => (
                      <option key={u.uqc} value={u.label}>
                        {u.label} ({u.uqc})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isService"
                    checked={isService}
                    onChange={(e) => setIsService(e.target.checked)}
                    className="rounded border-slate-300 text-[#047857] focus:ring-[#047857]"
                  />
                  <label htmlFor="isService" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    This is a Service (does not require physical inventory tracking)
                  </label>
                </div>

                {!isService && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Current Stock on Hand
                      </label>
                      <input
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#047857]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Low Stock Alert Level
                      </label>
                      <input
                        type="number"
                        value={minStockAlert}
                        onChange={(e) => setMinStockAlert(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#047857]"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-medium shadow-xs transition"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Stock Adjustment Modal */}
      {showAdjustModal && adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1c] rounded-2xl w-full max-w-sm p-6 shadow-xl border border-stone-200/80 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-base font-medium text-stone-900 dark:text-stone-100">Adjust Stock Level</h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-stone-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <p className="font-medium text-stone-900 dark:text-stone-100 text-sm">{adjustingProduct.name}</p>
              <p className="text-slate-500">
                Current Stock:{" "}
                <span className="font-mono font-medium text-stone-900 dark:text-stone-100">
                  {adjustingProduct.stock} {adjustingProduct.unit}
                </span>
              </p>
            </div>

            <form onSubmit={handleStockAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Stock Change (+ for restock, - for wastage / shrinkage)
                </label>
                <input
                  type="number"
                  required
                  placeholder="+10 or -5"
                  value={stockDelta}
                  onChange={(e) => setStockDelta(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-[#047857]"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  New resulting stock:{" "}
                  <span className="font-mono font-bold text-[#047857] dark:text-emerald-400">
                    {adjustingProduct.stock + stockDelta} {adjustingProduct.unit}
                  </span>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-medium shadow-xs transition"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
