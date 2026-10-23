import { Pressable, Text, View } from "react-native";
import type { Finding } from "../shared/review";
import { FindingCard } from "./finding-card";
import type { Row } from "./rows";
import type { Colors, Styles } from "./styles";

interface Props {
  row: Row;
  current: string | null;
  colors: Colors;
  styles: Styles;
  onToggleFile: (path: string) => void;
  onChange: (finding: Finding) => void;
}

export function DiffRow({ row, current, colors, styles, onToggleFile, onChange }: Props) {
  switch (row.kind) {
    case "file":
      return (
        <Pressable accessibilityRole="button" style={styles.fileHeader} onPress={() => onToggleFile(row.file.path)}>
          <Text style={styles.muted}>{row.open ? "▾" : "▸"}</Text>
          <Text style={styles.filePath}>{row.file.oldPath ? `${row.file.oldPath} → ${row.file.path}` : row.file.path}</Text>
          {row.findingCount > 0 && <Text style={styles.muted}>{row.findingCount} 💬</Text>}
          <Text style={[styles.muted, { color: colors.statusSuccess }]}>+{row.file.additions}</Text>
          <Text style={[styles.muted, { color: colors.statusDanger }]}>−{row.file.deletions}</Text>
        </Pressable>
      );
    case "hunk":
      return <Text style={styles.hunkHeader}>{row.header}</Text>;
    case "line":
      return (
        <View style={[styles.line, row.line.kind === "add" && styles.lineAdd, row.line.kind === "del" && styles.lineDel]}>
          <Text style={styles.lineNo}>{row.line.oldNo ?? ""}</Text>
          <Text style={styles.lineNo}>{row.line.newNo ?? ""}</Text>
          <Text style={styles.lineText}>
            {row.line.kind === "add" ? "+" : row.line.kind === "del" ? "-" : " "}
            {row.line.text}
          </Text>
        </View>
      );
    case "finding":
      return <FindingCard finding={row.finding} detached={row.detached} current={row.finding.id === current} colors={colors} styles={styles} onChange={onChange} />;
    case "section":
      return (
        <View style={styles.fileHeader}>
          <Text style={styles.filePath}>{row.title}</Text>
        </View>
      );
    case "path":
      return <Text style={[styles.muted, styles.mono, { paddingHorizontal: 12, paddingTop: 6 }]}>{row.path}</Text>;
  }
}
