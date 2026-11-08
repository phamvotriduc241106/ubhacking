"use client";

import type { ReactNode } from "react";
import type { AnalysisResult, ReportSections } from "@/lib/types";

function Section({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <section className="report-section"><h3 className="report-bar"><span>{number}</span>{title}</h3><div className="report-section-body">{children}</div></section>;
}
function Value({ label, value }: { label: string; value: ReactNode }) {
  return <div className="report-value"><span>{label}</span><strong>{value}</strong></div>;
}
function List({ items }: { items: string[] }) { return <ul className="report-list">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>; }

function FruitChart({ counts }: { counts: Record<string, number> }) {
  const entries = [
    { key: "ripe", label: "Apparently ripe", color: "#c55b4e" },
    { key: "half_ripe", label: "Half-ripe", color: "#c28b36" },
    { key: "raw", label: "Unripe", color: "#609b66" },
  ].map(item => ({ ...item, count: Math.max(0, counts[item.key] ?? 0) }));
  const total = entries.reduce((sum, item) => sum + item.count, 0);
  return <figure className="report-chart" aria-label="AI-predicted fruit counts">
    <figcaption>Fruit by predicted color stage</figcaption>
    {total > 0 ? entries.map(item => <div className="report-chart-row" key={item.key}>
      <span>{item.label}</span><div className="report-chart-track" aria-hidden="true"><div className="report-chart-bar" style={{ width: `${(item.count / total) * 100}%`, backgroundColor: item.color }} /></div><strong>{item.count}</strong>
    </div>) : <p className="report-chart-empty">No fruit candidates detected.</p>}
    <p className="report-note">Model predictions, not confirmed ripeness. Spoilage flags may overlap these counts.</p>
  </figure>;
}

export function ReportTemplate({ result, sections }: { result: AnalysisResult; sections: ReportSections }) {
  const meta = result.reportMeta;
  const date = meta?.date && !Number.isNaN(Date.parse(meta.date)) ? new Date(meta.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "Unavailable";
  const count = sections.fruit_counts;
  const display = (v: number | null, unit: string) => v == null ? "Unavailable" : `${v} ${unit}`;
  return <article className="folland-report" aria-label="FolLand crop analysis report">
    <header className="report-header"><div><p className="report-brand">FOLLAND</p><p className="report-subtitle">CROP ANALYSIS REPORT</p></div><div className="report-mark" aria-hidden="true">✳</div></header>
    <div className="report-intro">A clearer view of your crop <span>·</span> Evidence-led guidance for your next steps</div>
    <div className="report-metadata"><Value label="Crop" value={meta?.crop || "Unavailable"}/><Value label="Report date" value={date}/><Value label="Analysis ID" value={meta?.id || "Unavailable"}/><Value label="Data provenance" value={`${sections.sensor_mode} readings · ${result.report?.source === "gemini" ? "AI-assisted narrative" : "rule-based report"}`}/></div>
    <Section number="01" title="Executive Summary"><p>{sections.executive_summary}</p><p className="report-callout">{count ? `AI-predicted candidates: ${count.ripe ?? 0} ripe · ${count.half_ripe ?? 0} half-ripe · ${count.raw ?? 0} unripe · ${count.rotten ?? 0} flagged for possible spoilage` : "Fruit detection unavailable — no counts are claimed."}</p>{count && count.rotten > 0 && <p className="report-note">Spoilage flags can overlap with other categories and require inspection.</p>}</Section>
    <Section number="02" title="Plant Observations"><div className="report-columns"><div><h4>Fruit · {sections.observation_source}</h4><p>{sections.fruit_observation}</p></div><div><h4>Leaves · {sections.observation_source}</h4><p>{sections.leaf_observation}</p></div></div></Section>
    <Section number="03" title="Harvest Readiness"><p className="report-status">Decision: {sections.harvest_status.replace(/_/g, " ")}</p><p>{sections.harvest_recommendation}</p><p className="report-note">Counts and visual classifications are predictions; verify each fruit in person.</p>{count && <FruitChart counts={count}/>}</Section>
    <Section number="04" title="Environmental Conditions"><div className="report-columns"><div><h4>Air · {sections.sensor_mode.replace(/_/g, " ")}</h4><p>Temperature: {display(sections.air_temperature_c, "°C")}<br/>Relative humidity: {display(sections.air_humidity_pct, "%")}<br/>Source: {sections.sensor_source}</p></div><div><h4>Weather · {sections.weather_mode}</h4><p>{sections.weather_description || "Unavailable"}<br/>Temperature: {display(sections.weather_temperature_c, "°C")}<br/>Source: {sections.weather_source}</p></div></div></Section>
    <Section number="05" title="Watering Guidance"><p>{sections.watering}</p><h4>Supporting evidence</h4><List items={sections.watering_evidence}/></Section>
    <Section number="06" title="Fertilizer and Plant Health"><p>{sections.fertilizer}</p><h4>Limitations</h4><List items={sections.fertilizer_limitations}/></Section>
    <Section number="07" title="Recommended Next Actions"><List items={sections.next_actions}/></Section>
    <Section number="08" title="Confidence and Limitations"><List items={sections.limitations}/></Section>
    <section className="report-conclusion"><p>09 &nbsp; CONCLUSION</p><h3>Care for what matters.</h3><div>{sections.conclusion}</div></section>
    <footer className="report-footer">FOLLAND <span>Crop analysis · Decision support, not a diagnosis</span></footer>
  </article>;
}
