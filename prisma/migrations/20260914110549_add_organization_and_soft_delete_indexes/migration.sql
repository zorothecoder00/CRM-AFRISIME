-- CreateIndex
CREATE INDEX "ActivityReport_organizationId_idx" ON "ActivityReport"("organizationId");

-- CreateIndex
CREATE INDEX "ActivityReportShare_organizationId_idx" ON "ActivityReportShare"("organizationId");

-- CreateIndex
CREATE INDEX "AdminRequest_organizationId_idx" ON "AdminRequest"("organizationId");

-- CreateIndex
CREATE INDEX "AdminRequestApproval_organizationId_idx" ON "AdminRequestApproval"("organizationId");

-- CreateIndex
CREATE INDEX "AdminRequestValidationRun_organizationId_idx" ON "AdminRequestValidationRun"("organizationId");

-- CreateIndex
CREATE INDEX "AiAgentInsight_organizationId_idx" ON "AiAgentInsight"("organizationId");

-- CreateIndex
CREATE INDEX "ApiKey_organizationId_idx" ON "ApiKey"("organizationId");

-- CreateIndex
CREATE INDEX "AuditFinding_organizationId_idx" ON "AuditFinding"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditMission_organizationId_idx" ON "AuditMission"("organizationId");

-- CreateIndex
CREATE INDEX "AuditPlan_organizationId_idx" ON "AuditPlan"("organizationId");

-- CreateIndex
CREATE INDEX "AuditPlanDocument_organizationId_idx" ON "AuditPlanDocument"("organizationId");

-- CreateIndex
CREATE INDEX "AuditPlanMember_organizationId_idx" ON "AuditPlanMember"("organizationId");

-- CreateIndex
CREATE INDEX "AutomationCondition_organizationId_idx" ON "AutomationCondition"("organizationId");

-- CreateIndex
CREATE INDEX "AutomationExecution_organizationId_idx" ON "AutomationExecution"("organizationId");

-- CreateIndex
CREATE INDEX "AutomationRule_organizationId_idx" ON "AutomationRule"("organizationId");

-- CreateIndex
CREATE INDEX "AvailabilityRequest_organizationId_idx" ON "AvailabilityRequest"("organizationId");

-- CreateIndex
CREATE INDEX "Beneficiaire_organizationId_idx" ON "Beneficiaire"("organizationId");

-- CreateIndex
CREATE INDEX "BudgetLine_organizationId_idx" ON "BudgetLine"("organizationId");

-- CreateIndex
CREATE INDEX "ChangeRequest_organizationId_idx" ON "ChangeRequest"("organizationId");

-- CreateIndex
CREATE INDEX "ChecklistItem_organizationId_idx" ON "ChecklistItem"("organizationId");

-- CreateIndex
CREATE INDEX "CommunicationPlanEntry_organizationId_idx" ON "CommunicationPlanEntry"("organizationId");

-- CreateIndex
CREATE INDEX "Competence_organizationId_idx" ON "Competence"("organizationId");

-- CreateIndex
CREATE INDEX "ComplianceControl_organizationId_idx" ON "ComplianceControl"("organizationId");

-- CreateIndex
CREATE INDEX "ComplianceObligation_organizationId_idx" ON "ComplianceObligation"("organizationId");

-- CreateIndex
CREATE INDEX "ComplianceObligationDocument_organizationId_idx" ON "ComplianceObligationDocument"("organizationId");

