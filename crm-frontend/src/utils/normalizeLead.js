import {
  getPipelineStageLabel,
  normalizePipelineStage,
} from "../constants/pipelineStages";

const STATUS_FROM_PIPELINE_STAGE = {
  NEW: "new",
  CONTACTED: "contacted",
  QUALIFIED: "qualified",
  ESTIMATE_SCHEDULED: "qualified",
  ESTIMATE_SENT: "qualified",
  FOLLOW_UP: "qualified",
  BOOKED: "scheduled",
  LOST: "dead",
};

export function normalizeLead(lead = {}) {
  const displayName =
    lead.name ||
    [lead.first_name, lead.last_name].filter(Boolean).join(" ") ||
    "Unnamed Lead";
  const pipelineStage = normalizePipelineStage(
    lead.pipeline_stage ||
    lead.attributes?.pipeline_stage ||
    lead.intake_attributes?.pipeline_stage ||
    ""
  );
  const safeStatus = lead.status || STATUS_FROM_PIPELINE_STAGE[pipelineStage] || "new";

  return {
    ...lead,
    displayEmail: lead.primary_email || lead.email || null,
    displayPhone: lead.primary_phone || lead.phone_number || null,
    displayName,
    safeStatus,
    safePipelineStage: pipelineStage || "NEW",
    pipelineStageLabel: getPipelineStageLabel(pipelineStage),
    isArchived: Boolean(lead.archived),
    safeIndustry: lead.industry || "general",
    serviceLabel: lead.service || lead.industry_role || "General Inquiry",
  };
}
