import Post from '../models/Post.js';
import { embed, cosineSimilarity } from '../config/embeddings.js';

/**
 * DevSolved Engineering Domain Ontology & Synonym Matrix
 * Maps abbreviations, infrastructure terminology, and conversational problem descriptions
 * directly to canonical engineering failure modes and tech stacks.
 */
const DEVOPS_ONTOLOGY = {
  // Container, Kubernetes & Cloud Orchestration
  k8s: ['kubernetes', 'pod', 'node', 'cluster', 'kubectl', 'oomkilled', 'crashloopbackoff', 'ingress', 'service', 'deployment', 'kubelet'],
  kubernetes: ['k8s', 'pod', 'container', 'docker', 'helm', 'namespace', 'oomkilled', 'crashloopbackoff'],
  docker: ['container', 'image', 'compose', 'k8s', 'registry', 'buildkit', 'volume', 'Dockerfile'],
  pod: ['k8s', 'kubernetes', 'container', 'oomkilled', 'crashloopbackoff', 'restart', 'node'],
  aws: ['amazon', 'cloud', 's3', 'ec2', 'iam', 'rds', 'lambda', 'ecs', 'eks', 'vpc', 'cloudfront', 'alb', 'route53'],
  gcp: ['google cloud', 'gke', 'bigquery', 'iam', 'pubsub', 'cloud run', 'gce', 'span'],
  azure: ['microsoft cloud', 'aks', 'cosmosdb', 'functions', 'entra', 'vnet'],

  // Databases, Caching & Storage
  db: ['database', 'sql', 'query', 'transaction', 'postgres', 'postgresql', 'mysql', 'mongodb', 'deadlock', 'pool', 'index', 'replica'],
  database: ['db', 'sql', 'query', 'postgres', 'postgresql', 'mysql', 'mongodb', 'deadlock', 'replication'],
  postgres: ['postgresql', 'psql', 'pg', 'db', 'sql', 'deadlock', 'wal', 'replication', 'connection pool', 'vacuum'],
  postgresql: ['postgres', 'psql', 'db', 'sql', 'deadlock', 'connection'],
  mysql: ['sql', 'innodb', 'db', 'mariadb', 'deadlock', 'query', 'galera'],
  redis: ['cache', 'in-memory', 'valkey', 'pubsub', 'eviction', 'ttl', 'queue', 'memory'],
  mongo: ['mongodb', 'nosql', 'document', 'collection', 'atlas', 'wiretiger'],
  sql: ['query', 'database', 'db', 'postgres', 'mysql', 'index', 'join', 'slow query'],

  // Failure Modes, Crashes & Diagnostics
  crash: ['outage', 'down', 'failure', 'panic', 'exception', 'fatal', 'segfault', 'downtime', 'unresponsive', 'error', 'restart', 'sigsegv'],
  outage: ['downtime', 'crash', 'down', 'sev1', 'incident', 'emergency', 'failure', 'blackout', 'unreachable', 'unavailable'],
  memory: ['ram', 'oom', 'oomkilled', 'leak', 'out of memory', 'heap', 'garbage collection', 'gc', 'allocation', 'swap'],
  oom: ['oomkilled', 'out of memory', 'memory leak', 'ram', 'heap limit', 'k8s crash', 'cgroup'],
  oomkilled: ['oom', 'out of memory', 'memory limit', 'k8s', 'kubernetes', 'pod crash', 'container'],
  cpu: ['processor', 'load', 'saturation', 'throttle', 'spike', 'bottleneck', 'high utilization', 'iowait'],
  slow: ['latency', 'lag', 'timeout', 'delay', 'bottleneck', 'degraded', 'unresponsive', 'throttle', 'high load'],
  timeout: ['504', 'gateway timeout', 'econnrefused', 'hang', 'slow', 'latency', 'deadline exceeded', 'connection timed out'],
  error: ['exception', 'stacktrace', 'bug', 'fault', 'crash', 'panic', 'failure', 'code', 'log'],
  deadlock: ['lock', 'race condition', 'concurrency', 'blocked', 'mutex', 'transaction timeout', 'contention'],
  leak: ['memory leak', 'connection leak', 'file descriptor', 'oom', 'handle', 'growth'],

  // Networking & Security
  auth: ['jwt', 'token', 'authentication', 'authorization', 'oauth', 'login', 'session', 'permission', '401', '403', 'rbac', 'sso'],
  security: ['vulnerability', 'cve', 'exploit', 'ddos', 'injection', 'xss', 'cors', 'firewall', 'ssl', 'tls', 'certificate'],
  dns: ['domain', 'nameserver', 'nxdomain', 'routing', 'cloudflare', 'bgp', 'resolution', 'etc hosts'],
  network: ['tcp', 'ip', 'routing', 'dns', 'bgp', 'load balancer', 'ingress', 'firewall', 'econnrefused', 'packet drop', 'latency', '502']
};

// Known technical HTTP codes & signal names for high-priority Error Intent recognition
const ERROR_SIGNATURE_REGEX = /\b(400|401|403|404|500|502|503|504|econnrefused|ehostunreach|enobufs|eaccess|eacces|oomkilled|sigkill|sigsegv|sigabRT|sigterm|eof|nullpointer|deadlock|panic|timeout|exception)\b/i;

