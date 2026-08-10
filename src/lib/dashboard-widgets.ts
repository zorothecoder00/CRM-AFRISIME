export const WIDGET_DEFS = [
  { key: "PROJECT_PROGRESS", label: "Taux d'avancement des projets" },
  { key: "OVERDUE_TASKS", label: "Tâches en retard" },
  { key: "WORKLOAD", label: "Charge de travail" },
  { key: "TIME_SPENT", label: "Temps passé" },
  { key: "DEADLINE_COMPLIANCE", label: "Respect des délais" },
  { key: "TEAM_PRODUCTIVITY", label: "Productivité par équipe" },
  { key: "DEPARTMENT_PERFORMANCE", label: "Performance par département" },
  { key: "HR_INDICATORS", label: "Indicateurs RH" },
] as const;

export type WidgetKey = (typeof WIDGET_DEFS)[number]["key"];

export const DEFAULT_WIDGET_ORDER: WidgetKey[] = WIDGET_DEFS.map((w) => w.key);

export function widgetLabel(key: string): string {
  return WIDGET_DEFS.find((w) => w.key === key)?.label ?? key;
}

/** Valide et filtre une liste de clés stockées (ignore les clés inconnues/obsolètes). */
export function sanitizeWidgetOrder(input: unknown): WidgetKey[] {
  if (!Array.isArray(input)) return DEFAULT_WIDGET_ORDER;
  const validKeys = new Set(DEFAULT_WIDGET_ORDER);
  const filtered = input.filter((k): k is WidgetKey => validKeys.has(k));
  return filtered.length > 0 ? filtered : DEFAULT_WIDGET_ORDER;
}
