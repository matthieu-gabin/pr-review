import type { PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import { useRpc, useWorkspace } from "@getpaseo/plugin/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { diffRpc, discardRpc, saveRpc, statusRpc, type Finding, type ReviewFile } from "../shared/review";
import { DiffRow } from "./diff-row";
import { FindingsIndex } from "./findings-index";
import { PostBar } from "./post-bar";
import { buildRows, navigableFindings, type Row } from "./rows";
import { createStyles } from "./styles";
import { useReviewAgent } from "./useReviewAgent";
import { openExternal } from "./web";

export function ReviewPanel({ workspaceId, theme, navigation }: PluginWorkspacePanelProps) {
  const directory = useWorkspace(workspaceId, (workspace) => workspace.directory);
  const loadStatus = useRpc(statusRpc);
  const loadDiff = useRpc(diffRpc);
  const save = useRpc(saveRpc);
  const discard = useRpc(discardRpc);
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const listRef = useRef<FlatList<Row>>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [current, setCurrent] = useState<string | null>(null);

  // While the skill runs, the findings file appears at the end: keep looking for it. A ref, because the agent
  // query needs the pull request this query returns.
  const agentRunning = useRef(false);
  const status = useQuery({
    queryKey: ["pr-review-status", directory],
    queryFn: () => loadStatus({ directory: directory ?? "" }),
    enabled: directory !== null,
    refetchInterval: () => (agentRunning.current ? 4000 : false),
  });
  const pullRequest = status.data?.pullRequest ?? null;
  const review = status.data?.review ?? null;
  const agent = useReviewAgent(workspaceId, pullRequest, navigation);
  agentRunning.current = agent.isRunning;

  const diff = useQuery({
    queryKey: ["pr-review-diff", directory, pullRequest?.number, pullRequest?.headSha],
    queryFn: () => loadDiff({ directory: directory ?? "", number: pullRequest?.number ?? 0 }),
    enabled: directory !== null && pullRequest !== null,
    staleTime: 5 * 60 * 1000,
  });

  const update = useMutation({
    mutationFn: (next: ReviewFile) => save({ directory: directory ?? "", review: next }),
    onSuccess: () => status.refetch(),
  });
  const reset = useMutation({
    mutationFn: () => discard({ directory: directory ?? "" }),
    onSuccess: () => status.refetch(),
  });
  const changeFinding = (finding: Finding) => {
    if (!review) return;
    update.mutate({ ...review, findings: review.findings.map((candidate) => (candidate.id === finding.id ? finding : candidate)) });
  };
  const toggleFile = (path: string) => {
    const next = new Set(collapsed);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setCollapsed(next);
  };

  const findings = review?.findings ?? [];
  const { rows, findingRows } = useMemo(() => buildRows(diff.data?.files ?? [], findings, collapsed), [diff.data, findings, collapsed]);
  const navigable = navigableFindings(findings, findingRows);
  const position = navigable.findIndex((finding) => finding.id === current);

  const jumpTo = (finding: Finding) => {
    setCurrent(finding.id);
    // A collapsed file hides its cards: open it, then scroll once the rows exist.
    if (collapsed.has(finding.path)) {
      const next = new Set(collapsed);
      next.delete(finding.path);
      setCollapsed(next);
      setTimeout(() => scrollToFinding(finding.id), 50);
      return;
    }
    scrollToFinding(finding.id);
  };
  const scrollToFinding = (id: string) => {
    const index = findingRows.get(id);
    if (index !== undefined) listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
  };
  const step = (delta: number) => {
    if (navigable.length === 0) return;
    const next = position === -1 ? (delta > 0 ? 0 : navigable.length - 1) : (position + delta + navigable.length) % navigable.length;
    jumpTo(navigable[next]);
  };

  if (directory === null) return null;
  const error = status.error ?? diff.error ?? agent.start.error;
  const counts = countBySeverity(findings);

  return (
    <View style={styles.panel}>
      <View style={styles.bar}>
        {pullRequest ? (
          <Pressable accessibilityRole="link" onPress={() => openExternal(pullRequest.url)}>
            <Text style={styles.heading}>
              #{pullRequest.number} {pullRequest.title}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.heading}>PR review</Text>
        )}
        {pullRequest && (
          <Text style={styles.muted}>
            {pullRequest.author} · {pullRequest.headRefName} → {pullRequest.baseRefName}
          </Text>
        )}
        <View style={styles.spacer} />
        {navigable.length > 0 && (
          <View style={styles.cardHead}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous finding" style={styles.button} onPress={() => step(-1)}>
              <Text style={styles.buttonText}>‹</Text>
            </Pressable>
            <Text style={styles.muted}>
              {position === -1 ? "–" : position + 1} / {navigable.length}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Next finding" style={styles.button} onPress={() => step(1)}>
              <Text style={styles.buttonText}>›</Text>
            </Pressable>
          </View>
        )}
        {agent.isRunning && <Text style={[styles.muted, { color: theme.colors.statusWarning }]}>Reviewing…</Text>}
        {agent.open && (
          <Pressable accessibilityRole="button" style={styles.button} onPress={agent.open}>
            <Text style={styles.buttonText}>Open agent</Text>
          </Pressable>
        )}
        {pullRequest && (
          <Pressable accessibilityRole="button" style={review ? styles.button : styles.buttonPrimary} disabled={agent.isRunning || agent.start.isPending} onPress={() => agent.start.mutate()}>
            <Text style={review ? styles.buttonText : styles.buttonPrimaryText}>{review ? "Review again" : "Run AI review"}</Text>
          </Pressable>
        )}
        {review && (
          <Pressable accessibilityRole="button" style={styles.button} onPress={() => reset.mutate()}>
            <Text style={styles.buttonText}>Discard findings</Text>
          </Pressable>
        )}
      </View>

      {error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}
      {status.isPending && <Text style={[styles.muted, styles.message]}>Looking for the pull request…</Text>}
      {status.data && !pullRequest && <Text style={[styles.muted, styles.message]}>No open pull request for the branch checked out here.</Text>}

      {pullRequest && (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(row) => row.key}
          renderItem={({ item }) => <DiffRow row={item} current={current} colors={theme.colors} styles={styles} onToggleFile={toggleFile} onChange={changeFinding} />}
          initialNumToRender={60}
          maxToRenderPerBatch={80}
          windowSize={21}
          // Rows vary in height, so the list has no layout map: aim by average height, then try again once the rows exist.
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
            setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.3 }), 120);
          }}
          ListHeaderComponent={
            <View>
              {review ? (
                <>
                  <View style={[styles.cardHead, { paddingHorizontal: 12, paddingTop: 10 }]}>
                    <Text style={styles.text}>
                      {findings.length} finding{findings.length === 1 ? "" : "s"}
                    </Text>
                    {counts.map(([severity, count]) => (
                      <Text key={severity} style={styles.muted}>
                        {count} {severity}
                      </Text>
                    ))}
                    {review.headSha && pullRequest.headSha !== review.headSha && <Text style={[styles.muted, { color: theme.colors.statusWarning }]}>The branch moved since this review: run it again.</Text>}
                  </View>
                  <PostBar key={review.generatedAt ?? ""} directory={directory} review={review} colors={theme.colors} styles={styles} onPosted={() => status.refetch()} />
                  <FindingsIndex findings={navigable} current={current} colors={theme.colors} styles={styles} onSelect={jumpTo} />
                </>
              ) : (
                <Text style={[styles.muted, styles.message]}>{agent.isRunning ? "The review agent is reading the pull request. Findings appear here when it finishes." : "No findings yet. Run AI review to get proposed comments on this diff."}</Text>
              )}
              {diff.isPending && <Text style={[styles.muted, styles.message]}>Loading the diff…</Text>}
            </View>
          }
        />
      )}
    </View>
  );
}

function countBySeverity(findings: Finding[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const finding of findings) if (finding.status !== "dismissed") counts.set(finding.severity, (counts.get(finding.severity) ?? 0) + 1);
  return [...counts.entries()];
}
