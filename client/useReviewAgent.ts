import type { PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import { usePaseo } from "@getpaseo/plugin/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { REVIEW_AGENT_LABEL, REVIEW_AGENT_PROVIDER, REVIEW_PROMPT, type PullRequest } from "../shared/review";

export function reviewAgentLabel(pullRequest: PullRequest): string {
  return `${pullRequest.owner}/${pullRequest.name}#${pullRequest.number}`;
}

/** The agent running the skill for this pull request in this workspace, and a way to start one. */
export function useReviewAgent(workspaceId: string, pullRequest: PullRequest | null, navigation: PluginWorkspacePanelProps["navigation"]) {
  const paseo = usePaseo();
  const label = pullRequest ? reviewAgentLabel(pullRequest) : null;
  const agent = useQuery({
    queryKey: ["pr-review-agent", workspaceId, label],
    queryFn: async () => {
      const { entries } = await paseo.agents.list();
      const candidates = entries
        .map((entry) => entry.agent)
        .filter((candidate) => candidate.workspaceId === workspaceId && candidate.labels?.[REVIEW_AGENT_LABEL] === label && !candidate.archivedAt);
      // Several runs can exist; the newest one is the one whose findings are on screen.
      candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return candidates[0] ?? null;
    },
    enabled: label !== null,
    refetchInterval: (query) => (query.state.data?.status === "running" || query.state.data?.status === "initializing" ? 3000 : 15000),
  });

  const start = useMutation({
    mutationFn: async () => {
      if (!pullRequest || !label) throw new Error("No open pull request for this branch.");
      const created = await paseo.workspaces.ref(workspaceId).agents.create({
        config: { provider: REVIEW_AGENT_PROVIDER, modeId: "auto" },
        title: `Review #${pullRequest.number}`,
        labels: { [REVIEW_AGENT_LABEL]: label },
        prompt: `${REVIEW_PROMPT} ${pullRequest.number}`,
      });
      return created.id;
    },
    onSuccess: () => agent.refetch(),
  });

  const current = agent.data ?? null;
  const isRunning = current?.status === "running" || current?.status === "initializing";
  return {
    agent: current,
    isRunning,
    start,
    open: current ? () => navigation?.openAgent({ agentId: current.id }) : null,
  };
}
