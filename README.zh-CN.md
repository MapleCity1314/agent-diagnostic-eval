# agent-diagnostic-eval

**面向知识边界场景的 Coding Agent 诊断式评测。**

大多数 benchmark 只回答“**它过了吗？**” 这个问题，而这套评测回答的是“**它失败在了哪里、为什么失败、如果给它文档能不能修好？**”

```text
任务："把这个页面升级成当前的缓存 API。"

Agent 输出：unstable_cache()        ← 旧 API，构建通过，但评测失败

诊断结果：
  失败阶段：       0 — 问题识别
  回退模式：       F1 — 自信替代
  根因：           Agent 不知道自己的知识已经过时
  文档注入是否修复：是 — +docs 条件下通过
```

---

## 评测目标

每一次 agent 运行，都会通过两个互补的维度来分析：

```text
                    ┌─────────────────────────────────────────┐
                    │               诊断输出                  │
                    ├────────────────────┬────────────────────┤
                    │     失败阶段       │     回退模式       │
                    │     （失败在哪）   │     （行为是什么） │
                    ├────────────────────┼────────────────────┤
                    │ S0  问题识别       │ F1  自信替代       │
                    │ S1  文档检索       │ F2  部分采纳       │
                    │ S2  语义理解       │ F3  幻觉 API       │
                    │ S3  方案规划       │ F4  语义错误       │
                    │ S4  代码生成       │ F5  过度迁移       │
                    │ S5  自我验证       │                    │
                    └────────────────────┴────────────────────┘
```

一次失败运行不会只得到一个 ❌。它会得到一个坐标：**Stage 0, Pattern F1**。这表示 agent 不知道自己“不知道”，在完全自信的情况下继续使用旧 API，而且它自己的构建验证还通过了。这种输出是可操作的。

---

## 六个阶段

每个阶段都代表 agent 执行过程中的一个认知检查点：

| 阶段 | 名称 | 核心问题 | 可观测信号 |
|-------|------|----------|------------|
| **S0** | 问题识别 | Agent 是否意识到自己的知识可能已经过时？ | Transcript：第一次写代码前是否先读文档 |
| **S1** | 文档检索 | 它是否找到了并读取了正确的文档片段？ | Transcript：文件读取操作、行号范围 |
| **S2** | 语义理解 | 它理解的是约束语义，而不只是函数签名吗？ | Code：是否满足约束相关断言 |
| **S3** | 方案规划 | 它是否选对了该改的文件，也选对了不该改的文件？ | Diff：修改范围分析 |
| **S4** | 代码生成 | 代码是否能编译，并正确使用 API 签名？ | Build 退出码、AST 检查 |
| **S5** | 自我验证 | 它会不会检查自己的结果？检查是否真的能发现错误？ | Transcript：生成后执行了哪些命令 |

最常见的一条失败路径，会完全跳过 S0–S2：

```text
跳过 S0 → 跳过 S1 → 跳过 S2 → S3（沿用旧知识）→ S4 → S5（通过！）→ 完成
                                                                        ↑
                                                        agent 认为自己成功了
```

## 五种回退模式

当 agent 的知识不足时，它并不会直接停下来，而是会以一些可分类的方式回退到训练语料中的旧模式：

| 模式 | 名称 | 特征 | 严重性 |
|---------|------|------|--------|
| **F1** | 自信替代 | 只使用旧 API，不查文档，构建还通过 | 🔴 最高 |
| **F2** | 部分采纳 | 新旧 API 混用；复杂部分仍回退到旧 API | 🟡 较低 |
| **F3** | 幻觉 API | 调用了不存在的 API（旧 API 与新 API 拼接，或跨框架类比） | 🟠 中等 |
| **F4** | 语法正确，语义错误 | API 对了，签名也对了，但违反了关键约束 | 🔴 高 |
| **F5** | 过度迁移 | 把新 API 用到了本应保留旧实现的地方，破坏了 legacy 代码 | 🟡 最低 |

F1 是最危险的一类：它是唯一一种**不会产生错误信号**的模式。agent 的自我验证会通过，反过来强化这个错误解法。其他模式至少都会带来某种失败反馈。

### Stage × Pattern 矩阵

这两个维度之间有比较稳定的对应关系：

