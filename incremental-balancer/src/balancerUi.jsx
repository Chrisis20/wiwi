import React from "react";
import { positive, updateArrayItem, removeArrayItem } from "./balancerLogic";

const ICONS = {
  app: "▣",
  economy: "$",
  warning: "!",
  upgrade: "×",
  area: "→",
  chart: "↗",
  trash: "-"
};

export function Icon({ name, className = "w-5 h-5" }) {
  return <span aria-hidden="true" className={`${className} inline-flex items-center justify-center rounded-md bg-slate-700 text-white font-black leading-none select-none shadow-sm`}>{ICONS[name] || "•"}</span>;
}

export function NumberField({ label, value, setValue, min = 0, step = 1, suffix = "" }) {
  const shownValue = Number.isFinite(Number(value)) ? value : "";
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-200">{label}</label>
      <div className="flex items-center gap-2">
        <input type="number" min={min} step={step} value={shownValue} onChange={(event) => setValue(Number(event.target.value))} className="h-9 w-full rounded-xl bg-slate-950 border border-slate-600 px-3 text-white placeholder:text-slate-400" />
        {suffix && <span className="text-xs font-semibold text-slate-200 w-12">{suffix}</span>}
      </div>
    </div>
  );
}

export function TextField({ label, value, setValue }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-200">{label}</label>
      <input value={value || ""} onChange={(event) => setValue(event.target.value)} className="h-9 w-full rounded-xl bg-slate-950 border border-slate-600 px-3 text-white placeholder:text-slate-400" />
    </div>
  );
}

export function CurrencySelect({ model, value, onChange, includeAll = false }) {
  const fallback = model.currencies[0]?.id || "currency_1";
  const validValue = value === "all" && includeAll ? "all" : model.currencies.some((currency) => currency.id === value) ? value : fallback;
  return (
    <select value={validValue} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-xl bg-slate-950 border border-slate-600 px-3 text-sm text-white">
      {includeAll && <option value="all">All currencies</option>}
      {model.currencies.map((currency) => <option key={currency.id} value={currency.id}>{currency.name}</option>)}
    </select>
  );
}

export function CurrencyAmountRows({ title, model, entries, onChange, addLabel, emptyText = "None" }) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const fallbackCurrencyId = model.currencies[0]?.id || "currency_1";
  const updateEntry = (index, patch) => onChange(updateArrayItem(safeEntries, index, patch));
  const removeEntry = (index) => onChange(removeArrayItem(safeEntries, index));
  const addEntry = () => onChange([...safeEntries, { currencyId: fallbackCurrencyId, amount: 0 }]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-200">{title}</label>
        <button type="button" className="h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white px-3 text-sm" onClick={addEntry}>{addLabel}</button>
      </div>
      {safeEntries.length === 0 && <p className="text-xs text-slate-300 rounded-xl bg-slate-950 border border-slate-700 p-2">{emptyText}</p>}
      {safeEntries.map((entry, index) => (
        <div key={`${entry.currencyId}_${index}`} className="grid grid-cols-12 gap-2 items-end rounded-xl bg-slate-950 border border-slate-700 p-2">
          <div className="col-span-5">
            <label className="text-[11px] font-semibold text-slate-300">Currency</label>
            <CurrencySelect model={model} value={entry.currencyId} onChange={(currencyId) => updateEntry(index, { currencyId })} />
          </div>
          <div className="col-span-5">
            <label className="text-[11px] font-semibold text-slate-300">Amount</label>
            <input type="number" min={0} value={Number.isFinite(Number(entry.amount)) ? entry.amount : ""} onChange={(event) => updateEntry(index, { amount: positive(event.target.value, 0) })} className="h-9 w-full rounded-xl bg-slate-950 border border-slate-600 px-3 text-white" />
          </div>
          <button type="button" className="col-span-2 h-9 rounded-xl border border-red-400 text-red-100 hover:bg-red-900" onClick={() => removeEntry(index)}><Icon name="trash" className="w-4 h-4 mx-auto" /></button>
        </div>
      ))}
    </div>
  );
}
