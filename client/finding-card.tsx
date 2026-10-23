import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { Finding } from "../shared/review";
import { severityColor, type Colors, type Styles } from "./styles";

interface Props {
  finding: Finding;
  /** Set when the finding's line is not in the diff: it will go in the review body instead of inline. */
  detached: boolean;
  /** The one Prev / Next or the index last jumped to. */
  current: boolean;
  colors: Colors;
  styles: Styles;
  onChange: (finding: Finding) => void;
}

export function FindingCard({ finding, detached, current, colors, styles, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(finding.body);
  const color = severityColor(finding.severity, colors);
  const dismissed = finding.status === "dismissed";
  const posted = finding.status === "posted";
  const range = finding.startLine !== null && finding.startLine < finding.line ? `${finding.startLine}–${finding.line}` : String(finding.line);

  return (
    <View style={[styles.card, dismissed && styles.cardDismissed, current && styles.cardCurrent]}>
      <View style={styles.cardHead}>
        <Text style={[styles.severity, { color, borderColor: color }]}>{finding.severity}</Text>
        <Text style={styles.cardTitle}>{finding.title}</Text>
        {detached && <Text style={[styles.muted, { color: colors.statusWarning }]}>line {range} not in diff: goes in the review body</Text>}
        {posted && <Text style={[styles.muted, { color: colors.statusSuccess }]}>posted</Text>}
        {dismissed && <Text style={styles.muted}>dismissed</Text>}
      </View>
      {editing ? (
        <TextInput multiline value={body} onChangeText={setBody} style={styles.input} autoFocus />
      ) : (
        <Text selectable style={styles.cardBody}>
          {finding.body}
        </Text>
      )}
      {!posted && (
        <View style={styles.cardActions}>
          {editing ? (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onChange({ ...finding, body: body.trim() });
                  setEditing(false);
                }}
              >
                <Text style={styles.link}>Save</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setBody(finding.body);
                  setEditing(false);
                }}
              >
                <Text style={styles.muted}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <>
              {!dismissed && (
                <Pressable accessibilityRole="button" onPress={() => setEditing(true)}>
                  <Text style={styles.link}>Edit</Text>
                </Pressable>
              )}
              <Pressable accessibilityRole="button" onPress={() => onChange({ ...finding, status: dismissed ? "open" : "dismissed" })}>
                <Text style={dismissed ? styles.link : [styles.link, { color: colors.statusDanger }]}>{dismissed ? "Restore" : "Dismiss"}</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
}