```text
                     F1      F2      F3      F4      F5
                   ┌───────┬───────┬───────┬───────┬───────┐
  S0 问题识别      │ █████ │       │   ░   │       │       │
  S1 文档检索      │   ░   │       │ █████ │       │       │
  S2 语义理解      │       │   ░   │       │ █████ │       │
  S3 方案规划      │       │ █████ │       │       │ █████ │
  S4 代码生成      │       │       │   ░   │       │       │
  S5 自我验证      │   ░   │       │       │   ░   │       │
                   └───────┴───────┴───────┴───────┴───────┘
                   █████ = 主要关联    ░ = 次要关联
```

---

## Eval 用例

一共五个 case。每个 case 都针对 Stage × Pattern 矩阵中的某个特定区域。每个 case 会跑两次：**baseline**（不注入文档）和 **+docs**（注入文档）。二者之间的差值，就是我们要测量的对象。

| Case | 任务 | 主要诊断目标 | 预期失败模式 |
|------|------|--------------|--------------|
| **D0** | 使用已知 API 给产品列表加缓存 | 对照组：基础适配能力 | 所有模型都应该通过 |
| **D1** | 把已废弃的 `unstable_noStore()` 替换为当前 API | S0：它是否知道 API 已经变了？ | F1（自信替代） |
| **D2** | 根据函数级文档，把 `"use cache"` 应用到组件级上下文 | S2：它能否把 API 语义迁移到新上下文？ | F4（语义错误）/ F2 |
| **D3** | 组合 `connection()` 与 `after()`，同时满足跨文档约束 | S2：它能否推理跨文档交互约束？ | F4（语义错误） |
| **D4** | 升级 App Router 的缓存逻辑，同时保留 Pages Router 旧实现 | S3：它能否区分“该升级”和“该保留”？ | F5（过度迁移） |

**D0 是 D2 的配对对照组。** 两者任务相同、复杂度相同，但 D0 使用的是模型已经熟悉的 API。如果模型能过 D0 却过不了 D2，那么失败原因更可能是“从文档到执行的迁移失败”，而不是一般性的适配能力不足。

### 多阶段断言

每个 case 都包含映射到多个阶段的断言。以 D1 为例：

```text
D1-S0   Transcript：第一次写代码前读取了 docs                → Stage 0
D1-S2a  Code：从 next/server 导入了 connection             → Stage 2
D1-S2b  Code：任何文件中都不应出现 unstable_noStore        → Stage 2
D1-S4   next build 退出码为 0                              → Stage 4
D1-S5   Transcript：修改后 agent 执行了 build               → Stage 5
```

如果一个 case 只有 `next build` 断言，那它只是 benchmark。一个同时在 S0、S2、S4、S5 都有断言的 case，才是诊断工具。

---

## 单次运行输出

每次运行都会产出结构化的诊断数据：

```json
{
  "case": "D1",
  "model": "k25",
  "condition": "docs",
  "run": 1,
  "assertions": {
    "D1-S0":  { "pass": false, "detail": "No doc reads before first code write" },
    "D1-S2a": { "pass": false, "detail": "connection not found in imports" },
    "D1-S2b": { "pass": false, "detail": "unstable_noStore found in app/page.tsx:7" },
    "D1-S4":  { "pass": true,  "detail": "Build succeeded" },
    "D1-S5":  { "pass": true,  "detail": "Agent ran npm run build at step 14" }
  },
  "diagnosis": {
    "stage_of_failure": 0,
    "fallback_pattern": "F1",
    "detail": "Agent used unstable_noStore() without consulting docs. Build passed with old API."
  }
}
```

### 聚合输出

核心交付物是**按模型、按条件统计的 Stage × Pattern 频次表**：

```text
K2.5 Baseline                              K2.5 +Docs
         F1   F2   F3   F4   F5   Pass              F1   F2   F3   F4   F5   Pass
S0      [ 3] [  ] [  ] [  ] [  ] [  ]      S0      [  ] [  ] [  ] [  ] [  ] [ 3]
S2      [  ] [  ] [  ] [  ] [  ] [  ]      S2      [  ] [ 1] [  ] [ 2] [  ] [  ]
S3      [  ] [  ] [  ] [  ] [  ] [  ]      S3      [  ] [  ] [  ] [  ] [ 2] [ 1]
Ctrl    [  ] [  ] [  ] [  ] [  ] [ 3]      Ctrl    [  ] [  ] [  ] [  ] [  ] [ 3]
```

