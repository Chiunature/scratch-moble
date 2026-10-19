export type AssistantValidationIssue = { path: string; message: string };

export class AssistantContractError extends Error {
  constructor(readonly issues: readonly AssistantValidationIssue[]) {
    super(issues.map(issue => `${issue.path}: ${issue.message}`).join('; '));
    this.name = 'AssistantContractError';
  }
}
