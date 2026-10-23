import type { PluginTheme } from "@getpaseo/plugin";

export type Colors = PluginTheme["colors"];

export function createStyles(colors: Colors) {
  return {
    panel: { flex: 1, backgroundColor: colors.surface0 },
    bar: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      flexWrap: "wrap" as const,
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    spacer: { flex: 1 },
    heading: { color: colors.foreground, fontSize: 15, fontWeight: "700" as const },
    text: { color: colors.foreground, fontSize: 13 },
    muted: { color: colors.foregroundMuted, fontSize: 12 },
    mono: { fontFamily: "monospace", fontSize: 12 },
    link: { color: colors.accent, fontSize: 12 },
    message: { padding: 16 },
    button: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: colors.surface2 },
    buttonPrimary: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: colors.accent },
    buttonText: { color: colors.foreground, fontSize: 12 },
    buttonPrimaryText: { color: colors.accentForeground, fontSize: 12, fontWeight: "600" as const },
    error: { margin: 12, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.statusDanger },
    errorText: { color: colors.statusDanger, fontFamily: "monospace", fontSize: 12 },
    summary: { margin: 12, padding: 12, borderRadius: 8, backgroundColor: colors.surface1, gap: 6 },
    input: {
      color: colors.foreground,
      fontSize: 13,
      padding: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      backgroundColor: colors.surface0,
      minHeight: 60,
    },
    // Diff
    fileHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.surface1,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
      marginTop: 8,
    },
    filePath: { color: colors.foreground, fontFamily: "monospace", fontSize: 12, fontWeight: "600" as const, flex: 1 },
    hunkHeader: { color: colors.foregroundMuted, fontFamily: "monospace", fontSize: 11, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: colors.surface1 },
    line: { flexDirection: "row" as const, paddingHorizontal: 12 },
    lineAdd: { backgroundColor: "rgba(46, 160, 67, 0.15)" },
    lineDel: { backgroundColor: "rgba(248, 81, 73, 0.15)" },
    lineNo: { width: 40, color: colors.foregroundMuted, fontFamily: "monospace", fontSize: 12, textAlign: "right" as const, paddingRight: 6 },
    lineText: { flex: 1, color: colors.foreground, fontFamily: "monospace", fontSize: 12 },
    // Finding card
    card: { marginHorizontal: 12, marginVertical: 6, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface1, gap: 6 },
    cardDismissed: { opacity: 0.5 },
    cardCurrent: { borderColor: colors.accent, borderWidth: 2 },
    // Findings index
    index: { marginHorizontal: 12, marginBottom: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: "hidden" as const },
    indexRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
    indexRowCurrent: { backgroundColor: colors.surface2 },
    cardHead: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, flexWrap: "wrap" as const },
    severity: { fontSize: 11, fontWeight: "700" as const, borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
    cardTitle: { color: colors.foreground, fontWeight: "600" as const, fontSize: 13, flex: 1 },
    cardBody: { color: colors.foreground, fontSize: 13, lineHeight: 19 },
    cardActions: { flexDirection: "row" as const, gap: 14 },
  };
}

export type Styles = ReturnType<typeof createStyles>;

export function severityColor(severity: string, colors: Colors): string {
  if (severity === "bug") return colors.statusDanger;
  if (severity === "risk") return colors.statusWarning;
  if (severity === "question") return colors.accent;
  return colors.foregroundMuted;
}
