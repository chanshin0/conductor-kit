export * from './types.js';
export { loadConfig, deepMerge } from './config.js';
export * as git from './git.js';
export * as work from './work.js';
export {
  resolveAgent,
  resolveAuthorship,
  renderAuthorshipFooter,
  detectGitUser,
} from './authorship.js';
export type { AuthorshipInputs, ResolvedAuthorship } from './authorship.js';
export { scaffoldConductorDir, applyWorkflowPlaceholders } from './scaffold.js';
export type { ScaffoldOptions, ScaffoldResult, ScaffoldFileAction } from './scaffold.js';
