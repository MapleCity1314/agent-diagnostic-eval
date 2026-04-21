import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'claude-code',
  model: process.env.AGENT_EVAL_MODEL ?? 'kimi-k2.5',
  runs: 1,
  earlyExit: true,
  scripts: ['build'],
  timeout: 600,
  sandbox: 'docker',
};

export default config;
