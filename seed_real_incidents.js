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
    const timeline = (steps) => ({ type: 'timeline', steps });
    const fiveWhys = (whys) => ({ type: 'five-whys', whys });
    const actionItems = (items) => ({ type: 'action-items', items });

    const incidents = [
      {
        title: 'Ruby on Rails: The Silent N+1 Query Avalanche',
        excerpt: 'A missing includes() in a deeply nested ActiveRecord association caused a single page load to fire 4,500 individual SQL queries, completely exhausting the database connection pool during peak traffic.',
        status: 'resolved',
        severity: 'high',
        investigationHours: 5,
        content: [
          alert('Performance Impact: App latency degraded from 200ms to 15,000ms. Database CPU hit 100%.', 'alert-triangle'),
          heading('The Symptom', 'activity'),
          symptom('During our annual Black Friday sale, the main product listing page became completely unresponsive. Users received 502 Bad Gateway errors. Our PostgreSQL database CPU spiked to 100%, but memory and disk I/O were perfectly normal.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('A developer added a new "Reviewer Badge" feature to the product cards. The view code iterated through `product.reviews` and then called `review.user.badge`. Because ActiveRecord uses lazy loading by default, fetching 50 products with 10 reviews each caused 1 query for the products, 50 queries for the reviews, and 500 queries for the users. Under high concurrency, these thousands of micro-queries saturated the PgBouncer connection pool.'),
          code('# The fatal flaw: Lazy loading associations in the view\n@products = Product.where(category: "electronics").limit(50)\n# In the view:\n@products.each do |product|\n  product.reviews.each do |review|\n    puts review.user.badge_name\n  end\nend', 'ruby'),
          heading('Resolution', 'check-circle'),
          resolution('Added `.includes(reviews: :user)` to the ActiveRecord query. This forced Rails to eager load the associations in exactly 3 SQL queries, regardless of how many products or reviews were returned.'),
          code('# The fix: Eager loading\n@products = Product.where(category: "electronics").includes(reviews: :user).limit(50)', 'ruby'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Deploy eager-loading hotfix to production', owner: 'Backend Team' },
            { completed: true, priority: 'high', task: 'Install and configure Bullet gem to fail tests on N+1 queries', owner: 'QA Team' }
          ])
        ],
        tags: getTags(['ruby', 'database', 'backend']),
        isDraft: false,
        upvotes: 1250,
        views: 22000,
        createdAt: new Date('2024-06-01T10:00:00Z')
      },
      {
        title: 'ElasticSearch Split-Brain: The Network Partition Disaster',
        excerpt: 'A brief network partition caused our ElasticSearch cluster to elect two separate master nodes, resulting in diverging data sets and a corrupted search index that took hours to reconcile.',
        status: 'resolved',
        severity: 'critical',
        investigationHours: 14,
        content: [
          alert('Data Impact: Inconsistent search results and 50GB of divergent document updates that required manual reconciliation.', 'alert-triangle'),
          heading('The Symptom', 'activity'),
          symptom('Customer support reported that users were seeing different search results depending on which refresh they hit. Some users saw products that were just deleted, while others did not. The ElasticSearch cluster health dropped to RED, but nodes were still accepting writes.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('Our ES cluster consisted of 4 nodes, all master-eligible. We had `discovery.zen.minimum_master_nodes` set to 2. A network switch failure partitioned the cluster into two halves (2 nodes each). Because the setting was 2, BOTH halves elected a master node. The cluster "split" into two independent clusters, both accepting writes but completely unaware of each other.'),
          heading('Resolution', 'check-circle'),
          resolution('We immediately shut down the minority partition to prevent further divergence. We then updated the cluster configuration to properly follow the (N/2)+1 rule for master election. With 4 nodes, the minimum master nodes MUST be 3 to prevent a split-brain.'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Update minimum_master_nodes to 3 across all environments', owner: 'DevOps' },
            { completed: true, priority: 'medium', task: 'Re-index the corrupted data from the primary PostgreSQL source of truth', owner: 'Data Team' }
          ])
        ],
        tags: getTags(['elasticsearch', 'infrastructure', 'database']),
        isDraft: false,
        upvotes: 3400,
        views: 45000,
        createdAt: new Date('2024-06-10T10:00:00Z')
      },
      {
        title: 'RabbitMQ Un-Ack Loop: The Poison Message',
        excerpt: 'A single malformed message caused our RabbitMQ consumer to crash before acknowledging the message. The message was re-queued infinitely, causing CPU to spike and delaying millions of legitimate messages.',
        status: 'resolved',
        severity: 'high',
        investigationHours: 6,
        content: [
          heading('The Symptom', 'activity'),
          symptom('Our asynchronous email sending queue backed up to 2 million messages. No emails were going out. The RabbitMQ console showed the queue size growing linearly, while the consumer nodes were at 100% CPU, seemingly processing messages as fast as possible.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('A malformed JSON payload was pushed to the queue. The Node.js consumer picked up the message and attempted to parse it using `JSON.parse()`. This threw a synchronous exception, crashing the worker thread. Because the message was never explicitly acknowledged (ACK) or rejected (NACK), RabbitMQ immediately re-queued it at the front of the line. The consumer picked it up again, crashed again, ad infinitum.'),
          code('// The fatal flaw: Uncaught exception in message handler\nchannel.consume(queue, (msg) => {\n  const data = JSON.parse(msg.content.toString()); // Crashes here!\n  sendEmail(data);\n  channel.ack(msg);\n});', 'javascript'),
          heading('Resolution', 'check-circle'),
          resolution('Wrapped the parsing logic in a try-catch block. If parsing fails, the message is explicitly NACK\'d with `requeue: false`, sending it to a Dead Letter Exchange (DLX) for manual inspection, allowing the queue to proceed to the next message.'),
          code('// The fix: Nack and Dead Letter Exchange\nchannel.consume(queue, (msg) => {\n  try {\n    const data = JSON.parse(msg.content.toString());\n    sendEmail(data);\n    channel.ack(msg);\n  } catch (err) {\n    channel.nack(msg, false, false); // Do not requeue\n  }\n});', 'javascript'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Implement Dead Letter Exchanges for all critical queues', owner: 'Backend Team' }
          ])
        ],
        tags: getTags(['rabbitmq', 'nodejs', 'backend']),
        isDraft: false,
        upvotes: 4100,
        views: 68000,
        createdAt: new Date('2024-06-15T10:00:00Z')
      },
      {
        title: 'Python Celery Memory Leak: The Pandas DataFrame Bloat',
        excerpt: 'Our background data processing workers were getting killed by the OS Out-Of-Memory (OOM) killer every few hours because Pandas DataFrames were not being garbage collected.',
        status: 'resolved',
        severity: 'normal',
        investigationHours: 10,
        content: [
          heading('The Symptom', 'activity'),
          symptom('Celery workers processing nightly analytics reports were dying randomly. Tasks would stay in the "Started" state forever. Syslogs showed `Out of memory: Killed process 1234 (celery)` on the worker nodes.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('The Celery task loaded large CSV files into Pandas DataFrames, processed them, and saved the output. Because of a circular reference in the reporting module, the Python garbage collector could not free the DataFrames after the task completed. The worker process retained the memory indefinitely.'),
          heading('Resolution', 'check-circle'),
          resolution('While we worked on fixing the circular reference, we implemented a quick configuration fix: `worker_max_tasks_per_child`. This tells Celery to gracefully kill and restart the worker process after it processes a certain number of tasks, returning the leaked memory to the OS.'),
          code('# The quick fix: Restart workers automatically\napp.conf.worker_max_tasks_per_child = 10\napp.conf.worker_max_memory_per_child = 500000', 'python'),
          actionItems([
            { completed: true, priority: 'high', task: 'Implement worker_max_tasks_per_child across all Celery clusters', owner: 'Data Eng' },
            { completed: false, priority: 'medium', task: 'Refactor analytics module to remove circular dependencies', owner: 'Data Eng' }
          ])
        ],
        tags: getTags(['python', 'infrastructure']),
        isDraft: false,
        upvotes: 1800,
        views: 32000,
        createdAt: new Date('2024-06-20T10:00:00Z')
      },
      {
        title: 'Golang Goroutine Leak: The Forgotten HTTP Body',
        excerpt: 'Failing to close the HTTP response body in a highly concurrent Go service resulted in a massive goroutine and file descriptor leak, eventually crashing the application with "too many open files".',
        status: 'resolved',
        severity: 'high',
        investigationHours: 7,
        content: [
          heading('The Symptom', 'activity'),
          symptom('Our Go-based web scraper suddenly stopped fetching data. The logs were filled with `dial tcp: socket: too many open files`. The `/debug/pprof/goroutine` endpoint showed 1.5 million active goroutines.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('In Go, when you make an HTTP request using `http.Get`, you must explicitly close the response body. If you do not, the underlying TCP connection remains open, and the goroutine managing it blocks forever waiting for a close signal. A developer missed the `defer resp.Body.Close()` call in a new scraping loop.'),
          code('// The fatal flaw: Missing defer Close()\nresp, err := http.Get(url)\nif err != nil { return err }\n// Missing: defer resp.Body.Close()\nbody, _ := ioutil.ReadAll(resp.Body)', 'go'),
          heading('Resolution', 'check-circle'),
          resolution('Added the defer statement immediately after checking for errors. The open file descriptors instantly dropped from 65,000 to ~200.'),
          code('// The fix\nresp, err := http.Get(url)\nif err != nil { return err }\ndefer resp.Body.Close()', 'go'),
          actionItems([
            { completed: true, priority: 'high', task: 'Add golangci-lint with the bodyclose linter to CI/CD', owner: 'Backend Team' }
          ])
        ],
        tags: getTags(['go', 'backend', 'infrastructure']),
        isDraft: false,
        upvotes: 2900,
        views: 55000,
        createdAt: new Date('2024-06-25T10:00:00Z')
      },
      {
        title: 'Vue.js SPA Memory Leak: Global Event Listeners',
        excerpt: 'A Single Page Application (SPA) became progressively slower and eventually crashed the browser tab due to thousands of un-destroyed window scroll event listeners.',
        status: 'resolved',
        severity: 'normal',
        investigationHours: 4,
        content: [
          heading('The Symptom', 'activity'),
          symptom('Users reported that the application became extremely laggy after about 30 minutes of navigation. Scrolling became jittery. Chrome Task Manager showed the tab consuming 2GB of RAM.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('A highly-reusable "Infinite Scroll" Vue component added a `window.addEventListener("scroll")` in its `mounted` lifecycle hook. However, the developer forgot to remove the listener in the `beforeDestroy` (or `unmounted`) hook. Every time the user navigated to a page with this component, a new listener was attached, retaining the entire component instance in memory.'),
          heading('Resolution', 'check-circle'),
          resolution('Added the `removeEventListener` call to the teardown lifecycle hook.'),
          code('// The fix\nmounted() {\n  window.addEventListener("scroll", this.handleScroll);\n},\nbeforeUnmount() {\n  window.removeEventListener("scroll", this.handleScroll);\n}', 'javascript'),
          actionItems([
            { completed: true, priority: 'high', task: 'Audit all Vue components for unmanaged global listeners', owner: 'Frontend Team' }
          ])
        ],
        tags: getTags(['vue', 'frontend', 'javascript']),
        isDraft: false,
        upvotes: 1500,
        views: 28000,
        createdAt: new Date('2024-07-02T10:00:00Z')
      },
      {
        title: 'Terraform State Lock Disaster',
        excerpt: 'A CI/CD pipeline forcefully broke a Terraform state lock during an active deployment, causing two concurrent runs to corrupt the state file and delete critical production resources.',
        status: 'resolved',
        severity: 'critical',
        investigationHours: 16,
        content: [
          alert('Infrastructure Impact: A production RDS database and 3 EC2 instances were accidentally destroyed by Terraform.', 'alert-triangle'),
          heading('The Symptom', 'activity'),
          symptom('Our API went completely dark. AWS Console showed our primary RDS instance was in the "Deleting" state. Terraform CI logs showed a successful apply that somehow determined it needed to destroy 15 resources.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('A developer cancelled a long-running Terraform plan in Jenkins. This left the DynamoDB state lock in place. Another developer, seeing the lock error, ran `terraform force-unlock`. Unbeknownst to them, the first Jenkins agent hadn\'t actually died—it was still applying changes. With the lock removed, a second pipeline started applying. The two concurrent applies corrupted the S3 state file, causing Terraform to lose track of the RDS database. On the next run, Terraform saw no database in state, assumed it was drift, and destroyed the actual database to match the corrupted state.'),
          heading('Resolution', 'check-circle'),
          resolution('We restored the RDS database from an AWS automated snapshot (which took 45 minutes). We then manually downloaded previous versions of the state file from S3 (versioning was thankfully enabled) and reconciled the resources.'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Revoke `terraform force-unlock` IAM permissions from all developers', owner: 'DevOps' },
            { completed: true, priority: 'high', task: 'Enable Terraform resource lifecycle `prevent_destroy = true` for all databases', owner: 'DevOps' }
          ])
        ],
        tags: getTags(['terraform', 'aws', 'infrastructure']),
        isDraft: false,
        upvotes: 5500,
        views: 130000,
        createdAt: new Date('2024-07-10T10:00:00Z')
      },
      {
        title: 'Cassandra Tombstone Overload',
        excerpt: 'Aggressive deletion of time-series data caused Cassandra to generate millions of "tombstones", drastically slowing down read queries until nodes began crashing.',
        status: 'resolved',
        severity: 'high',
        investigationHours: 20,
        content: [
          heading('The Symptom', 'activity'),
          symptom('Read latencies on our telemetry cluster spiked to 5 seconds. Cassandra logs were filled with `Scanned over 100001 tombstones... query aborted`.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('To comply with GDPR, a cron job was configured to delete rows older than 30 days. In Cassandra, deletes don\'t immediately remove data; they write a "tombstone" marker. When reading data, Cassandra must scan past these tombstones. Because the cron job deleted millions of rows at once, read queries had to scan millions of tombstones just to find a few valid rows, exhausting heap memory.'),
          heading('Resolution', 'check-circle'),
          resolution('We fundamentally changed our data model. Instead of deleting rows, we implemented Time Window Compaction Strategy (TWCS) and set a Time-To-Live (TTL) of 30 days on the table. Cassandra now automatically drops entire SSTables when the TTL expires, generating zero tombstones.'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Migrate time-series tables to TWCS with TTL', owner: 'DBA' }
          ])
        ],
        tags: getTags(['database', 'infrastructure']),
        isDraft: false,
        upvotes: 2100,
        views: 42000,
        createdAt: new Date('2024-07-15T10:00:00Z')
      },
      {
        title: 'Linux Inode Exhaustion: The Silent Disk Full Error',
        excerpt: 'A microservice started failing with "No space left on device" errors, even though `df -h` showed the disk was only 20% full.',
        status: 'resolved',
        severity: 'normal',
        investigationHours: 3,
        content: [
          heading('The Symptom', 'activity'),
          symptom('File uploads to a specific API endpoint failed. The application logs threw `ENOSPC: no space left on device`. System monitoring showed 80% free disk space.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('A misconfigured session middleware was storing PHP-style session files on disk in `/var/lib/sessions`. It created a new file for every single API request, but the cron job to clean them up was failing. While the files were tiny (0 bytes), there were millions of them. The ext4 filesystem ran out of inodes (index nodes). Every file requires one inode, regardless of its size.'),
          code('df -h  # Shows 20% usage\ndf -i  # Shows 100% inode usage (IUse%)', 'bash'),
          heading('Resolution', 'check-circle'),
          resolution('Deleted the millions of empty session files (which took hours using `find . -name "*" -delete` because `rm *` threw an argument list too long error). Migrated session storage to Redis.'),
          actionItems([
            { completed: true, priority: 'high', task: 'Migrate all disk-based sessions to Redis', owner: 'Backend Team' },
            { completed: true, priority: 'medium', task: 'Add Inode utilization (df -i) to Datadog alerting', owner: 'DevOps' }
          ])
        ],
        tags: getTags(['linux', 'infrastructure', 'backend']),
        isDraft: false,
        upvotes: 3800,
        views: 70000,
        createdAt: new Date('2024-07-20T10:00:00Z')
      },
      {
        title: 'GraphQL DoS: The Recursive Query Attack',
        excerpt: 'A malicious actor brought down our Node.js GraphQL API by sending a deeply nested recursive query that caused exponential algorithmic complexity.',
        status: 'resolved',
        severity: 'critical',
        investigationHours: 4,
        content: [
          alert('Security Impact: Total denial of service for 2 hours due to CPU exhaustion.', 'alert-triangle'),
          heading('The Symptom', 'activity'),
          symptom('All GraphQL endpoints timed out. The Node.js processes were at 100% CPU. Restarting the pods provided 30 seconds of relief before they pegged at 100% again.'),
          heading('Root Cause Analysis', 'terminal'),
          rootCause('Our GraphQL schema had a recursive relationship: an `Author` has `Posts`, and a `Post` has an `Author`. An attacker exploited this by sending a query nested 100 levels deep. The GraphQL execution engine attempted to resolve this, executing thousands of resolver functions and completely freezing the Node.js event loop.'),
          code('query {\n  author(id: 1) {\n    posts {\n      author {\n        posts {\n          author {\n            # ... repeated 100 times\n          }\n        }\n      }\n    }\n  }\n}', 'graphql'),
          heading('Resolution', 'check-circle'),
          resolution('Implemented GraphQL query depth limiting using the `graphql-depth-limit` middleware, rejecting any query deeper than 7 levels. We also implemented query complexity analysis to block queries requesting excessive amounts of data.'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Enforce max depth of 7 on all GraphQL endpoints', owner: 'Security' },
            { completed: true, priority: 'high', task: 'Implement query complexity scoring limits', owner: 'Backend Team' }
          ])
        ],
        tags: getTags(['graphql', 'security', 'nodejs']),
        isDraft: false,
        upvotes: 4900,
        views: 105000,
        createdAt: new Date('2024-07-25T10:00:00Z')
      }
    ];

    console.log(`Preparing to seed ${incidents.length} real-world incidents...`);

    for (const data of incidents) {
      // 1) Text for embeddings
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

      // 2) Save post
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

    console.log('✅ Real-world incidents seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedRealIncidents();