这个表回答的是：文档到底修复了什么？模型在拿到文档后仍然失败在哪里？持续存在的到底是哪一种失败？

---

## 快速开始

```bash
# 安装依赖
pnpm install

# 配置环境变量：复制 .env.example 为 .env.local，然后设置：
#   AI_GATEWAY_API_KEY、ANTHROPIC_API_KEY 或 OPENAI_API_KEY
#   VERCEL_TOKEN / VERCEL_OIDC_TOKEN，或使用 Docker sandbox

# 预览执行计划（不会调用模型，不产生费用）
npx @vercel/agent-eval cc --dry

# 运行实验
npx @vercel/agent-eval cc        # Claude Code
npx @vercel/agent-eval codex     # Codex

# 查看结果
npx @vercel/agent-eval playground
```

---

## 仓库结构

```text
├── docs/
│   ├── failure-stage-model.md          # S0–S5 阶段定义
│   ├── fallback-pattern-taxonomy.md    # F1–F5 模式定义
│   └── eval-case-design.md             # 用例设计原理
│
├── experiments/
│   ├── cc.ts                           # Claude Code 实验配置
│   ├── codex.ts                        # Codex 实验配置
│   └── d-suite.ts                      # 完整诊断套件
│
├── evals/
│   ├── d0-control-baseline/
│   ├── d1-direct-replacement-baseline/
│   ├── d1-direct-replacement-docs/
│   ├── d2-context-adaptation-baseline/
│   ├── d2-context-adaptation-docs/
│   ├── d3-api-composition-baseline/
│   ├── d3-api-composition-docs/
│   ├── d4-incremental-migration-baseline/
│   └── d4-incremental-migration-docs/
│       ├── PROMPT.md                   # 给 agent 的任务描述
│       ├── EVAL.ts                     # Vitest 多阶段断言
│       ├── app/                        # 最小 Next.js fixture
│       └── docs/                       # 注入式文档（仅 +docs）
│
└── AGENTS.md
```

---

## 实验设计

### 核心实验

| 实验 | 模型 | 文档条件 | 运行次数 | 目的 |
|------------|------|----------|----------|------|
| `k25-baseline` | Kimi K2.5 | 不注入文档 | 3 × 5 cases | 基线失败模式 |
| `k25-docs` | Kimi K2.5 | 注入文档 | 3 × 5 cases | 文档迁移效果测量 |
| `k26-baseline` | Kimi K2.6 | 不注入文档 | 3 × 5 cases | 训练数据时效性影响 |
| `k26-docs` | Kimi K2.6 | 注入文档 | 3 × 5 cases | 文档迁移效果测量 |

总计：**60 次运行。** 每次运行都会产生一个诊断坐标（Stage × Pattern）。

### 参考实验（预算允许时）

可以对 Sonnet 4.6 和 Opus 4.6 各跑单次参考实验，用于建立能力上限。这些实验不参与方法学验证分析。

### 预飞探针

在投入 60 次运行之前，先对 K2.6 baseline 的 D1 跑一次探针。如果 K2.6 在没有文档的情况下就已经知道目标 API，那么 baseline / +docs 的对比就失去测量意义。此时应改用别的 API 目标，或者把 K2.6 仅作为上限参考模型。

---

## 方法文档

建议按以下顺序阅读：

1. **[Failure Stage Model](docs/failure-stage-model.md)**：定义 S0–S5。失败源自认知链路中的哪一段？
2. **[Fallback Pattern Taxonomy](docs/fallback-pattern-taxonomy.md)**：定义 F1–F5。失败以什么行为模式表现出来？
3. **[Eval Case Design](docs/eval-case-design.md)**：说明 D0–D4 如何映射到 Stage × Pattern 矩阵，以及各 case 的多阶段断言设计。

一句话概括：**先定位失败阶段，再分类回退模式，最后比较 baseline 和 +docs。**

---

## 贡献

在新增 case 之前，先回答两个问题：

1. 这个 case 主要诊断哪个 Stage？
2. 它最可能触发哪一种 Fallback Pattern？

这两个问题比“任务够不够难”更重要。没有明确诊断目标的 case，只会制造噪声。

规范见 [AGENTS.md](AGENTS.md)：TypeScript + ESM、2 空格缩进、目录命名遵循 `d<n>-<scenario>-<variant>`，并且必须有多阶段断言。

---

## 许可证

MIT