/**
 * Intelligent Query Analyzer
 * Understands semantics, extracts engineering intents, and expands domain vocabularies.
 */
const analyzeQuery = (rawQuery) => {
  const query = rawQuery.trim();
  const lowercaseQuery = query.toLowerCase();
  const tokens = lowercaseQuery.split(/[\s,._/#-]+/).filter((w) => w.length >= 2);

  // 1. Identify Search Intent
  let intent = 'Semantic War Story Investigation';
  let isErrorSearch = false;
  let isResolvedFilter = false;
  let isActiveFilter = false;

  if (ERROR_SIGNATURE_REGEX.test(lowercaseQuery) || tokens.some((w) => ['error', 'exception', 'trace', 'crash', 'stack', 'oom', 'panic', 'fail', 'code'].includes(w))) {
    intent = 'Error Signature & Root-Cause Analysis';
    isErrorSearch = true;
  } else if (tokens.some((w) => ['resolved', 'solved', 'fix', 'fixed', 'solution', 'postmortem'].includes(w))) {
    intent = 'Resolved Investigations & Proven Fixes';
    isResolvedFilter = true;
  } else if (tokens.some((w) => ['investigating', 'active', 'open', 'unresolved', 'ongoing'].includes(w))) {
    intent = 'Active Outages & Ongoing Investigations';
    isActiveFilter = true;
  } else if (tokens.some((w) => Object.keys(DEVOPS_ONTOLOGY).slice(0, 15).includes(w))) {
    intent = 'Stack & Architecture Investigation';
  }

  // 2. Expand synonyms using domain matrix
  const expandedTerms = new Set(tokens);
  const detectedTags = new Set();

  for (const token of tokens) {
    if (DEVOPS_ONTOLOGY[token]) {
      detectedTags.add(token);
      DEVOPS_ONTOLOGY[token].forEach((syn) => expandedTerms.add(syn.toLowerCase()));
    }
  }

  // Build semantic prompt string for embedding model (injects contextual terms)
  const semanticPrompt = [query, ...Array.from(expandedTerms)].join(' ');

  return {
    originalQuery: query,
    tokens,
    expandedTerms: Array.from(expandedTerms).slice(0, 10),
    detectedTags: Array.from(detectedTags),
    intent,
    isErrorSearch,
    isResolvedFilter,
    isActiveFilter,
    semanticPrompt,
  };
};

/**
 * Advanced Domain-Aware Semantic Search Engine
 * Integrates vector neural embeddings (Xenova/all-MiniLM-L6-v2), ontology synonym matching,
 * regex error signature detection, and multi-signal engineering relevance ranking.
 *
 * @param {string} query   — User's search text or technical description
 * @param {number} limit   — Max results (default 10)
 * @returns {Promise<{results: Object[], analysis: Object}>}
 */
export const hybridSearch = async (query, limit = 10) => {
  if (!query || query.trim().length < 2) {
    return { results: [], analysis: { intent: 'Empty Query', expandedTerms: [] } };
  }

  const analysis = analyzeQuery(query);

  // ── Step 1: Generate semantic embedding of expanded domain context ───────
  let queryVector = null;
  try {
    queryVector = await embed(analysis.semanticPrompt);
  } catch (err) {
    console.warn('⚠️ Embedding generation unavailable, proceeding with advanced Lexical & NLP search:', err.message);
  }

  // ── Step 2: Multi-Pronged Candidate Retrieval (No Blind Spots) ────────────
  // 2a. MongoDB Full-Text search (BM25 keyword matches)
  const textCandidatesPromise = Post.find(
    { $text: { $search: analysis.originalQuery }, isDraft: false },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(40)
    .populate('author', 'username displayName avatarUrl')
    .populate('tags', 'name displayName color category')
    .select('+embedding')
    .lean();

  // 2b. Fuzzy & Regex Matching across title, excerpt & tagNames for partial terms & synonyms
  const regexPatterns = analysis.expandedTerms
    .filter((t) => t.length >= 3)
    .slice(0, 6)
    .map((term) => new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

  const regexQuery = {
    isDraft: false,
    $or: [
      { title: { $in: regexPatterns } },
      { excerpt: { $in: regexPatterns } },
      { tagNames: { $in: regexPatterns.map((r) => r) } },
    ],
  };

  if (analysis.isResolvedFilter) regexQuery.status = 'resolved';
  if (analysis.isActiveFilter) regexQuery.status = 'investigating';

  const regexCandidatesPromise = Post.find(regexQuery)
    .sort({ globalScore: -1, views: -1 })
    .limit(40)
    .populate('author', 'username displayName avatarUrl')
    .populate('tags', 'name displayName color category')
    .select('+embedding')
    .lean();

  // 2c. Global High-Relevance & Recent Corpus Pool (For deep vector semantic comparison)
  const globalCandidatesPromise = Post.find({ isDraft: false })
    .sort({ globalScore: -1, createdAt: -1 })
    .limit(60)
    .populate('author', 'username displayName avatarUrl')
    .populate('tags', 'name displayName color category')
    .select('+embedding')
    .lean();

  const [textCandidates, regexCandidates, globalCandidates] = await Promise.all([
    textCandidatesPromise,
    regexCandidatesPromise,
    globalCandidatesPromise,
  ]);

  // ── Step 3: Dedupe & Assemble Core Pool ───────────────────────────────────
  const seen = new Set();
  const candidatePool = [];

  for (const post of [...textCandidates, ...regexCandidates, ...globalCandidates]) {
    const id = post._id.toString();
    if (!seen.has(id)) {
      seen.add(id);
      candidatePool.push(post);
    }
  }

  // ── Step 4: Multi-Signal Relevance & NLP Scoring Matrix ───────────────────
  const maxKeywordScore = Math.max(...textCandidates.map((p) => p.score || 0), 1);
  const maxGlobalScore = Math.max(...candidatePool.map((p) => p.globalScore || 0), 1);

  const results = candidatePool
    .map((post) => {
      const titleLower = (post.title || '').toLowerCase();
      const excerptLower = (post.excerpt || '').toLowerCase();
      const postTagNames = (post.tagNames || post.tags?.map((t) => t.name || t) || []).map((t) => String(t).toLowerCase());

      // Signal 1: Vector Neural Similarity (45% weight)
      let vectorScore = 0;
      if (queryVector && post.embedding && post.embedding.length === 384) {
        vectorScore = Math.max(0, cosineSimilarity(queryVector, post.embedding));
      }

      // Signal 2: Lexical & Synonym Overlap Score (25% weight)
      let matchedTokenCount = 0;
      for (const term of analysis.expandedTerms) {
        if (titleLower.includes(term) || excerptLower.includes(term) || postTagNames.includes(term)) {
          matchedTokenCount++;
        }
      }
      const synonymScore = Math.min(1, (matchedTokenCount * 0.25) + ((post.score || 0) / maxKeywordScore * 0.5));

      // Signal 3: Tag & Technology Intersection (15% weight)
      let tagScore = 0;
      const tagMatches = analysis.expandedTerms.filter((term) => postTagNames.includes(term));
      if (tagMatches.length > 0) {
        tagScore = Math.min(1, tagMatches.length * 0.4);
      }

      // Signal 4: Community Gravity & Reputation Booster (15% weight)
      const communityScore = Math.min(1, (post.globalScore || 0) / maxGlobalScore + (post.upvotes > 0 ? 0.2 : 0));

      // Compute weighted base relevance
      let totalScore = (0.45 * vectorScore) + (0.25 * synonymScore) + (0.15 * tagScore) + (0.15 * communityScore);

      // Spotlight Boosters (Instant precision matching)
      let matchReason = '✨ Semantic match: correlated with your technical investigation';
      let reasonType = 'semantic';

      // Boost if exact original search text appears directly in the title
      if (titleLower.includes(analysis.originalQuery.toLowerCase())) {
        totalScore *= 1.45;
        matchReason = '🎯 Exact match: direct title correspondence';
        reasonType = 'exact';
      }
      // Boost if error code or signame directly matches title or excerpt
      else if (analysis.isErrorSearch && analysis.tokens.some((errToken) => titleLower.includes(errToken) || excerptLower.includes(errToken))) {
        totalScore *= 1.35;
        matchReason = '🔥 Error match: identical diagnostic or stack signature';
        reasonType = 'error';
      }
      // Boost if primary tech tag matched
      else if (tagMatches.length > 0) {
        totalScore *= 1.25;
        matchReason = `🏷️ Stack match: relevant to #${tagMatches[0]} architecture`;
        reasonType = 'tag';
      }
      // Boost if status intent satisfied
      else if ((analysis.isResolvedFilter && post.status === 'resolved') || (analysis.isActiveFilter && post.status === 'investigating')) {
        totalScore *= 1.15;
        matchReason = `🛠️ Solution match: verified ${post.status} investigation`;
        reasonType = 'status';
      }

      // Convert score to a calibrated user-facing percentage (between 68% and 99%)
      const percentageScore = Math.min(99, Math.max(68, Math.round((totalScore * 75) + 25)));

      return {
        ...post,
        relevanceScore: totalScore,
        matchPercentage: percentageScore,
        matchReason,
        reasonType,
      };
    })
    .filter((p) => p.relevanceScore > 0.08 || p.matchPercentage >= 68)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);

  // Clean up heavy embedding vectors from client return payload
  const cleanResults = results.map(({ embedding, ...rest }) => rest);

  return {
    results: cleanResults,
    analysis: {
      intent: analysis.intent,
      expandedTerms: analysis.expandedTerms.slice(0, 5),
      detectedTags: analysis.detectedTags,
      isErrorSearch: analysis.isErrorSearch,
      count: cleanResults.length,
    },
  };
};

/**
 * Fallback keyword search if needed by older callers
 */
const keywordOnlySearch = async (query, limit) => {
  return Post.find({ $text: { $search: query }, isDraft: false }, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .populate('author', 'username displayName avatarUrl')
    .populate('tags', 'name displayName color category')
    .lean();
};
