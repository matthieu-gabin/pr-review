import { useRpc } from "@getpaseo/plugin/client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { postRpc, type Finding, type ReviewFile, type Verdict } from "../shared/review";
import type { Colors, Styles } from "./styles";
import { openExternal } from "./web";

const VERDICTS: { value: Verdict; label: string }[] = [
  { value: "comment", label: "Comment" },
  { value: "approve", label: "Approve" },
  { value: "request_changes", label: "Request changes" },
];

interface Props {
  directory: string;
  review: ReviewFile;
  colors: Colors;
  styles: Styles;
  onPosted: () => void;
}

/** The skill's summary and verdict, both editable, and the button that submits one GitHub review. */
export function PostBar({ directory, review, colors, styles, onPosted }: Props) {
  const post = useRpc(postRpc);
  const [verdict, setVerdict] = useState<Verdict>(review.verdict);
  const [body, setBody] = useState(review.summary);
  const kept = review.findings.filter((finding: Finding) => finding.status === "open");
  const posted = review.findings.filter((finding: Finding) => finding.status === "posted").length;
  const submit = useMutation({
    mutationFn: () => post({ directory, event: verdict, body, findingIds: kept.map((finding) => finding.id) }),
    onSuccess: ({ url }) => {
      onPosted();
      void openExternal(url);
    },
  });

  return (
    <View style={styles.summary}>
      <Text style={styles.muted}>Review body</Text>
      <TextInput multiline value={body} onChangeText={setBody} style={styles.input} placeholder="Summary for the author" placeholderTextColor={colors.foregroundMuted} />
      <View style={[styles.cardHead, { marginTop: 4 }]}>
        {VERDICTS.map((option) => (
          <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: verdict === option.value }} onPress={() => setVerdict(option.value)}>
            <Text style={[styles.severity, { color: verdict === option.value ? colors.accent : colors.foregroundMuted, borderColor: verdict === option.value ? colors.accent : colors.border }]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
        <View style={styles.spacer} />
        <Pressable accessibilityRole="button" style={styles.buttonPrimary} disabled={submit.isPending} onPress={() => submit.mutate()}>
          <Text style={styles.buttonPrimaryText}>
            {submit.isPending ? "Posting…" : `Post review with ${kept.length} comment${kept.length === 1 ? "" : "s"}`}
          </Text>
        </Pressable>
      </View>
      {posted > 0 && <Text style={styles.muted}>{posted} already posted.</Text>}
      {submit.error && <Text style={styles.errorText}>{submit.error.message}</Text>}
    </View>
  );
}