-- CreateIndex
CREATE INDEX "Conversation_organizationId_idx" ON "Conversation"("organizationId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_organizationId_idx" ON "ConversationParticipant"("organizationId");

-- CreateIndex
CREATE INDEX "Courrier_organizationId_idx" ON "Courrier"("organizationId");

-- CreateIndex
CREATE INDEX "DashboardWidgetPreference_organizationId_idx" ON "DashboardWidgetPreference"("organizationId");

-- CreateIndex
CREATE INDEX "DataClassification_organizationId_idx" ON "DataClassification"("organizationId");

-- CreateIndex
CREATE INDEX "DecisionMatrix_organizationId_idx" ON "DecisionMatrix"("organizationId");

-- CreateIndex
CREATE INDEX "DecisionOption_organizationId_idx" ON "DecisionOption"("organizationId");

-- CreateIndex
CREATE INDEX "DecisionOutcome_organizationId_idx" ON "DecisionOutcome"("organizationId");

-- CreateIndex
CREATE INDEX "Delegation_organizationId_idx" ON "Delegation"("organizationId");

-- CreateIndex
CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId");

-- CreateIndex
CREATE INDEX "Dependency_organizationId_idx" ON "Dependency"("organizationId");

-- CreateIndex
CREATE INDEX "Document_organizationId_idx" ON "Document"("organizationId");

-- CreateIndex
CREATE INDEX "Document_deletedAt_idx" ON "Document"("deletedAt");

-- CreateIndex
CREATE INDEX "DocumentAccess_organizationId_idx" ON "DocumentAccess"("organizationId");

-- CreateIndex
CREATE INDEX "DocumentFolder_organizationId_idx" ON "DocumentFolder"("organizationId");

-- CreateIndex
CREATE INDEX "DocumentVersion_organizationId_idx" ON "DocumentVersion"("organizationId");

-- CreateIndex
CREATE INDEX "Entity_organizationId_idx" ON "Entity"("organizationId");

-- CreateIndex
CREATE INDEX "EntityTag_organizationId_idx" ON "EntityTag"("organizationId");

-- CreateIndex
CREATE INDEX "Evaluation_organizationId_idx" ON "Evaluation"("organizationId");

-- CreateIndex
CREATE INDEX "EvaluationCritere_organizationId_idx" ON "EvaluationCritere"("organizationId");

-- CreateIndex
CREATE INDEX "Event_organizationId_idx" ON "Event"("organizationId");

-- CreateIndex
CREATE INDEX "Financement_organizationId_idx" ON "Financement"("organizationId");

-- CreateIndex
CREATE INDEX "FundingOpportunity_organizationId_idx" ON "FundingOpportunity"("organizationId");

-- CreateIndex
CREATE INDEX "GovernanceDecision_organizationId_idx" ON "GovernanceDecision"("organizationId");

-- CreateIndex
CREATE INDEX "GovernanceInstance_organizationId_idx" ON "GovernanceInstance"("organizationId");

-- CreateIndex
CREATE INDEX "GovernanceInstanceMember_organizationId_idx" ON "GovernanceInstanceMember"("organizationId");

-- CreateIndex
CREATE INDEX "GovernanceMeeting_organizationId_idx" ON "GovernanceMeeting"("organizationId");

-- CreateIndex
CREATE INDEX "GovernanceMeetingDocument_organizationId_idx" ON "GovernanceMeetingDocument"("organizationId");

-- CreateIndex
CREATE INDEX "GovernanceMeetingParticipant_organizationId_idx" ON "GovernanceMeetingParticipant"("organizationId");

-- CreateIndex
CREATE INDEX "Holiday_organizationId_idx" ON "Holiday"("organizationId");

-- CreateIndex
CREATE INDEX "Incident_organizationId_idx" ON "Incident"("organizationId");

-- CreateIndex
CREATE INDEX "Indicator_organizationId_idx" ON "Indicator"("organizationId");

-- CreateIndex
CREATE INDEX "Integration_organizationId_idx" ON "Integration"("organizationId");

-- CreateIndex
CREATE INDEX "IntegrationEvent_organizationId_idx" ON "IntegrationEvent"("organizationId");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_organizationId_idx" ON "KnowledgeArticle"("organizationId");

-- CreateIndex
CREATE INDEX "KnowledgeCategory_organizationId_idx" ON "KnowledgeCategory"("organizationId");

-- CreateIndex
CREATE INDEX "Leave_organizationId_idx" ON "Leave"("organizationId");

-- CreateIndex
CREATE INDEX "LogframeRow_organizationId_idx" ON "LogframeRow"("organizationId");

-- CreateIndex
CREATE INDEX "Meeting_organizationId_idx" ON "Meeting"("organizationId");

-- CreateIndex
CREATE INDEX "MeetingDecision_organizationId_idx" ON "MeetingDecision"("organizationId");

-- CreateIndex
CREATE INDEX "MeetingExternalParticipant_organizationId_idx" ON "MeetingExternalParticipant"("organizationId");

-- CreateIndex
CREATE INDEX "MeetingParticipant_organizationId_idx" ON "MeetingParticipant"("organizationId");

-- CreateIndex
CREATE INDEX "Message_organizationId_idx" ON "Message"("organizationId");

-- CreateIndex
CREATE INDEX "Message_deletedAt_idx" ON "Message"("deletedAt");

-- CreateIndex
CREATE INDEX "MetricSnapshot_organizationId_idx" ON "MetricSnapshot"("organizationId");

-- CreateIndex
CREATE INDEX "NonConformite_organizationId_idx" ON "NonConformite"("organizationId");

-- CreateIndex
CREATE INDEX "NonConformiteAction_organizationId_idx" ON "NonConformiteAction"("organizationId");

-- CreateIndex
CREATE INDEX "Notification_organizationId_idx" ON "Notification"("organizationId");

-- CreateIndex
CREATE INDEX "Objective_organizationId_idx" ON "Objective"("organizationId");

-- CreateIndex
CREATE INDEX "OrchestrationPlaybook_organizationId_idx" ON "OrchestrationPlaybook"("organizationId");

-- CreateIndex
CREATE INDEX "OrgDesignDraft_organizationId_idx" ON "OrgDesignDraft"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationProfile_organizationId_idx" ON "OrganizationProfile"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationalMemoryEntry_organizationId_idx" ON "OrganizationalMemoryEntry"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationalRisk_organizationId_idx" ON "OrganizationalRisk"("organizationId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_organizationId_idx" ON "PasswordResetToken"("organizationId");

-- CreateIndex
CREATE INDEX "PendingAiAction_organizationId_idx" ON "PendingAiAction"("organizationId");

-- CreateIndex
CREATE INDEX "PermissionOverride_organizationId_idx" ON "PermissionOverride"("organizationId");

-- CreateIndex
CREATE INDEX "PersonalPlanningDailyReview_organizationId_idx" ON "PersonalPlanningDailyReview"("organizationId");

-- CreateIndex
CREATE INDEX "PersonalPlanningEntry_organizationId_idx" ON "PersonalPlanningEntry"("organizationId");

-- CreateIndex
CREATE INDEX "PersonalPlanningEntryParticipant_organizationId_idx" ON "PersonalPlanningEntryParticipant"("organizationId");

-- CreateIndex
CREATE INDEX "PersonalPlanningShare_organizationId_idx" ON "PersonalPlanningShare"("organizationId");

-- CreateIndex
CREATE INDEX "Plan_organizationId_idx" ON "Plan"("organizationId");

-- CreateIndex
CREATE INDEX "Poste_organizationId_idx" ON "Poste"("organizationId");

-- CreateIndex
CREATE INDEX "PosteResponsabilite_organizationId_idx" ON "PosteResponsabilite"("organizationId");

-- CreateIndex
CREATE INDEX "ProblemTreeNode_organizationId_idx" ON "ProblemTreeNode"("organizationId");

-- CreateIndex
CREATE INDEX "ProblemTreeNodeComment_organizationId_idx" ON "ProblemTreeNodeComment"("organizationId");

-- CreateIndex
CREATE INDEX "ProblemTreeNodeDocument_organizationId_idx" ON "ProblemTreeNodeDocument"("organizationId");

-- CreateIndex
CREATE INDEX "ProblemTreeNodeIndicator_organizationId_idx" ON "ProblemTreeNodeIndicator"("organizationId");

-- CreateIndex
CREATE INDEX "Processus_organizationId_idx" ON "Processus"("organizationId");

-- CreateIndex
CREATE INDEX "ProcessusDocument_organizationId_idx" ON "ProcessusDocument"("organizationId");

-- CreateIndex
CREATE INDEX "ProcessusEtape_organizationId_idx" ON "ProcessusEtape"("organizationId");

-- CreateIndex
CREATE INDEX "ProcessusExecution_organizationId_idx" ON "ProcessusExecution"("organizationId");

-- CreateIndex
CREATE INDEX "ProcessusExecutionEtape_organizationId_idx" ON "ProcessusExecutionEtape"("organizationId");

-- CreateIndex
CREATE INDEX "ProcessusVersion_organizationId_idx" ON "ProcessusVersion"("organizationId");

-- CreateIndex
CREATE INDEX "ProcurementItem_organizationId_idx" ON "ProcurementItem"("organizationId");

-- CreateIndex
CREATE INDEX "Programme_organizationId_idx" ON "Programme"("organizationId");

-- CreateIndex
CREATE INDEX "ProgrammeRisk_organizationId_idx" ON "ProgrammeRisk"("organizationId");

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");

-- CreateIndex
CREATE INDEX "ProjectAssumption_organizationId_idx" ON "ProjectAssumption"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectChangeRequest_organizationId_idx" ON "ProjectChangeRequest"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectClosureChecklist_organizationId_idx" ON "ProjectClosureChecklist"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectConceptNote_organizationId_idx" ON "ProjectConceptNote"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectContract_organizationId_idx" ON "ProjectContract"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectContractPayment_organizationId_idx" ON "ProjectContractPayment"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectDataForm_organizationId_idx" ON "ProjectDataForm"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectDataFormField_organizationId_idx" ON "ProjectDataFormField"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectDataFormSubmission_organizationId_idx" ON "ProjectDataFormSubmission"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectDeliverable_organizationId_idx" ON "ProjectDeliverable"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectDiagnostic_organizationId_idx" ON "ProjectDiagnostic"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectFeedback_organizationId_idx" ON "ProjectFeedback"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectIdea_organizationId_idx" ON "ProjectIdea"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectLessonLearned_organizationId_idx" ON "ProjectLessonLearned"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectMEEvaluation_organizationId_idx" ON "ProjectMEEvaluation"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectMEEvaluationCritere_organizationId_idx" ON "ProjectMEEvaluationCritere"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectMember_organizationId_idx" ON "ProjectMember"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectMilestone_organizationId_idx" ON "ProjectMilestone"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectPartner_organizationId_idx" ON "ProjectPartner"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectResource_organizationId_idx" ON "ProjectResource"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectRisk_organizationId_idx" ON "ProjectRisk"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectSection_organizationId_idx" ON "ProjectSection"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectTemplate_organizationId_idx" ON "ProjectTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectTemplatePhase_organizationId_idx" ON "ProjectTemplatePhase"("organizationId");

-- CreateIndex
CREATE INDEX "QualityChecklistItem_organizationId_idx" ON "QualityChecklistItem"("organizationId");

-- CreateIndex
CREATE INDEX "QualityClaim_organizationId_idx" ON "QualityClaim"("organizationId");

-- CreateIndex
CREATE INDEX "QualityControl_organizationId_idx" ON "QualityControl"("organizationId");

-- CreateIndex
CREATE INDEX "QualityDocument_organizationId_idx" ON "QualityDocument"("organizationId");

-- CreateIndex
CREATE INDEX "RaciAssignment_organizationId_idx" ON "RaciAssignment"("organizationId");

-- CreateIndex
CREATE INDEX "Reaction_organizationId_idx" ON "Reaction"("organizationId");

-- CreateIndex
CREATE INDEX "Scenario_organizationId_idx" ON "Scenario"("organizationId");

-- CreateIndex
CREATE INDEX "SectionComment_organizationId_idx" ON "SectionComment"("organizationId");

-- CreateIndex
CREATE INDEX "Site_organizationId_idx" ON "Site"("organizationId");

-- CreateIndex
CREATE INDEX "SolutionTreeNode_organizationId_idx" ON "SolutionTreeNode"("organizationId");

-- CreateIndex
CREATE INDEX "Stakeholder_organizationId_idx" ON "Stakeholder"("organizationId");

-- CreateIndex
CREATE INDEX "StakeholderCommunication_organizationId_idx" ON "StakeholderCommunication"("organizationId");

-- CreateIndex
CREATE INDEX "StakeholderProject_organizationId_idx" ON "StakeholderProject"("organizationId");

-- CreateIndex
CREATE INDEX "StrategicAxis_organizationId_idx" ON "StrategicAxis"("organizationId");

-- CreateIndex
CREATE INDEX "SuccessionCandidate_organizationId_idx" ON "SuccessionCandidate"("organizationId");

-- CreateIndex
CREATE INDEX "SuccessionPlan_organizationId_idx" ON "SuccessionPlan"("organizationId");

-- CreateIndex
CREATE INDEX "SwotItem_organizationId_idx" ON "SwotItem"("organizationId");

-- CreateIndex
CREATE INDEX "Tag_organizationId_idx" ON "Tag"("organizationId");

-- CreateIndex
CREATE INDEX "Task_organizationId_idx" ON "Task"("organizationId");

-- CreateIndex
CREATE INDEX "Task_deletedAt_idx" ON "Task"("deletedAt");

-- CreateIndex
CREATE INDEX "TaskApproval_organizationId_idx" ON "TaskApproval"("organizationId");

-- CreateIndex
CREATE INDEX "TaskAssignee_organizationId_idx" ON "TaskAssignee"("organizationId");

-- CreateIndex
CREATE INDEX "TaskComment_organizationId_idx" ON "TaskComment"("organizationId");

-- CreateIndex
CREATE INDEX "TaskDateChangeRequest_organizationId_idx" ON "TaskDateChangeRequest"("organizationId");

-- CreateIndex
CREATE INDEX "TaskDependency_organizationId_idx" ON "TaskDependency"("organizationId");

-- CreateIndex
CREATE INDEX "TaskValidationRun_organizationId_idx" ON "TaskValidationRun"("organizationId");

-- CreateIndex
CREATE INDEX "Team_organizationId_idx" ON "Team"("organizationId");

-- CreateIndex
CREATE INDEX "TeamMember_organizationId_idx" ON "TeamMember"("organizationId");

-- CreateIndex
CREATE INDEX "TheoryOfChangeNode_organizationId_idx" ON "TheoryOfChangeNode"("organizationId");

-- CreateIndex
CREATE INDEX "Transformation_organizationId_idx" ON "Transformation"("organizationId");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "UserCompetence_organizationId_idx" ON "UserCompetence"("organizationId");

-- CreateIndex
CREATE INDEX "UserSession_organizationId_idx" ON "UserSession"("organizationId");

-- CreateIndex
CREATE INDEX "UserWorkSchedule_organizationId_idx" ON "UserWorkSchedule"("organizationId");

-- CreateIndex
CREATE INDEX "UserWorkScheduleException_organizationId_idx" ON "UserWorkScheduleException"("organizationId");

-- CreateIndex
CREATE INDEX "ValidationWorkflow_organizationId_idx" ON "ValidationWorkflow"("organizationId");

-- CreateIndex
CREATE INDEX "ValidationWorkflowStep_organizationId_idx" ON "ValidationWorkflowStep"("organizationId");

-- CreateIndex
CREATE INDEX "Whiteboard_organizationId_idx" ON "Whiteboard"("organizationId");
