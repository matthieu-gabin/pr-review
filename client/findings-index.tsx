import { Pressable, Text, View } from "react-native";
import type { Finding } from "../shared/review";
import { severityColor, type Colors, type Styles } from "./styles";

interface Props {
  findings: Finding[];
  current: string | null;
  colors: Colors;
  styles: Styles;
  onSelect: (finding: Finding) => void;
}

/** The open findings in reading order; a click scrolls the diff to the card. */
export function FindingsIndex({ findings, current, colors, styles, onSelect }: Props) {
  if (findings.length === 0) return null;
  return (
    <View style={styles.index}>
      {findings.map((finding, position) => {
        const color = severityColor(finding.severity, colors);
        const isCurrent = finding.id === current;
        return (
          <Pressable key={finding.id} accessibilityRole="button" style={[styles.indexRow, isCurrent && styles.indexRowCurrent]} onPress={() => onSelect(finding)}>
            <Text style={styles.muted}>{position + 1}.</Text>
            <Text style={[styles.severity, { color, borderColor: color }]}>{finding.severity}</Text>
            <Text style={styles.text} numberOfLines={1}>
              {finding.title}
            </Text>
            <View style={styles.spacer} />
            <Text style={[styles.muted, styles.mono]} numberOfLines={1}>
              {finding.path.split("/").pop()}:{finding.line}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
