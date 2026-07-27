import dns from 'dns'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from './src/models/Post.js';
import Tag from './src/models/Tag.js';
import User from './src/models/User.js';
import { embed } from './src/config/embeddings.js';

dotenv.config();

dns.setServers([
  "8.8.8.8",
  "8.8.4.4"
]);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devsolved';

const seedRealIncidents = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Find an author to attribute the posts to
    const author = await User.findOne({ username: 'system_admin' }) || await User.findOne({});
    if (!author) {
      console.error('No users found in database. Run seed.js first.');
      process.exit(1);
    }
    const authorId = author._id;

    const allTags = await Tag.find({});
    const getTags = (names) => {
      return allTags.filter(t => names.includes(t.name.toLowerCase())).map(t => t._id);
    };

    // Block Generator Helpers
    const heading = (text, icon = 'hash') => ({ type: 'custom-heading', heading: text, content: text, icon });
    const p = (text) => ({ type: 'paragraph', content: text });
    const code = (text, language = 'bash') => ({ type: 'code', language, content: text });
    const list = (items) => ({ type: 'list', items });
    const img = (src, caption = '') => ({ type: 'image', src, caption });
    const quote = (text) => ({ type: 'quote', content: text, icon: 'quote' });
    const alert = (text, icon = 'alert-triangle') => ({ type: 'alert', content: text, icon });
    const symptom = (text) => ({ type: 'symptom', content: text });
    const rootCause = (text) => ({ type: 'rootCause', content: text });
    const resolution = (text) => ({ type: 'resolution', content: text });
    const fiveWhys = (whys) => ({ type: 'five-whys', whys });
    const actionItems = (items) => ({ type: 'action-items', items });
    const timeline = (steps) => ({ type: 'timeline', steps });

    const incidents = [
{
        title: 'CrowdStrike Falcon 2024: The Global BSOD Outage',
        excerpt: 'A parameter count mismatch within Channel File 291 triggered an out-of-bounds memory read in the Falcon sensor kernel driver, causing 8.5 million Windows devices to BSOD globally.',
        status: 'resolved',
        severity: 'critical',
        investigationHours: 72,
        coverImage: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&q=80&w=1200',
        content: [
          alert('MTTR (Mean Time To Recovery): 4 days (for full global ecosystem recovery)', 'clock'),
          symptom('At 04:09 UTC on July 19, 2024, millions of Windows devices globally began crashing with a "Blue Screen of Death" (BSOD). The crashes were isolated to systems running the CrowdStrike Falcon sensor and were trapped in a continuous boot-loop. Airlines, hospitals, and financial institutions were severely impacted.'),
          img('https://images.unsplash.com/photo-1563206767-5b18f218e8de?auto=format&fit=crop&q=80&w=1200', 'Impacted critical infrastructure worldwide'),
          
          heading('The Technical Architecture', 'cpu'),
          p('The CrowdStrike Falcon sensor operates as a boot-start driver at the kernel level (Ring 0) in Windows. It uses "Channel Files" to receive rapid configuration updates without requiring a full sensor update.'),
          
          heading('The Root Cause', 'terminal'),
          rootCause('The outage was caused by a specific logic error in the parsing of Channel File 291. A new IPC Template Type was deployed that expected 21 input parameters. However, the Content Interpreter integration only supplied 20 parameters.'),
          p('When the Falcon sensor attempted to evaluate the 21st parameter, it attempted an out-of-bounds memory read. Because the driver runs in kernel space, Windows instantly panicked to protect the system, resulting in a Stop Code (BSOD).'),
          code(`// Conceptual Representation of the Fault\nvoid evaluate_template(int* params, int count) {\n  // Expected count = 21, Actual provided count = 20\n  for(int i=0; i<21; i++) {\n    // Crash occurs at i=20 (Out of bounds read)\n    process_param(params[i]); \n  }\n}`, 'c'),
          
          heading('Timeline of Events', 'clock'),
          timeline([
            { time: '04:09 UTC', status: 'critical', actor: 'System', content: 'Channel File 291 update deployed globally.' },
            { time: '04:15 UTC', status: 'investigating', actor: 'SRE Team', content: 'Massive spike in customer reports of BSODs worldwide.' },
            { time: '05:27 UTC', status: 'resolved', actor: 'SRE Team', content: 'Faulty Channel File 291 reverted on the backend.' },
            { time: '06:00 UTC', status: 'monitoring', actor: 'IT Admins', content: 'Manual remediation (Safe Mode boots) begins globally.' }
          ]),
          
          heading('Resolution & Remediation', 'check-circle'),
          resolution('CrowdStrike immediately reverted the update. However, because affected machines were stuck in a boot-loop, they could not receive the reverted file over the network.'),
          p('IT administrators globally had to perform manual remediation:'),
          list([
            'Boot Windows into Safe Mode or the Windows Recovery Environment',
            'Navigate to C:\\Windows\\System32\\drivers\\CrowdStrike',
            'Delete the file matching C-00000291*.sys',
            'Reboot the machine normally'
          ]),
          
          heading('Post-Incident Action Items', 'clipboard-list'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Implement robust compiler-level bounds checking in Content Interpreter', owner: 'Sensor Engineering' },
            { completed: true, priority: 'high', task: 'Stagger Channel File deployments (Canary rollouts) instead of global pushes', owner: 'Release Engineering' },
            { completed: false, priority: 'medium', task: 'Enhance automated fuzz-testing for all IPC Templates', owner: 'QA Team' }
          ])
        ],
        tags: getTags(['windows', 'cybersecurity']),
        isDraft: false,
        upvotes: 4520,
        views: 89000,
        createdAt: new Date('2024-07-21T10:00:00Z')
      },
      {
        title: 'Cloudflare 2025: The Bot Management Feature File Crash',
        excerpt: 'A database permission change caused a duplicate-row query, doubling the size of an ML feature file. The oversized file caused memory exhaustion and crashed edge nodes globally, taking down sites across the internet.',
        status: 'resolved',
        severity: 'critical',
        investigationHours: 12,
        coverImage: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=1200',
        content: [
          alert('MTTR (Mean Time To Recovery): 3 hours 15 minutes', 'clock'),
          symptom('At roughly 15:45 UTC, traffic passing through Cloudflare began dropping severely. Millions of users attempting to visit Cloudflare-protected websites encountered 502/503 HTTP errors. The system entered a global "fail-closed" state.'),
          
          heading('Architecture Context', 'server'),
          p('Cloudflare utilizes a sophisticated Bot Management system powered by Machine Learning. Every 5 minutes, an internal pipeline queries a ClickHouse database to generate a "feature file" which is then propagated to every edge node globally.'),
          
          heading('The Root Cause', 'terminal'),
          rootCause('An infrastructure engineer performed a routine permission update on the ClickHouse database. This inadvertently triggered a bug in the query logic, causing it to return duplicate rows.'),
          quote('Because of the duplicate rows, the generated Machine Learning feature file doubled in size from 50MB to 100MB.'),
          p('When this oversized file was pushed to the edge network, the service responsible for parsing it (which had strict memory allocation limits) crashed due to Out-Of-Memory (OOM) errors. Because the Bot Management system is designed to "fail-closed" (block traffic when unsure), it began blocking legitimate internet traffic globally.'),
          
          heading('5 Whys Analysis', 'help-circle'),
          fiveWhys([
            { question: 'Why did internet traffic drop globally?', answer: 'The edge proxy crashed and defaulted to a fail-closed state.' },
            { question: 'Why did the edge proxy crash?', answer: 'It ran out of memory while parsing the Bot Management ML feature file.' },
            { question: 'Why did it run out of memory?', answer: 'The feature file was exactly twice its normal size.' },
            { question: 'Why was the file twice its normal size?', answer: 'The internal pipeline query returned duplicate rows.' },
            { question: 'Why did the query return duplicate rows?', answer: 'A routine permission update on the ClickHouse database altered the query execution plan.' }
          ]),
          
          heading('Resolution', 'check-circle'),
          resolution('Engineers identified the oversized feature file and disabled its distribution. They reverted the ClickHouse database permission change and restarted the Bot Management services across the edge fleet.')
        ],
        tags: getTags(['cloudflare', 'machine-learning', 'database']),
        isDraft: false,
        upvotes: 3105,
        views: 65400,
        createdAt: new Date('2025-11-20T14:30:00Z')
      },
      {
        title: 'AWS Kinesis 2020: US-EAST-1 Cascading Failure',
        excerpt: 'Adding new capacity to the Kinesis front-end fleet pushed the servers over the operating system maximum thread limit, breaking internal communication and taking down Cognito, CloudWatch, and Lambda.',
        status: 'resolved',
        severity: 'critical',
        investigationHours: 48,
        coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200',
        content: [
          alert('MTTR (Mean Time To Recovery): 14 hours', 'clock'),
          symptom('At 5:15 AM PST, error rates spiked for Amazon Kinesis Data Streams in the US-EAST-1 region. Because Kinesis is a foundational service, this triggered a massive cascading failure across AWS. Cognito, CloudWatch, EventBridge, and Lambda all experienced severe degradation. Even the AWS Service Health Dashboard was unable to update because it relied on Cognito.'),
          
          heading('The Root Cause', 'terminal'),
          rootCause('The Kinesis front-end fleet uses a microservices mesh where every server must maintain communication with every other server to share "shard-map" data. The system was designed to use exactly one OS thread per connection.'),
          p('To handle increased holiday traffic, AWS engineers added new servers to the fleet. As the new servers came online, they attempted to build connections to the existing fleet.'),
          quote('This addition pushed the total number of inter-node connections past the operating system\'s maximum allowed thread limit per process.'),
          p('Unable to spawn new threads, the servers could no longer update their shard-maps, rendering them unable to route requests to the backend data clusters. The front-end fleet completely locked up.'),
          code('java.lang.OutOfMemoryError: unable to create new native thread\n  at java.lang.Thread.start0(Native Method)\n  at java.lang.Thread.start(Thread.java:717)', 'java'),
          
          heading('Resolution Strategy', 'check-circle'),
          resolution('Because the front-end servers were locked, AWS engineers had to slowly and manually remove the newly added capacity, and then carefully restart the front-end fleet in small batches to ensure the thread limits were not breached again during the cold-start phase.'),
          p('To prevent this in the future, AWS migrated the Kinesis front-end to larger EC2 instance types. By using larger (but fewer) servers, the total node count in the fleet decreased, drastically reducing the number of OS threads required for the mesh communication.')
        ],
        tags: getTags(['aws', 'infrastructure', 'networking']),
        isDraft: false,
        upvotes: 5930,
        views: 120000,
        createdAt: new Date('2020-11-28T09:00:00Z')
      },
{
        title: 'React Hydration Mismatch: The "Text content did not match" Nightmare',
        excerpt: 'A seemingly harmless Date object rendered differently on the server versus the client, causing React 18 to discard the entire server-rendered DOM and rebuild it from scratch, tanking our Core Web Vitals.',
        status: 'resolved',
        severity: 'high',
        investigationHours: 6,
        content: [
          heading('The Symptom', 'activity'),
          symptom('After migrating our e-commerce storefront to Next.js with React 18, our Cumulative Layout Shift (CLS) scores spiked. Users complained that the page would visually "flash" white for a split second right after loading. The browser console was flooded with `Warning: Text content did not match. Server: "10:30 AM" Client: "14:30 PM"`.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('We were displaying the user\'s local time for an upcoming flash sale using `new Date().toLocaleTimeString()`. The Next.js server rendered the page in UTC ("10:30 AM"). When the React bundle hydrated on the client\'s browser (which was in EST), the client calculated "14:30 PM". React 18\'s strict hydration caught the mismatch. Because it couldn\'t reconcile the differences, it bailed out of hydration and completely destroyed and re-rendered the entire component tree.'),
          code('// The fatal flaw: Relying on browser-specific state during initial render\nconst FlashSaleTimer = () => {\n  const [time, setTime] = useState(new Date().toLocaleTimeString());\n  return <div>Sale ends at: {time}</div>;\n};', 'javascript'),
          heading('Resolution', 'check-circle'),
          resolution('We implemented a `useMounted` hook to suppress the client-side time rendering until *after* hydration was complete. During SSR and the initial hydration pass, the component renders a generic "Loading..." skeleton. Only after the `useEffect` fires does it read the browser\'s timezone and swap the text.'),
          code('// The fix: Two-pass rendering\nconst FlashSaleTimer = () => {\n  const [isMounted, setIsMounted] = useState(false);\n  useEffect(() => setIsMounted(true), []);\n\n  if (!isMounted) return <div>Sale ends at: --:--</div>;\n  return <div>Sale ends at: {new Date().toLocaleTimeString()}</div>;\n};', 'javascript'),
          actionItems([
            { completed: true, priority: 'high', task: 'Audit codebase for other browser-specific API calls in initial state', owner: 'Frontend Team' },
            { completed: true, priority: 'normal', task: 'Enable ESLint `react-hooks/exhaustive-deps` strictly', owner: 'QA Team' }
          ])
        ],
        tags: getTags(['react', 'frontend']),
        isDraft: false,
        upvotes: 4200,
        views: 89000,
        createdAt: new Date('2024-03-12T09:00:00Z')
      },
      {
        title: 'Kubernetes OOMKilled: The Memory Limit Death Spiral',
        excerpt: 'A misconfigured Java heap size inside a Docker container caused our payment processing pods to get aggressively killed by the Kubernetes kubelet, resulting in a 15% transaction failure rate.',
        status: 'resolved',
        severity: 'critical',
        investigationHours: 12,
        content: [
          alert('Financial Impact: 15% of inbound Stripe webhooks were dropped and had to be manually replayed.', 'alert-triangle'),
          heading('The Symptom', 'activity'),
          symptom('Our Datadog dashboards started alerting heavily for `PodRestartRate`. The payment microservice was constantly restarting. `kubectl describe pod` revealed the Reason as `OOMKilled` with an exit code of 137. However, our APM (Application Performance Monitoring) inside the JVM showed memory usage was perfectly stable.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('We allocated 2GB of RAM to the Kubernetes pod limits (`limits: memory: "2Gi"`). However, the Java application was started without explicit `-Xmx` heap size flags. By default, older Java 8 runtimes look at the *host node\'s* total physical RAM (which was 64GB on our AWS instances) and dynamically set the heap size to 1/4th of that (16GB). The JVM thought it had 16GB of RAM to use, but the Linux cgroup enforced by Kubernetes brutally killed the process the millisecond it crossed the 2GB limit.'),
          code('resources:\n  requests:\n    memory: "1Gi"\n  limits:\n    memory: "2Gi"\n\n# The fatal flaw:\n# command: ["java", "-jar", "app.jar"]', 'yaml'),
          heading('Resolution', 'check-circle'),
          resolution('We upgraded the container base image to a modern Java 17 runtime that respects Linux cgroups (`-XX:+UseContainerSupport`), and explicitly configured the JVM to use a percentage of the container\'s memory using `-XX:MaxRAMPercentage=75.0`.'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Explicitly set MaxRAMPercentage on all JVM workloads', owner: 'DevOps' },
            { completed: true, priority: 'high', task: 'Create PromQL alerts for container memory usage > 90% of limit', owner: 'SRE Team' }
          ])
        ],
        tags: getTags(['kubernetes', 'docker']),
        isDraft: false,
        upvotes: 5100,
        views: 110000,
        createdAt: new Date('2023-11-20T14:30:00Z')
      },
      {
        title: 'Redis Cache Stampede: The Thundering Herd Problem',
        excerpt: 'When a highly requested, computationally expensive cache key expired, 5,000 concurrent requests instantly hit our primary database to recalculate the value, melting the database cluster.',
        status: 'resolved',
        severity: 'critical',
        investigationHours: 8,
        content: [
          heading('The Symptom', 'activity'),
          symptom('Exactly at midnight every day, our entire API would go down for exactly 3 minutes. The Postgres database connection pool would max out, CPU would hit 100%, and pgbouncer would start rejecting connections with `Pool exhausted`.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('We generated a massive "Daily Global Leaderboard" that took 15 seconds to compute. We cached this in Redis with an exact TTL (Time To Live) of 24 hours, expiring right at midnight. Because our traffic is global, thousands of users hit the leaderboard endpoint at 00:00:01. They all checked Redis, found a cache miss, and *simultaneously* triggered the 15-second database query. This is a classic Cache Stampede (or Thundering Herd).'),
          fiveWhys([
            'Why did the DB crash? Because it received 5,000 identical heavy queries simultaneously.',
            'Why did it receive them simultaneously? Because the Redis cache expired.',
            'Why didn\'t just one request recalculate it? Because we didn\'t lock the regeneration process.',
            'Why did it expire at peak time? Because we hardcoded a 24-hour TTL starting at midnight.'
          ]),
          heading('Resolution', 'check-circle'),
          resolution('We implemented "Probabilistic Early Expiration" (XFetch). Instead of a hard TTL, a background worker is responsible for calculating the leaderboard every 23 hours and 55 minutes, overwriting the cache *before* it ever expires. The cache essentially never expires from the perspective of user traffic.'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Move leaderboard generation to Celery background worker', owner: 'Backend Team' },
            { completed: true, priority: 'normal', task: 'Implement distributed locking using Redlock for heavy cache misses', owner: 'Backend Team' }
          ])
        ],
        tags: getTags(['redis', 'postgresql']),
        isDraft: false,
        upvotes: 6700,
        views: 135000,
        createdAt: new Date('2024-02-15T12:00:00Z')
      },
      {
        title: 'PostgreSQL Transaction ID Wraparound: The Read-Only Lockdown',
        excerpt: 'Our primary Postgres cluster suddenly stopped accepting all write operations and forced itself into read-only mode to prevent catastrophic data corruption due to transaction ID exhaustion.',
        status: 'resolved',
        severity: 'critical',
        investigationHours: 24,
        content: [
          alert('Database Impact: 4 hours of total write downtime. No users could sign up, purchase, or modify data.', 'alert-triangle'),
          heading('The Symptom', 'activity'),
          symptom('Every single `INSERT`, `UPDATE`, or `DELETE` query failed instantly with the error: `ERROR: database is not accepting commands to avoid wraparound data loss in database "production"`.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('PostgreSQL uses a 32-bit integer for Transaction IDs (XIDs), allowing ~2 billion transactions. To reuse IDs safely without older data disappearing (becoming "invisible"), Postgres runs a background process called "autovacuum" to freeze old transaction IDs. A massive, long-running data migration script had been running for 5 days. This long-running transaction blocked autovacuum from freezing any rows. The XID counter eventually hit the 2-billion limit, forcing Postgres into read-only mode to prevent catastrophic data loss.'),
          heading('Resolution', 'check-circle'),
          resolution('We had to SSH into the database instances, forcefully terminate the hanging data migration transaction using `pg_cancel_backend()`, and then run an aggressive manual `VACUUM FREEZE` in single-user mode. This process took 4 hours due to disk I/O constraints.'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Add Datadog alerts for `xid_age` > 1.5 billion', owner: 'DBA Team' },
            { completed: true, priority: 'high', task: 'Set `idle_in_transaction_session_timeout` to 5 minutes to kill hung scripts automatically', owner: 'DBA Team' }
          ])
        ],
        tags: getTags(['postgresql', 'aws']),
        isDraft: false,
        upvotes: 8100,
        views: 195000,
        createdAt: new Date('2023-09-10T16:00:00Z')
      },
      {
        title: 'Docker Build Bloat: The 8GB Container Pipeline Bottleneck',
        excerpt: 'Our CI/CD pipeline slowed down to a crawl, taking 45 minutes to deploy a minor CSS change because our Node.js Docker images had ballooned to 8GB each.',
        status: 'resolved',
        severity: 'normal',
        investigationHours: 4,
        content: [
          heading('The Symptom', 'activity'),
          symptom('Developers complained that GitLab CI pipelines were taking over 45 minutes just to push to the registry. EC2 nodes in the staging cluster were constantly running out of disk space (`No space left on device`).'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('The Dockerfile was poorly structured. It copied the entire directory (including `node_modules` and `.git`), ran `npm install`, and then ran `npm run build`. Every single file change invalidated the Docker layer cache, forcing a complete re-download of all dependencies. Furthermore, the base image was the bloated `node:18` (which is almost 1GB) instead of Alpine, and the `.dockerignore` file was completely missing.'),
          code('FROM node:18\n# The fatal flaw: Copying everything before installing invalidates cache!\nCOPY . .\nRUN npm install\nRUN npm run build\nCMD ["npm", "start"]', 'dockerfile'),
          heading('Resolution', 'check-circle'),
          resolution('We implemented a Multi-stage build using `node:18-alpine`. We explicitly copied `package.json` first to leverage layer caching, installed dependencies, built the app, and then copied ONLY the `dist/` folder into a pristine, tiny production image.'),
          code('FROM node:18-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:18-alpine AS production\nWORKDIR /app\nCOPY --from=builder /app/dist ./dist\nCMD ["node", "dist/main.js"]', 'dockerfile'),
          actionItems([
            { completed: true, priority: 'high', task: 'Implement multi-stage builds across all 15 microservices', owner: 'DevOps' },
            { completed: true, priority: 'normal', task: 'Add mandatory `.dockerignore` reviews to PR templates', owner: 'DevOps' }
          ])
        ],
        tags: getTags(['docker', 'nodejs']),
        isDraft: false,
        upvotes: 3500,
        views: 75000,
        createdAt: new Date('2024-01-05T11:00:00Z')
      },
      {
        title: 'AWS Lambda Cold Start Avalanche: The Serverless Timeout',
        excerpt: 'A sudden burst of marketing traffic triggered thousands of concurrent AWS Lambda executions. The 4-second cold start time caused API Gateway to timeout, resulting in a 100% error rate for new users.',
        status: 'resolved',
        severity: 'high',
        investigationHours: 7,
        content: [
          heading('The Symptom', 'activity'),
          symptom('During a major marketing push, our serverless signup API dropped all traffic. API Gateway returned `504 Gateway Timeout`. CloudWatch logs showed thousands of new Lambda environments spinning up, but execution times were hitting 5.5 seconds.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('Our backend was written in Java/Spring Boot and deployed as a monolithic AWS Lambda function. When a Lambda function experiences a "cold start" (initializing a brand new container), the JVM has to boot, Spring Boot does component scanning, and DB connections are established. This took ~5 seconds. Because traffic spiked instantly from 10 to 500 req/sec, AWS spun up 490 new Lambda containers simultaneously. All of them hit the 5-second cold start penalty. However, API Gateway had a hard timeout of 3 seconds.'),
          heading('Resolution', 'check-circle'),
          resolution('We enabled "AWS Lambda Provisioned Concurrency" for the signup endpoint, keeping 100 containers permanently warm. Long-term, we migrated the Spring Boot monolith to a lightweight Node.js/Go function, reducing cold start times to 150ms.'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Configure Provisioned Concurrency for all critical user path Lambdas', owner: 'Backend Team' },
            { completed: true, priority: 'high', task: 'Rewrite Java monolith Lambdas into smaller Go functions', owner: 'Architecture Team' }
          ])
        ],
        tags: getTags(['aws', 'go']),
        isDraft: false,
        upvotes: 5900,
        views: 122000,
        createdAt: new Date('2023-10-30T09:30:00Z')
      },
      {
        title: 'Python GIL Deadlock: The Multi-threading Illusion',
        excerpt: 'Attempting to parallelize heavy CPU-bound image processing tasks in Python using `threading` resulted in absolutely zero performance gains and eventually deadlocked the web server.',
        status: 'resolved',
        severity: 'normal',
        investigationHours: 5,
        content: [
          heading('The Symptom', 'activity'),
          symptom('We implemented a new endpoint to apply filters to uploaded images. To make it faster, a developer used Python\'s `concurrent.futures.ThreadPoolExecutor` to process 4 image channels concurrently. Instead of being 4x faster, CPU utilization stayed stuck at 100% on a single core, and eventually, the Gunicorn workers hung entirely.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('Python\'s Global Interpreter Lock (GIL) prevents multiple native threads from executing Python bytecodes at once. While `threading` works great for I/O-bound tasks (like making network requests), it completely blocks on CPU-bound tasks (like matrix math for image filters). The threads were thrashing violently as they fought for the GIL, adding massive context-switching overhead.'),
          code('import concurrent.futures\n\n# The fatal flaw: Using threads for CPU-bound work in Python\nwith concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:\n    results = list(executor.map(heavy_cpu_image_filter, image_chunks))', 'python'),
          heading('Resolution', 'check-circle'),
          resolution('We switched from `ThreadPoolExecutor` to `ProcessPoolExecutor` (the `multiprocessing` module). This spins up entirely separate Python processes, each with its own GIL and memory space, allowing true parallelism across multiple CPU cores.'),
          actionItems([
            { completed: true, priority: 'high', task: 'Refactor all CPU-bound background tasks to use Multiprocessing or Celery', owner: 'Backend Team' }
          ])
        ],
        tags: getTags(['python']),
        isDraft: false,
        upvotes: 2800,
        views: 64000,
        createdAt: new Date('2024-04-18T15:00:00Z')
      },
      {
        title: 'MongoDB Aggregation Memory Limit: The $group Catastrophe',
        excerpt: 'A monthly analytics report generation crashed the MongoDB cluster because a complex `$group` stage exceeded the hardcoded 100MB RAM limit for aggregation pipelines.',
        status: 'resolved',
        severity: 'high',
        investigationHours: 6,
        content: [
          heading('The Symptom', 'activity'),
          symptom('At the end of the month, the cron job responsible for generating invoice summaries failed repeatedly. The Node.js application logged a MongoError: `PlanExecutor error during aggregation :: caused by :: Sort exceeded memory limit of 104857600 bytes`.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('The aggregation pipeline used a `$match`, followed by a `$sort`, and finally a `$group` stage across 5 million records. MongoDB enforces a strict 100MB memory limit per stage for aggregations. Because the `$sort` stage occurred *before* the data was grouped and reduced, it attempted to hold all 5 million full documents in RAM simultaneously, immediately blowing past the 100MB limit.'),
          code('db.invoices.aggregate([\n  { $match: { status: "paid" } },\n  { $sort: { createdAt: -1 } }, // FAILS HERE: Trying to sort 5M docs in RAM\n  { $group: { _id: "$customerId", total: { $sum: "$amount" } } }\n])', 'javascript'),
          heading('Resolution', 'check-circle'),
          resolution('We added `{ allowDiskUse: true }` to the aggregation options, which tells MongoDB to spill the excess sorting data to temporary files on the disk instead of failing. We also optimized the pipeline by moving the `$sort` stage *after* the `$group` stage, significantly reducing the amount of data that needed to be sorted.'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Add allowDiskUse: true to all heavy analytical aggregation pipelines', owner: 'Data Team' },
            { completed: true, priority: 'normal', task: 'Review indexing strategy to ensure $sort operations can utilize indexes', owner: 'DBA Team' }
          ])
        ],
        tags: getTags(['mongodb', 'nodejs']),
        isDraft: false,
        upvotes: 4900,
        views: 95000,
        createdAt: new Date('2023-12-01T08:00:00Z')
      },
      {
        title: 'TypeScript Type Instantiation: The Infinite Loop',
        excerpt: 'A complex, deeply nested recursive generic type caused the TypeScript compiler (tsc) to run out of memory, completely blocking our CI/CD deployment pipeline.',
        status: 'resolved',
        severity: 'high',
        investigationHours: 3,
        content: [
          heading('The Symptom', 'activity'),
          symptom('The GitHub Actions build step started failing randomly with `JavaScript heap out of memory`. When developers ran `npm run build` locally, their fans would spin up to maximum, and the process would eventually crash with `TS2589: Type instantiation is excessively deep and possibly infinite`.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('A developer created a clever but overly complex recursive utility type to convert database snake_case keys into camelCase keys for the frontend (using Template Literal Types). While it worked fine for simple objects, when it was applied to a massive nested API response interface with recursive relationships, the TypeScript compiler tried to evaluate thousands of permutations, exhausting the V8 engine\'s memory.'),
          code('// The fatal flaw: Recursive template literal types on deep structures\ntype SnakeToCamelCase<S extends string> = ...\ntype DeepCamelize<T> = T extends object ? {\n    [K in keyof T as SnakeToCamelCase<K & string>]: DeepCamelize<T[K]>\n} : T;', 'typescript'),
          heading('Resolution', 'check-circle'),
          resolution('We removed the runtime-mimicking magic types. Instead of forcing the type system to compute camel casing, we explicitly defined the API response interfaces. We accepted that explicit interfaces are better than overly "clever" types that crash the compiler.'),
          actionItems([
            { completed: true, priority: 'high', task: 'Remove DeepCamelize utility and strictly type API responses', owner: 'Frontend Team' }
          ])
        ],
        tags: getTags(['typescript', 'react']),
        isDraft: false,
        upvotes: 6100,
        views: 115000,
        createdAt: new Date('2024-05-10T14:00:00Z')
      },
      {
        title: 'Nginx Ingress Connection Dropping: The keep-alive Phantom',
        excerpt: 'Random HTTP 502 Bad Gateway errors spiked during high-traffic events because our Nginx Ingress controller and our upstream Node.js servers disagreed on how long to keep TCP connections open.',
        status: 'resolved',
        severity: 'critical',
        investigationHours: 16,
        content: [
          heading('The Symptom', 'activity'),
          symptom('During peak load, about 1% of API requests randomly failed with `502 Bad Gateway`. The Node.js application logs showed absolutely zero errors. The Nginx Ingress logs in Kubernetes showed `upstream prematurely closed connection while reading response header from upstream`.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('This is a classic TCP race condition. Node.js has a default `keepAliveTimeout` of 5 seconds. Nginx has a default `keepalive_timeout` of 60 seconds (but was configured to 75s in our cluster). Nginx would reuse an idle TCP connection that had been open for 4.9 seconds and send a new request. At that exact millisecond, Node.js decided the connection was idle for 5 seconds and abruptly closed the TCP socket. Nginx received a RST packet while trying to send data, resulting in a 502 error for the user.'),
          fiveWhys([
            'Why did Nginx throw a 502? Because the upstream Node.js server closed the TCP connection.',
            'Why did Node close it? Because its internal keep-alive timer (5s) expired.',
            'Why did Nginx try to use an expired connection? Because Nginx\'s keep-alive timer was set to 75s.',
            'Why didn\'t Nginx retry? Because the request was a POST, which is non-idempotent and unsafe to retry automatically.'
          ]),
          heading('Resolution', 'check-circle'),
          resolution('We explicitly configured the Node.js Express server to have a `keepAliveTimeout` that is *strictly greater* than the Nginx timeout. We set Node.js to 65000ms (65s), ensuring that Nginx is always the one to gracefully close idle connections, preventing the race condition.'),
          code('// The fix: Ensure upstream timeout > proxy timeout\nconst server = app.listen(8080);\nserver.keepAliveTimeout = 65000; // 65 seconds\nserver.headersTimeout = 66000; // Keep-alive + 1s', 'javascript'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Audit keep-alive timeouts across all proxy layers (Cloudflare -> Nginx -> Node)', owner: 'DevOps' }
          ])
        ],
        tags: getTags(['kubernetes', 'nodejs']),
        isDraft: false,
        upvotes: 7200,
        views: 140000,
        createdAt: new Date('2023-08-25T10:00:00Z')
      },
{
        title: 'DNS Propagation Nightmare: The Global Routing Blackhole',
        excerpt: 'A seemingly innocuous update to our authoritative nameservers on Route53 propagated incorrectly due to a stale glue record at the registrar level, causing 40% of global users to see a "Site Not Found" error for 24 hours.',
        status: 'resolved',
        severity: 'critical',
        investigationHours: 24,
        content: [
          alert('Availability Impact: 40% of global internet traffic was blackholed. Revenue loss estimated at $120,000.', 'alert-triangle'),
          heading('The Symptom', 'activity'),
          symptom('At 09:00 UTC, we migrated our DNS hosting from Cloudflare to AWS Route53. We updated the NS records at our domain registrar. By 11:00 UTC, our monitoring indicated a massive drop in traffic. Users on Twitter reported that the domain simply did not exist. However, our internal ping tests and Dig commands from our office network resolved the domain perfectly. The outage was heavily localized to specific ISPs globally.'),
          timeline([
            { time: "09:00", event: "DNS migration initiated. NS records updated at registrar." },
            { time: "09:15", event: "Initial TTL of 300s expires. Traffic seems stable." },
            { time: "11:00", event: "Traffic drops by 40%. Customer support queue spikes." },
            { time: "12:30", event: "Identified that users resolving via Google Public DNS (8.8.8.8) were failing, while Cloudflare (1.1.1.1) users were succeeding." },
            { time: "14:00", event: "Discovered the concept of 'Glue Records' and realized the registrar was still serving the old IP addresses for the authoritative nameservers." }
          ]),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('When migrating DNS, updating the NS records in the zone file is not enough. The Top Level Domain (TLD) servers (.com) need to know which IP addresses correspond to those nameservers. These are called "Glue Records". We updated the NS records in the Route53 zone, and we updated the registrar\'s nameserver list. However, because we previously used custom vanity nameservers (ns1.ourdomain.com), the registrar had hidden glue records caching the OLD Cloudflare IP addresses for those nameservers. When an ISP recursively resolved our domain, it hit the .com TLD, which handed back the old IPs. The ISP then tried to ask the old IPs (which Cloudflare had already deactivated), resulting in an NXDOMAIN (domain does not exist) error.'),
          quote('DNS is always the culprit, even when it looks like a network layer issue. Never underestimate the power of stale glue records.'),
          fiveWhys([
            'Why did users get NXDOMAIN? Because their ISP\'s recursive resolvers could not reach our nameservers.',
            'Why couldn\'t they reach our nameservers? Because the resolvers were given the wrong IP addresses for our nameservers.',
            'Why did they have the wrong IPs? Because the .com TLD servers handed out stale Glue Records.',
            'Why were the glue records stale? We didn\'t explicitly delete the vanity nameserver IP mappings at our registrar before initiating the migration.',
            'Why didn\'t we delete them? A lack of understanding of how custom nameserver glue records persist independently of NS record delegation.'
          ]),
          heading('Resolution', 'check-circle'),
          resolution('We had to log back into our domain registrar, navigate to the advanced "Registered Name Servers" panel, and manually delete the IP address mappings for `ns1.ourdomain.com`. Once deleted, the TLD servers stopped handing out the bad glue records. Unfortunately, because TLD records often have a 48-hour TTL, we had to wait for ISP caches globally to expire. We mitigated the immediate impact by temporarily reactivating the Cloudflare zone to catch the stale traffic.'),
          code('// How to verify glue records via the terminal\ndig +trace devsolved.com\n// Look for the "Received [ip] from [TLD server] in [ms]" line. If that IP is wrong, it\'s a glue record issue.', 'bash'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Document complete DNS migration runbook including Glue Record verification', owner: 'DevOps' },
            { completed: true, priority: 'high', task: 'Implement synthetic global DNS monitoring using ThousandEyes', owner: 'SRE Team' }
          ])
        ],
        tags: getTags(['aws', 'architecture', 'networking']),
        isDraft: false,
        upvotes: 9500,
        views: 250000,
        createdAt: new Date('2024-01-10T08:00:00Z')
      },
      {
        title: 'Kafka Consumer Lag Death Spiral: The Rebalance Storm',
        excerpt: 'A slight degradation in database write latency caused our Kafka consumers to miss their heartbeat intervals. This triggered an endless loop of consumer group rebalancing, entirely halting a pipeline processing 50,000 messages per second.',
        status: 'resolved',
        severity: 'critical',
        investigationHours: 18,
        content: [
          alert('Data Pipeline Impact: 400 million analytics events were delayed by 8 hours, causing massive reporting discrepancies for enterprise clients.', 'alert-triangle'),
          heading('The Symptom', 'activity'),
          symptom('Our primary analytics consumer group started exhibiting massive lag. The Datadog dashboard showed consumer lag spiking from near-zero to over 50 million messages. Strangely, the CPU on the consumer microservices dropped to near zero, indicating they were doing absolutely no work. Kafka broker logs were flooded with `Preparing to rebalance group` and `Member has left group`.'),
          timeline([
            { time: "18:00", event: "PostgreSQL database experiences a minor latency spike during a backup." },
            { time: "18:05", event: "Kafka consumer lag alerts trigger." },
            { time: "18:15", event: "Engineering notices consumers are caught in a rebalance loop." },
            { time: "19:00", event: "Attempted to restart consumer pods. Issue persists immediately upon restart." },
            { time: "22:00", event: "Identified the `max.poll.interval.ms` configuration flaw." }
          ]),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('Kafka relies on consumer heartbeats to know if a consumer is alive. However, Kafka also enforces a `max.poll.interval.ms` (default 5 minutes). This means a consumer *must* finish processing its batch of messages and call `.poll()` again within 5 minutes. Because our database write latency spiked, processing a single batch of 500 messages suddenly took 6 minutes. The Kafka broker assumed the consumer was dead (livelock), kicked it out of the group, and triggered a "Rebalance" to reassign the partitions to other consumers. During a rebalance, ALL consumers in the group pause processing. Once the rebalance finished, a new consumer picked up the exact same heavy batch, took 6 minutes, got kicked out, and triggered ANOTHER rebalance. This loop paralyzed the entire 50-node cluster.'),
          p('The crux of the issue was a fundamental misunderstanding of how Kafka handles backpressure. We thought that as long as the background heartbeat thread was ticking, Kafka would be happy. We didn\'t realize the main processing thread had a strict deadline.'),
          code('// The fatal configuration (using defaults)\nconst consumer = kafka.consumer({ groupId: \'analytics-group\' })\nawait consumer.run({\n  eachBatch: async ({ batch }) => {\n    // If this takes > 5 minutes (300000ms), Kafka kills the consumer\n    await insertIntoDatabase(batch.messages);\n  }\n})', 'javascript'),
          fiveWhys([
            'Why did consumer lag spike? Because the consumer group was constantly rebalancing.',
            'Why was it rebalancing? Because consumers were being evicted for missing the poll interval.',
            'Why did they miss the poll interval? Because processing a batch took longer than 5 minutes.',
            'Why did processing take so long? Because the downstream Postgres database experienced a minor latency spike.',
            'Why did a minor DB spike break Kafka? Because we were fetching batches of 500 messages at a time, creating a massive cumulative latency risk per batch.'
          ]),
          heading('Resolution', 'check-circle'),
          resolution('We implemented two critical fixes. First, we drastically reduced `max.poll.records` from 500 to 50. This ensures a batch processes much faster, easily beating the 5-minute deadline even if the database is slow. Second, we explicitly increased `max.poll.interval.ms` to 10 minutes to provide a buffer for temporary downstream degradation.'),
          code('// The fix: Tune batch sizes and timeouts\nconst consumer = kafka.consumer({\n  groupId: \'analytics-group\',\n  maxWaitTimeInMs: 100,\n})\nawait consumer.run({\n  eachBatchAutoResolve: true,\n  partitionsConsumedConcurrently: 1,\n  // Keep batch small so it processes fast\n})', 'javascript'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Audit `max.poll.records` on all Kafka consumer microservices', owner: 'Data Team' },
            { completed: true, priority: 'high', task: 'Create specific alerts for Kafka Rebalance Rate metrics', owner: 'DevOps' }
          ])
        ],
        tags: getTags(['architecture', 'database', 'backend']),
        isDraft: false,
        upvotes: 8200,
        views: 180000,
        createdAt: new Date('2023-11-05T09:00:00Z')
      },
      {
        title: 'Ruby on Rails: The ActiveStorage Bloat OOM',
        excerpt: 'Sidekiq workers processing Excel exports started consuming gigabytes of RAM until the Linux OOM Killer destroyed the EC2 instances. The culprit was a hidden buffer in Rails ActiveStorage.',
        status: 'resolved',
        severity: 'normal',
        investigationHours: 8,
        content: [
          heading('The Symptom', 'activity'),
          symptom('Users clicking the "Export All Transactions" button were complaining that they never received the email with their CSV file. Looking at the AWS console, our background worker EC2 instances were constantly crashing and rebooting. Syslogs revealed `Out of memory: Killed process (ruby)`.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('We used the `axlsx` gem to generate Excel files, and then attached the generated file to an `Export` ActiveRecord model using ActiveStorage (`export.file.attach(io: File.open(temp_file))`). However, because the files were generated locally on the disk, ActiveStorage decided it needed to read the *entire* file into a string in RAM to calculate the MD5 checksum before uploading it to S3. For a 2GB Excel file, this forced Ruby to allocate 2GB of contiguous memory, instantly crashing the 2GB worker node.'),
          code('# The fatal flaw: ActiveStorage reading whole files into memory for checksums\nclass ExportWorker\n  def perform(export_id)\n    export = Export.find(export_id)\n    temp_file = generate_massive_excel(export)\n    \n    # This line reads the entire 2GB file into RAM instantly\n    export.file.attach(io: File.open(temp_file), filename: "export.xlsx")\n  end\nend', 'ruby'),
          p('The abstraction provided by ActiveStorage completely hid the fact that it was not streaming the upload, but rather buffering it into memory.'),
          heading('Resolution', 'check-circle'),
          resolution('We bypassed ActiveStorage\'s automatic checksum generation for massive files by using the lower-level AWS SDK directly. We implemented a multipart streaming upload directly to S3. Once the file was safely in S3, we created the ActiveStorage `Blob` record manually and attached it to the model without pulling the file back into memory.'),
          code('# The fix: Direct multipart S3 streaming\ns3_resource = Aws::S3::Resource.new\nobj = s3_resource.bucket("exports").object("temp/export.xlsx")\nobj.upload_file(temp_file_path) # AWS SDK streams chunks efficiently\n\nblob = ActiveStorage::Blob.create_before_direct_upload!(\n  filename: "export.xlsx",\n  byte_size: File.size(temp_file_path),\n  checksum: "bypass" # Skip memory-heavy checksum\n)\nexport.update(file: blob.signed_id)', 'ruby'),
          actionItems([
            { completed: true, priority: 'high', task: 'Audit all `attach` calls for files potentially larger than 50MB', owner: 'Backend Team' },
            { completed: true, priority: 'normal', task: 'Implement presigned URLs for client-side direct uploads to bypass Ruby entirely where possible', owner: 'Frontend Team' }
          ])
        ],
        tags: getTags(['ruby', 'aws', 'performance']),
        isDraft: false,
        upvotes: 4600,
        views: 92000,
        createdAt: new Date('2024-02-20T11:00:00Z')
      },
      {
        title: 'CSS Grid Layout Thrashing: The 10-Second Scroll Freeze',
        excerpt: 'A highly complex React dashboard with thousands of data cells utilized nested CSS Grids. Updating a single cell triggered a cascading browser layout recalculation that completely locked up the main thread.',
        status: 'resolved',
        severity: 'high',
        investigationHours: 12,
        content: [
          alert('UX Impact: The main application thread locked for up to 10 seconds every time a user scrolled, making the app entirely unusable on low-end hardware.', 'alert-triangle'),
          heading('The Symptom', 'activity'),
          symptom('When users opened the "Financial Matrix" view, the browser became completely unresponsive. Attempting to scroll with the mouse wheel did nothing, until suddenly the page would jump 500 pixels 10 seconds later. Chrome DevTools Performance Profiler showed a massive red block labeled "Recalculate Style" taking 9,500ms.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('The matrix was a massive 100x100 grid of financial data (10,000 DOM nodes). The developers used a deeply nested `display: grid` structure where columns were set to `auto` or `min-content`. Furthermore, a React `onScroll` listener was attempting to calculate the `getBoundingClientRect()` of the container to implement a sticky header. This combination caused "Layout Thrashing" (Forced Synchronous Layout).'),
          fiveWhys([
            'Why did the scroll freeze? Because the browser main thread was locked computing layouts.',
            'Why did layout computation take 10 seconds? Because the DOM had 10,000 nodes using dynamic CSS Grid sizing (`auto`).',
            'Why was layout calculated synchronously during scroll? Because React called `getBoundingClientRect()` inside an `onScroll` handler.',
            'Why does `getBoundingClientRect()` force a layout? Because the browser must calculate the exact pixel position of every element to return the bounding box.',
            'Why did `auto` sizing make it worse? Because calculating the bounding box of a dynamic grid requires the browser to recursively measure the content of all 10,000 cells.'
          ]),
          p('Every time the user scrolled 1 pixel, the `onScroll` event fired. The JS asked the browser for the element\'s exact height. The browser had to pause JS, calculate the height of all 10,000 dynamically sized grid cells, return the value, and then resume JS. Doing this 60 times a second instantly killed the browser.'),
          code('// The fatal flaw: Reading layout properties synchronously during paint events\nwindow.addEventListener("scroll", () => {\n  // Forces a massive synchronous layout calculation\n  const rect = gridRef.current.getBoundingClientRect(); \n  if (rect.top < 0) setSticky(true);\n});', 'javascript'),
          heading('Resolution', 'check-circle'),
          resolution('We completely overhauled the architecture. First, we implemented "DOM Virtualization" (using `react-window`), meaning only the 50 rows currently visible on screen were actually rendered in the DOM. Second, we replaced the synchronous `onScroll` math with an `IntersectionObserver`, which allows the browser to calculate element visibility asynchronously off the main thread. Finally, we removed `auto` from the CSS Grid and used fixed pixel widths for cells.'),
          code('// The fix: Asynchronous Intersection Observer\nconst observer = new IntersectionObserver(([entry]) => {\n  setSticky(!entry.isIntersecting);\n});\nobserver.observe(headerRef.current);', 'javascript'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Implement DOM virtualization on all tables with > 100 rows', owner: 'Frontend Team' },
            { completed: true, priority: 'high', task: 'Add a linter rule to warn against `getBoundingClientRect` inside scroll loops', owner: 'Frontend Team' }
          ])
        ],
        tags: getTags(['react', 'frontend', 'performance']),
        isDraft: false,
        upvotes: 7500,
        views: 165000,
        createdAt: new Date('2024-03-25T14:00:00Z')
      },
      {
        title: 'Git Force-Push Catastrophe: The Vanishing Database Migration',
        excerpt: 'A developer trying to clean up their commit history using an interactive rebase and a force push accidentally erased a critical database migration from the `main` branch, breaking staging deployments for two days.',
        status: 'resolved',
        severity: 'high',
        investigationHours: 8,
        content: [
          heading('The Symptom', 'activity'),
          symptom('The automated staging deployment pipeline started failing with a fatal ORM error: `column "stripe_customer_id" does not exist`. Looking at the codebase, the migration file that added this column was completely missing, even though the pull request that supposedly added it was marked as "Merged" two days prior.'),
          timeline([
            { time: "Monday 10:00", event: "Developer A merges PR #101 containing the migration for `stripe_customer_id`." },
            { time: "Monday 11:30", event: "Developer B creates a new feature branch from an outdated version of `main`." },
            { time: "Tuesday 09:00", event: "Developer B attempts to rebase their branch onto `main`. They encounter massive conflicts." },
            { time: "Tuesday 09:15", event: "Developer B resolves conflicts incorrectly, dropping Developer A's migration commit." },
            { time: "Tuesday 09:30", event: "Developer B force-pushes their branch, gets PR approval, and merges." },
            { time: "Tuesday 10:00", event: "Staging deployment fails. The database is in an inconsistent state." }
          ]),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('This was a classic Git history rewrite collision. Developer B was working on a long-lived branch. When they executed `git rebase main`, they were confronted with a complex merge conflict regarding the database schema version file. In a panic to resolve the conflict, they accidentally accepted "their" changes (the outdated version of the schema) over the incoming changes, essentially erasing Developer A\'s commit from their local history. Because they had to use `git push --force` to update their PR branch after the rebase, the PR didn\'t show the deleted file clearly. When merged (using a Squash merge), the resulting commit on `main` effectively reverted Developer A\'s migration.'),
          quote('Git is a powerful weapon. An interactive rebase followed by a force-push is like juggling chainsaws; eventually, you\'ll drop one on your foot.'),
          heading('Resolution', 'check-circle'),
          resolution('We had to utilize `git reflog` on the build server to identify the exact commit hash where the migration was lost. We then cherry-picked the lost migration commit back onto `main` and generated a new database schema lockfile. To prevent this permanently, we implemented branch protection rules on GitHub, absolutely forbidding force pushes to `main`, and requiring branches to be "Up to date" before merging (blocking merges if the base branch has advanced).'),
          code('# Finding the lost commit\ngit log --all -S "stripe_customer_id"\n# Found hash 8a9b2c. Cherry-picking it back.\ngit cherry-pick 8a9b2c', 'bash'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Enable "Require branches to be up to date before merging" in GitHub settings', owner: 'DevOps' },
            { completed: true, priority: 'high', task: 'Host an internal workshop on safe rebasing and `git push --force-with-lease`', owner: 'Engineering Management' }
          ])
        ],
        tags: getTags(['architecture']), // Git/Devops proxy
        isDraft: false,
        upvotes: 8100,
        views: 195000,
        createdAt: new Date('2023-10-12T09:00:00Z')
      },
      {
        title: 'Next.js API Rate Limiting: The Vercel Timeout Bill',
        excerpt: 'A malicious botnet bypassed our CDN rate limiting by targeting highly dynamic, uncacheable search API routes. This exhausted our serverless function execution limits, taking the site offline and generating a massive surprise bill.',
        status: 'resolved',
        severity: 'critical',
        investigationHours: 5,
        content: [
          alert('Financial Impact: Serverless function execution timeouts resulted in an unexpected $4,500 overage charge from Vercel in 6 hours.', 'alert-triangle'),
          heading('The Symptom', 'activity'),
          symptom('At 3:00 AM, PagerDuty alerted us that the production website was returning HTTP 429 Too Many Requests globally. When we logged into the Vercel dashboard, our account had been temporarily suspended for exceeding our Enterprise bandwidth and Serverless Function execution limits by 4000%.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('We had configured Cloudflare rate limiting on our root domain to block IPs making more than 100 requests per minute. However, an attacker realized our `/api/search?q=[term]` endpoint in Next.js (which queries an external ElasticSearch cluster) was both highly uncacheable and very slow (taking ~2 seconds per request). The attacker used a distributed botnet of 50,000 unique IP addresses to send 1 request per minute to the search API. This completely bypassed Cloudflare\'s per-IP rate limit. The Vercel serverless functions spun up thousands of instances, each staying alive for 2 seconds. This exhausted our concurrent execution limits, effectively causing a Denial of Service (DoS) for legitimate users, while simultaneously racking up massive per-millisecond billing charges.'),
          fiveWhys([
            'Why did Vercel suspend our account? We hit the hard cap on serverless function execution duration.',
            'Why did we hit the limit? A botnet was spamming our `/api/search` route.',
            'Why didn\'t Cloudflare block it? The botnet distributed the attack so no single IP triggered the 100 req/min rule.',
            'Why was the route so expensive to execute? It performed a synchronous backend query taking 2 seconds.',
            'Why wasn\'t the route cached? We were dynamically rendering search results without implementing stale-while-revalidate (SWR).'
          ]),
          heading('Resolution', 'check-circle'),
          resolution('We implemented an emergency Application Firewall (WAF) rule in Cloudflare to challenge all requests to `/api/search` with a Turnstile Captcha. This instantly dropped bot traffic to zero. Long term, we implemented Upstash (Redis) global rate limiting inside the Next.js edge middleware. By running the rate limit check at the Edge (which executes in 5ms), we blocked the bad requests before they ever triggered the expensive, 2-second serverless function.'),
          code('// The fix: Edge Middleware Rate Limiting with Upstash\nimport { Ratelimit } from "@upstash/ratelimit";\nimport { Redis } from "@upstash/redis";\n\nconst ratelimit = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, "10 s") });\n\nexport async function middleware(request) {\n  const ip = request.ip ?? "127.0.0.1";\n  const { success } = await ratelimit.limit(ip);\n  if (!success) return new Response("Rate limit exceeded", { status: 429 });\n}', 'javascript'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Implement Edge Rate Limiting on all uncacheable API routes', owner: 'Frontend Team' },
            { completed: true, priority: 'high', task: 'Configure Vercel Spend Limits to hard-cap billing and prevent surprise overages', owner: 'DevOps' }
          ])
        ],
        tags: getTags(['security', 'react', 'nodejs']),
        isDraft: false,
        upvotes: 10200,
        views: 290000,
        createdAt: new Date('2024-05-18T03:00:00Z')
      },
      {
        title: 'MySQL Deadlock on Foreign Keys: The Checkout Cascade',
        excerpt: 'Two concurrent transactions attempting to insert records into related tables in the opposite order triggered an obscure InnoDB deadlock, causing 5% of e-commerce checkouts to fail silently.',
        status: 'resolved',
        severity: 'high',
        investigationHours: 14,
        content: [
          heading('The Symptom', 'activity'),
          symptom('Customer support reported that a small percentage of users were clicking "Pay Now", but their orders never appeared in their account. The payment gateway showed the charge was successful. Our server logs revealed `ER_LOCK_DEADLOCK: Deadlock found when trying to get lock; try restarting transaction`.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('The issue stemmed from how MySQL (InnoDB engine) handles row-level locks on tables with Foreign Key constraints. When a user checked out, Transaction A would lock the `users` row to update their loyalty points, and then attempt to insert a row into `orders` (which has a foreign key referencing `users`). Simultaneously, a background webhook (Transaction B) would attempt to insert a receipt into `orders`, and then update the `users` table to mark them as a returning customer. Because Transaction A locked `users` and waited for `orders`, while Transaction B locked `orders` and waited for `users`, a classic circular deadlock occurred. InnoDB detected this and instantly aborted Transaction A to break the cycle.'),
          quote('Deadlocks aren\'t bugs in the database; they are bugs in how your application orders its operations.'),
          heading('Resolution', 'check-circle'),
          resolution('We refactored the application code to guarantee a consistent global locking order. Every transaction across the entire monolith must now always lock/update the `users` table FIRST, before touching the `orders` table. Because both transactions now request locks in the exact same sequence, Transaction B simply waits patiently in line for Transaction A to finish, entirely eliminating the circular dependency.'),
          code('// The fatal flaw: Inconsistent locking order\n// Webhook Tx: Locks Orders -> Locks Users\n// Checkout Tx: Locks Users -> Locks Orders (DEADLOCK!)\n\n// The fix: Global ordered locking convention\n// Webhook Tx: Locks Users -> Locks Orders\n// Checkout Tx: Locks Users -> Locks Orders', 'javascript'),
          actionItems([
            { completed: true, priority: 'high', task: 'Implement automatic transaction retry logic for Deadlock exceptions at the ORM level', owner: 'Backend Team' },
            { completed: true, priority: 'normal', task: 'Document global database locking order conventions in the engineering wiki', owner: 'Architecture Team' }
          ])
        ],
        tags: getTags(['database', 'backend']),
        isDraft: false,
        upvotes: 5600,
        views: 125000,
        createdAt: new Date('2023-12-10T11:00:00Z')
      },
      {
        title: 'Android Dex Limit: The NoClassDefFoundError Avalanche',
        excerpt: 'Adding a massive advertising SDK to our Android app pushed our codebase over the Dalvik 64K method reference limit. Because multidex was misconfigured, the app crashed immediately on startup for thousands of users.',
        status: 'resolved',
        severity: 'critical',
        investigationHours: 9,
        content: [
          alert('App Impact: The v2.4.0 release had a 100% crash rate on launch for users on older Android devices. Ratings dropped from 4.8 to 3.2 stars.', 'alert-triangle'),
          heading('The Symptom', 'activity'),
          symptom('Immediately after rolling out the new update to the Google Play Store, Crashlytics exploded. Thousands of crashes were logged with `java.lang.NoClassDefFoundError: Failed resolution of: Lcom/ourcompany/app/MainActivity;`. The app was literally forgetting that its own main screen existed.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('The Android Dalvik Executable (DEX) bytecode format historically limits a single `.dex` file to referencing a maximum of 65,536 methods (the 64K limit). We added a bulky third-party Ad SDK which contained 30,000 methods, pushing our total to 85,000. The build system automatically split our code into two files: `classes.dex` and `classes2.dex`. However, on older Android versions (pre-Lollipop), the OS only loads `classes.dex` on startup. Because our `MainActivity` was randomly placed into `classes2.dex` by the compiler, the OS couldn\'t find it when the app launched, resulting in a fatal crash.'),
          fiveWhys([
            'Why did the app crash? The OS threw a NoClassDefFoundError for MainActivity.',
            'Why couldn\'t it find MainActivity? Because it was compiled into a secondary dex file (`classes2.dex`).',
            'Why was there a secondary dex file? Because we exceeded the 64K method limit.',
            'Why didn\'t the OS load the secondary file? Because older Android versions don\'t support native multidex.',
            'Why didn\'t we catch this in testing? QA only tested on Android 11 devices (which natively support multidex), completely missing the issue on Android 4.4 devices.'
          ]),
          heading('Resolution', 'check-circle'),
          resolution('We explicitly integrated the Google `multidex` support library and modified our Application class to extend `MultiDexApplication`. This forces the app to manually load `classes2.dex` during the initialization phase, before `MainActivity` is invoked. We also utilized ProGuard (R8) to aggressively strip unused methods from the Ad SDK, bringing our total method count back under 60,000.'),
          code('// The fix: Enabling multidex in build.gradle\nandroid {\n    defaultConfig {\n        multiDexEnabled true\n    }\n}\ndependencies {\n    implementation "androidx.multidex:multidex:2.0.1"\n}', 'javascript'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Rollback v2.4.0 in Play Store and deploy hotfix', owner: 'Mobile Team' },
            { completed: true, priority: 'high', task: 'Configure Firebase Test Lab to run automated UI tests on legacy OS versions (API 19+)', owner: 'QA Team' }
          ])
        ],
        tags: getTags(['frontend', 'architecture']), // Android proxy
        isDraft: false,
        upvotes: 3900,
        views: 88000,
        createdAt: new Date('2024-04-05T16:00:00Z')
      },
      {
        title: 'CORS Preflight Cache Miss: The Double Traffic Phantom',
        excerpt: 'An overly restrictive `Access-Control-Max-Age` header caused the browser to send a preflight OPTIONS request before EVERY single API call, artificially doubling backend traffic and latency.',
        status: 'resolved',
        severity: 'normal',
        investigationHours: 6,
        content: [
          heading('The Symptom', 'activity'),
          symptom('After migrating our frontend to a new domain, users reported the app felt sluggish. Monitoring tools showed our API Gateway traffic had exactly doubled overnight. However, Google Analytics showed our active user count remained completely flat.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('Because the frontend and backend were now on different domains, the browser engaged Cross-Origin Resource Sharing (CORS) protections. Before sending a `POST` or `PUT` request with custom headers (like `Authorization`), the browser sends a preflight `OPTIONS` request to ask the server for permission. Our backend responded with `Access-Control-Allow-Origin: *`, but we failed to include an `Access-Control-Max-Age` header. By default, Chromium caches preflight responses for only 5 seconds. This meant that every time a user navigated the app, the browser was firing duplicate OPTIONS requests, doubling network latency (due to round trips) and artificially inflating our server load.'),
          code('// The fatal flaw: Express CORS middleware defaults\napp.use(cors({\n  origin: \'https://app.devsolved.com\',\n  methods: [\'GET\', \'POST\', \'PUT\']\n  // Missing maxAge!\n}));', 'javascript'),
          heading('Resolution', 'check-circle'),
          resolution('We updated our CORS middleware to include `Access-Control-Max-Age: 86400` (24 hours). Now, the browser makes a single OPTIONS request when the user first opens the app, caches the permission, and sends all subsequent API calls directly, instantly cutting our backend traffic by 50% and improving perceived app performance.'),
          actionItems([
            { completed: true, priority: 'high', task: 'Update API Gateway CORS configurations with 24-hour Max-Age', owner: 'DevOps' },
            { completed: true, priority: 'normal', task: 'Ensure monitoring dashboards filter out OPTIONS requests from business metric calculations', owner: 'Data Team' }
          ])
        ],
        tags: getTags(['networking', 'nodejs', 'frontend']),
        isDraft: false,
        upvotes: 8900,
        views: 195000,
        createdAt: new Date('2024-01-28T14:30:00Z')
      },
      {
        title: 'Memcached Eviction Avalanche: The Serialization Trap',
        excerpt: 'A seemingly safe deployment changed the underlying class structure of cached objects in our Rails app. The new code treated all 50GB of previously cached Memcached data as invalid, simulating a catastrophic 0% cache hit rate at peak load.',
        status: 'resolved',
        severity: 'critical',
        investigationHours: 11,
        content: [
          alert('Performance Impact: Database CPU hit 100% instantly upon deployment. 503 Service Unavailable errors spiked to 30% for 45 minutes.', 'alert-triangle'),
          heading('The Symptom', 'activity'),
          symptom('We deployed a minor feature release at 12:00 PM. Instantly, our database connection pool maxed out and the application ground to a halt. We checked Memcached, and it was perfectly healthy, holding 50GB of data. However, the application\'s cache hit rate had plummeted from 98% to 0%.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('In Ruby on Rails, `Rails.cache.fetch` serializes complex objects (like ActiveRecord models) using `Marshal.dump` before storing them in Memcached. In this release, a developer added a new `virtual_attribute` to the User model. When the new code booted up, it queried the cache and received the old binary payload. However, because the underlying class structure had changed in memory, the `Marshal.load` deserialization failed silently (or the cache key versioning automatically rejected it). The application assumed the cache was empty and immediately fell back to the database. 50,000 concurrent users instantly executed heavy SQL queries, completely overwhelming the database.'),
          fiveWhys([
            'Why did the database crash? It received 50,000 queries a second.',
            'Why was the cache bypassed? The new code could not deserialize the old cached objects.',
            'Why couldn\'t it deserialize them? We mutated a core class structure without namespacing the cache keys.',
            'Why did this happen at peak load? We deployed a core model change at noon without warming up a new cache.',
            'Why didn\'t staging catch this? Staging didn\'t have 50GB of stale cached data to trigger the thundering herd.'
          ]),
          heading('Resolution', 'check-circle'),
          resolution('We immediately rolled back the deployment to restore the old class structure and rescue the database. To fix it properly, we implemented "Cache Key Versioning" (e.g., changing the cache key prefix from `v1/users/123` to `v2/users/123`). We then deployed a background script to slowly warm up the `v2` cache keys over 24 hours. Once the `v2` cache was warm, we deployed the code change safely.'),
          code('# The fix: Explicit cache key versioning\ndef cache_key\n  "v2/users/#{id}-#{updated_at.to_i}"\nend', 'ruby'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Mandate cache key version bumps for any ActiveRecord model schema changes', owner: 'Backend Team' },
            { completed: true, priority: 'high', task: 'Migrate from `Marshal` serialization to raw JSON to prevent class-binding issues', owner: 'Architecture' }
          ])
        ],
        tags: getTags(['ruby', 'database', 'performance']),
        isDraft: false,
        upvotes: 6800,
        views: 155000,
        createdAt: new Date('2023-09-18T12:00:00Z')
      }
    ];

    console.log(`Preparing to seed ${incidents.length} real-world incidents...`);
    
    // Clear existing incidents created by system_admin to prevent duplicates when re-running
    await Post.deleteMany({ author: authorId });
    console.log('Cleared existing system_admin posts to prevent duplicates.');

    for (const data of incidents) {
      const rawText = [
        data.title,
        data.excerpt,
        data.content.map(b => b.content).filter(Boolean).join('\n')
      ].join('\n');

      let embedding = [];
      try {
        embedding = await embed(rawText);
      } catch (err) {
        console.warn('Embedding failed (using empty array). Error:', err.message);
      }

      const post = new Post({
        ...data,
        author: authorId,
        embedding
      });
      await post.save();
      
      // Update cover image to use OG generating route
      post.coverImage = `/api/og/incidents/${post.slug}`;
      await post.save();
      
      console.log(`Created: ${post.title}`);
    }

    console.log('✅ All real-world incidents seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedRealIncidents();
