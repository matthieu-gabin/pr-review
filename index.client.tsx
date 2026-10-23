import type { PluginButtonRegistration, PluginClientContext } from "@getpaseo/plugin/client";
import { ReviewPanel } from "./client/panel";
import { REVIEW_AGENT_LABEL } from "./shared/review";

const PANEL_ID = "review";

interface WorkspaceLike {
  id: string;
  projectKind: string;
  archivingAt?: string | null;
}

export default function contribute(client: PluginClientContext) {
  const removePanel = client.addWorkspacePanel({
    id: PANEL_ID,
    title: "Review",
    icon: "ClipboardCheck",
    context: "workspace",
    Component: ReviewPanel,
  });

  // Header buttons are registered per workspace, so follow the workspace list as it changes.
  const buttons = new Map<string, PluginButtonRegistration>();
  const sync = (workspace: WorkspaceLike) => {
    const eligible = workspace.projectKind !== "non_git" && !workspace.archivingAt;
    const existing = buttons.get(workspace.id);
    if (eligible && !existing) {
      buttons.set(
        workspace.id,
        client.addHeaderButton({
          id: "pr-review",
          workspaceId: workspace.id,
          button: {
            title: "Review the pull request of this branch",
            icon: "ClipboardCheck",
            label: "Review",
            behavior: { kind: "action", onPress: () => client.openPanel(PANEL_ID, { workspaceId: workspace.id }) },
          },
        }),
      );
    }
    if (!eligible && existing) {
      existing.remove();
      buttons.delete(workspace.id);
    }
  };
  const unsubscribeWorkspaces = client.paseo.workspaces.subscribe((update) => {
    if (update.kind === "upsert") sync(update.workspace);
    else {
      buttons.get(update.id)?.remove();
      buttons.delete(update.id);
    }
  });

  // A review agent started elsewhere (the review queue) announces itself through its label: open the panel on its
  // workspace. Only agents created after this load count, so a reload does not reopen every old review.
  const loadedAt = Date.now();
  const knownAgents = new Set<string>();
  const unsubscribeAgents = client.paseo.agents.subscribe((update) => {
    if (update.kind !== "upsert") return;
    const agent = update.agent;
    if (knownAgents.has(agent.id)) return;
    knownAgents.add(agent.id);
    const isReview = Boolean(agent.labels?.[REVIEW_AGENT_LABEL]);
    const isNew = Date.parse(agent.createdAt) >= loadedAt;
    if (isReview && isNew && agent.workspaceId) client.openPanel(PANEL_ID, { workspaceId: agent.workspaceId });
  });

  let disposed = false;
  const releases: (() => Promise<void>)[] = [];
  void client.paseo.workspaces.list({ subscribe: {} }).then(({ entries, subscription }) => {
    if (disposed) return void subscription.release();
    releases.push(() => subscription.release());
    entries.forEach(sync);
  });
  void client.paseo.agents.list({ subscribe: {} }).then(({ subscription }) => {
    if (disposed) return void subscription.release();
    releases.push(() => subscription.release());
  });

  return () => {
    disposed = true;
    releases.forEach((release) => void release());
    unsubscribeWorkspaces();
    unsubscribeAgents();
    buttons.forEach((button) => button.remove());
    buttons.clear();
    removePanel();
  };
}
