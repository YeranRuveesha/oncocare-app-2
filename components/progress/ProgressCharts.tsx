"use client";

import { Children, Fragment, isValidElement, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DayPoint, Progress } from "@/lib/progressCalc";
import { cn } from "@/lib/utils";

const NAVY = "#0F4C81", TEAL = "#1B7A7E", AMBER = "#B45309", CRIMSON = "#DC2626", GRID = "#E2E8F0", AXIS = "#64748B";
const MARK = { routine: TEAL, urgent: AMBER, emergency: CRIMSON, escalated: "#7C3AED" } as const;

type Col = { key: string; label: string };
// Recharts only looks at its DIRECT children, so fragments are opened up first.
const flat = (n: ReactNode): ReactNode[] => Children.toArray(n).flatMap((c) => (isValidElement(c) && c.type === Fragment ? flat((c.props as { children?: ReactNode }).children) : [c]));
const axisProps = { stroke: AXIS, fontSize: 11, tickLine: false } as const;
const tip = { contentStyle: { borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }, labelStyle: { fontWeight: 600 } };

function Card({ title, caption, rows, cols, children }: { title: string; caption: string; rows: Record<string, unknown>[]; cols: Col[]; children: React.ReactNode }) {
  const [table, setTable] = useState(false);
  const empty = !rows.some((r) => cols.slice(1).some((c) => r[c.key] !== null && r[c.key] !== undefined));
  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-display text-base font-bold text-ink">{title}</h3>
        <button type="button" onClick={() => setTable((t) => !t)} aria-pressed={table} className="shrink-0 rounded border px-2 py-1 text-xs font-medium hover:bg-muted">{table ? "Show chart" : "Show table"}</button>
      </div>
      {table ? (
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">{title}</caption>
            <thead><tr>{cols.map((c) => <th key={c.key} scope="col" className="sticky top-0 bg-white px-2 py-1 font-semibold">{c.label}</th>)}</tr></thead>
            <tbody>{rows.filter((r) => cols.slice(1).some((c) => r[c.key] !== null && r[c.key] !== undefined)).map((r, i) => <tr key={i} className="border-t">{cols.map((c) => <td key={c.key} className="px-2 py-1 tabular-nums">{r[c.key] === null || r[c.key] === undefined ? "–" : String(r[c.key])}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : empty ? (
        <p className="grid h-48 place-items-center rounded-lg bg-muted/40 text-sm text-muted-foreground">No data yet for this period.</p>
      ) : (
        <div className="h-56 w-full" role="img" aria-label={`${title}. ${caption}`}>{children}</div>
      )}
      <p className="mt-2 text-xs text-slate-600">{caption}</p>
    </section>
  );
}

/** The 8 charts. The same component is used by the patient and by the clinician Statistics tab. */
export default function ProgressCharts({ data, showMarkers = false }: { data: Progress; showMarkers?: boolean }) {
  const [xMode, setXMode] = useState<"date" | "day">("date");
  const hasDay = data.days.some((d) => d.dayN !== null);
  const days = data.days.map((d) => ({ ...d, x: xMode === "day" && d.dayN !== null ? `+${d.dayN}` : d.label }));
  const xl = xMode === "day" ? "Day +N after transplant" : "Date";
  const rowsD = (cols: Col[]) => days.map((d) => ({ [cols[0].key]: d.x, ...Object.fromEntries(cols.slice(1).map((c) => [c.key, d[c.key as keyof DayPoint]])) }));
  const markers = showMarkers ? days.filter((d) => d.marker) : [];
  const line = (key: string, color: string, name: string, dash?: string) => <Line type="linear" dataKey={key} name={name} stroke={color} strokeWidth={2} strokeDasharray={dash} dot={{ r: 3, fill: color, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />;
  const chart = (children: React.ReactNode, domain?: [number | string, number | string], legend = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={days} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="x" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...axisProps} domain={domain ?? ["auto", "auto"]} width={44} tickFormatter={(v: number) => String(Math.round(v * 10) / 10)} />
        <Tooltip {...tip} />
        {legend && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />}
        {flat(children)}
      </LineChart>
    </ResponsiveContainer>
  );
  const wk = data.weeks;
  const rowsW = (cols: Col[]) => wk.map((w) => ({ [cols[0].key]: w.label, ...Object.fromEntries(cols.slice(1).map((c) => [c.key, w[c.key as keyof typeof w]])) }));
  const bars = (keys: { k: string; c: string; n: string }[], stack = false, max?: number) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={wk} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={40} domain={max ? [0, max] : undefined} allowDecimals={false} />
        <Tooltip {...tip} cursor={{ fill: "#F1F5F9" }} />
        <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
        {keys.map((k) => <Bar key={k.k} dataKey={k.k} name={k.n} fill={k.c} stackId={stack ? "s" : undefined} radius={stack ? 0 : [4, 4, 0, 0]} stroke="#fff" strokeWidth={stack ? 2 : 0} isAnimationActive={false} />)}
      </BarChart>
    </ResponsiveContainer>
  );
  const c = { temp: [{ key: "x", label: xl }, { key: "temp", label: "Temperature °C" }], hr: [{ key: "x", label: xl }, { key: "hr", label: "Heart rate" }], bp: [{ key: "x", label: xl }, { key: "sys", label: "Systolic" }, { key: "dia", label: "Diastolic" }],
    w: [{ key: "x", label: xl }, { key: "weight", label: "Weight kg" }], s: [{ key: "x", label: xl }, { key: "spo2", label: "SpO₂ %" }], pf: [{ key: "x", label: xl }, { key: "pain", label: "Pain" }, { key: "fatigue", label: "Tiredness" }], walk: [{ key: "x", label: xl }, { key: "walking", label: "Walking min" }] };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold">Horizontal axis:</span>
        {(["date", "day"] as const).map((m) => (
          <button key={m} type="button" disabled={m === "day" && !hasDay} aria-pressed={xMode === m} onClick={() => setXMode(m)} className={cn("rounded-full border px-3 py-1 font-medium disabled:opacity-40", xMode === m ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-muted")}>{m === "date" ? "Date" : "Day +N"}</button>
        ))}
        {showMarkers && <span className="ml-auto flex flex-wrap gap-3 text-muted-foreground">{(Object.keys(MARK) as (keyof typeof MARK)[]).map((k) => <span key={k} className="flex items-center gap-1"><span className="inline-block h-3 w-0.5" style={{ background: MARK[k] }} /> {k} report</span>)}</span>}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card title="1. Temperature" caption={data.captions.temp} rows={rowsD(c.temp)} cols={c.temp}>
          {chart(<>
            <ReferenceLine y={38} stroke={CRIMSON} strokeDasharray="4 4" label={{ value: "38.0 °C", fill: CRIMSON, fontSize: 11, position: "insideTopRight" }} />
            {markers.map((m) => <ReferenceLine key={m.date} x={m.x} stroke={MARK[m.marker!]} strokeWidth={2} />)}
            {line("temp", NAVY, "Temperature °C")}
          </>, [35, 40])}
        </Card>
        <Card title="2. Heart rate" caption={data.captions.hr} rows={rowsD(c.hr)} cols={c.hr}>{chart(<>{line("hr", TEAL, "Heart rate (bpm)")}</>)}</Card>
        <Card title="3. Blood pressure" caption={data.captions.bp} rows={rowsD(c.bp)} cols={c.bp}>{chart(<>{line("sys", NAVY, "Systolic")}{line("dia", TEAL, "Diastolic", "5 4")}</>, undefined, true)}</Card>
        <div className="grid gap-4">
          <Card title="4a. Weight" caption={data.captions.weight} rows={rowsD(c.w)} cols={c.w}>{chart(<>{line("weight", NAVY, "Weight (kg)")}</>)}</Card>
          <Card title="4b. Oxygen level (SpO₂)" caption="Only days you recorded it are shown." rows={rowsD(c.s)} cols={c.s}>{chart(<>{line("spo2", TEAL, "SpO₂ (%)")}</>, [70, 100])}</Card>
        </div>
        <Card title="5. Pain and tiredness" caption={data.captions.pain} rows={rowsD(c.pf)} cols={c.pf}>{chart(<>{line("pain", NAVY, "Pain")}{line("fatigue", TEAL, "Tiredness", "5 4")}</>, [0, 10], true)}</Card>
        <div className="grid gap-4">
          <Card title="6a. Walking minutes per day" caption={data.captions.walk} rows={rowsD(c.walk)} cols={c.walk}>
            <ResponsiveContainer width="100%" height="100%"><BarChart data={days} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}><CartesianGrid stroke={GRID} vertical={false} /><XAxis dataKey="x" {...axisProps} interval="preserveStartEnd" minTickGap={24} /><YAxis {...axisProps} width={40} /><Tooltip {...tip} cursor={{ fill: "#F1F5F9" }} /><Bar dataKey="walking" name="Walking (min)" fill={TEAL} radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer>
          </Card>
          <Card title="6b. Exercise completion per week" caption="Share of planned exercises you did that week." rows={rowsW([{ key: "label", label: "Week from" }, { key: "exPct", label: "Done %" }, { key: "exMinutes", label: "Minutes" }])} cols={[{ key: "label", label: "Week from" }, { key: "exPct", label: "Done %" }, { key: "exMinutes", label: "Minutes" }]}>{bars([{ k: "exPct", c: NAVY, n: "Done (%)" }], false, 100)}</Card>
        </div>
        <Card title="7. Self-care consistency" caption={data.captions.self} rows={rowsW([{ key: "label", label: "Week from" }, { key: "mouth", label: "Mouth care %" }, { key: "emollient", label: "Moisturiser %" }, { key: "meds", label: "Medicines %" }])} cols={[{ key: "label", label: "Week from" }, { key: "mouth", label: "Mouth care %" }, { key: "emollient", label: "Moisturiser %" }, { key: "meds", label: "Medicines %" }]}>
          {bars([{ k: "mouth", c: TEAL, n: "Mouth care" }, { k: "emollient", c: NAVY, n: "Moisturiser" }, { k: "meds", c: AMBER, n: "Medicines" }], false, 100)}
        </Card>
        <Card title="8. Symptom reports per week" caption={data.captions.reports} rows={rowsW([{ key: "label", label: "Week from" }, { key: "routine", label: "Routine" }, { key: "urgent", label: "Urgent" }, { key: "emergency", label: "Emergency" }])} cols={[{ key: "label", label: "Week from" }, { key: "routine", label: "Routine" }, { key: "urgent", label: "Urgent" }, { key: "emergency", label: "Emergency" }]}>
          {bars([{ k: "routine", c: TEAL, n: "Routine" }, { k: "urgent", c: AMBER, n: "Urgent" }, { k: "emergency", c: CRIMSON, n: "Emergency" }], true)}
        </Card>
      </div>
      <p className="mt-4 rounded-lg bg-white p-3 text-xs text-muted-foreground">These charts show what you recorded. Talk to your care team about what they mean. Missing days are left empty on purpose.</p>
    </div>
  );
}
