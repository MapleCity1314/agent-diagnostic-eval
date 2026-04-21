import type { ExperimentConfig } from '@vercel/agent-eval';

// Runs all D-suite eval directories (both -baseline and -docs variants).
// To run only one condition, temporarily rename or move the other variant's directories.
const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/claude-code',
  runs: 3,
  earlyExit: false,
  scripts: ['build'],
  timeout: 600,
};

export default config;
