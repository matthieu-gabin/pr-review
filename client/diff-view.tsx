import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { DiffFile, DiffLine, Finding } from "../shared/review";
import { FindingCard } from "./finding-card";
import type { Colors, Styles } from "./styles";

interface Props {
  files: DiffFile[];
  findings: Finding[];
  colors: Colors;
  styles: Styles;
  onChange: (finding: Finding) => void;
}

/** A unified diff, every file open by default, with each finding's card under the line it anchors on. */
export function DiffView({ files, findings, colors, styles, onChange }: Props) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const toggle = (path: string) => {
    const next = new Set(collapsed);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setCollapsed(next);
  };
  const anchored = new Set<string>();
  const sections = files.map((file) => {
    const fileFindings = findings.filter((finding) => finding.path === file.path);
    const open = !collapsed.has(file.path);
    const cards = (line: DiffLine) =>
      fileFindings.filter((finding) => {
        const hit = finding.side === "LEFT" ? line.kind !== "add" && line.oldNo === finding.line : line.kind !== "del" && line.newNo === finding.line;
        if (hit) anchored.add(finding.id);
        return hit;
      });
    return { file, fileFindings, open, cards };
  });

  return (
    <View>
      {sections.map(({ file, fileFindings, open, cards }) => (
        <View key={file.path}>
          <Pressable accessibilityRole="button" style={styles.fileHeader} onPress={() => toggle(file.path)}>
            <Text style={styles.muted}>{open ? "▾" : "▸"}</Text>
            <Text style={styles.filePath}>{file.oldPath ? `${file.oldPath} → ${file.path}` : file.path}</Text>
            {fileFindings.length > 0 && <Text style={styles.muted}>{fileFindings.length} 💬</Text>}
            <Text style={[styles.muted, { color: colors.statusSuccess }]}>+{file.additions}</Text>
            <Text style={[styles.muted, { color: colors.statusDanger }]}>−{file.deletions}</Text>
          </Pressable>
          {open && file.binary && <Text style={[styles.muted, styles.message]}>Binary file.</Text>}
          {open &&
            file.hunks.map((hunk, hunkIndex) => (
              <View key={hunkIndex}>
                <Text style={styles.hunkHeader}>{hunk.header}</Text>
                {hunk.lines.map((line, lineIndex) => (
                  <View key={lineIndex}>
                    <View style={[styles.line, line.kind === "add" && styles.lineAdd, line.kind === "del" && styles.lineDel]}>
                      <Text style={styles.lineNo}>{line.oldNo ?? ""}</Text>
                      <Text style={styles.lineNo}>{line.newNo ?? ""}</Text>
                      <Text style={styles.lineText}>
                        {line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "}
                        {line.text}
                      </Text>
                    </View>
                    {cards(line).map((finding) => (
                      <FindingCard key={finding.id} finding={finding} detached={false} colors={colors} styles={styles} onChange={onChange} />
                    ))}
                  </View>
                ))}
              </View>
            ))}
        </View>
      ))}
      {findings.some((finding) => !anchored.has(finding.id)) && (
        <View>
          <View style={styles.fileHeader}>
            <Text style={styles.filePath}>Not anchored on a diff line</Text>
          </View>
          {findings
            .filter((finding) => !anchored.has(finding.id))
            .map((finding) => (
              <View key={finding.id}>
                <Text style={[styles.muted, styles.mono, { paddingHorizontal: 12, paddingTop: 6 }]}>{finding.path}</Text>
                <FindingCard finding={finding} detached colors={colors} styles={styles} onChange={onChange} />
              </View>
            ))}
        </View>
      )}
    </View>
  );
}
