import architecture from "../../../examples/architecture.json" with { type: "json" };
import comparison from "../../../examples/comparison.json" with { type: "json" };
import debugging from "../../../examples/debugging.json" with { type: "json" };
import progress from "../../../examples/progress.json" with { type: "json" };
import repoReview from "../../../examples/repo-review.json" with { type: "json" };
import research from "../../../examples/research.json" with { type: "json" };
import timeline from "../../../examples/timeline.json" with { type: "json" };

/** The canonical showcase documents, bundled so `/present demo` works offline. */
export const DEMOS: Record<string, unknown> = {
  "repo-review": repoReview,
  architecture,
  comparison,
  debugging,
  research,
  timeline,
  progress,
};
