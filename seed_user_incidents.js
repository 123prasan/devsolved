import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from './src/models/Post.js';
import Tag from './src/models/Tag.js';
import User from './src/models/User.js';
import { embed } from './src/config/embeddings.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devsolved';

const seedUserIncidents = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const authorId = '6a65f5b55107f834928490a6'; // Provided User ID

    // Ensure the user exists
    let user = await User.findById(authorId);
    if (!user) {
      console.error('User not found. Please ensure the user exists before running.');
      process.exit(1);
    }

    const allTags = await Tag.find({});
    const getTags = (names) => {
      return allTags.filter(t => names.includes(t.name.toLowerCase())).map(t => t._id);
    };

    // Custom DevSolved Block Generator Helpers (matching write.ejs getPostPayload)
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
    const timeline = (steps) => ({ type: 'timeline', steps }); // steps: [{ time, status, actor, content }]
    const fiveWhys = (whys) => ({ type: 'five-whys', whys }); // whys: [{ question, answer, content }]
    const actionItems = (items) => ({ type: 'action-items', items }); // items: [{ completed, priority, task, content, owner }]

    const incidents = [
      {
        title: 'GitLab 2017: Primary Database Deleted via Accidental `rm -rf`',
        excerpt: 'An engineer accidentally deleted the primary PostgreSQL database directory on the production server instead of the staging server, resulting in a 300GB data loss and an 18-hour outage.',
        status: 'resolved',
        severity: 'critical',
        coverImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800',
        content: [
          symptom('During a late-night database replication fix, an exhausted engineer attempted to clear a stuck PostgreSQL replication process on a staging node. Unfortunately, the engineer had multiple terminal windows open and ran a destructive command on the primary production node instead.'),
          img('https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&q=80&w=800', 'PostgreSQL replication cluster'),
          heading('The Commands Executed', 'terminal'),
          p('The engineer intended to wipe the `db2.cluster.gitlab.com` (secondary) data directory to restart replication. Instead, they ran the following on `db1.cluster.gitlab.com` (primary):'),
          code('sudo rm -rf /var/opt/gitlab/postgresql/data/', 'bash'),
          quote('Within seconds, I realized my mistake and hit Ctrl+C, but 300GB of production data had already been deleted. Only 4.5GB remained.'),
          rootCause('The incident escalated into a catastrophic outage because 5 out of 5 backup mechanisms failed simultaneously.'),
          list([
            'LVM Snapshots: Failed because the backup script was broken.',
            'Regular Backups: Failed due to a version mismatch between PostgreSQL pg_dump (9.2) and the server (9.6).',
            'Azure Disk Backups: Were enabled for the NFS server, but not the DB server.',
            'S3 Backups: Failed because the bucket was empty (the cron job was silently failing).',
            'Replication: The deletion instantly replicated to the remaining nodes.'
          ]),
          resolution('The team discovered an LVM snapshot taken 6 hours prior by a completely unrelated backup mechanism that was meant for staging environment refreshes. They spent 18 hours carefully copying the data over to a new production instance.'),
          fiveWhys([
            { question: 'Why was production data deleted?', answer: 'An engineer ran rm -rf on the primary node.', content: 'An engineer ran rm -rf on the primary node.' },
            { question: 'Why did they run it on primary?', answer: 'They thought they were connected to the staging node.', content: 'They thought they were connected to the staging node.' },
            { question: 'Why did the backups fail?', answer: 'Cron jobs were silently failing without monitoring alerts.', content: 'Cron jobs were silently failing without monitoring alerts.' }
          ]),
          actionItems([
            { completed: true, priority: 'P1', task: 'Implement visual terminal warnings for Production SSH', content: 'Implement visual terminal warnings for Production SSH', owner: 'DevOps' },
            { completed: false, priority: 'P2', task: 'Fix PostgreSQL pg_dump version mismatch', content: 'Fix PostgreSQL pg_dump version mismatch', owner: 'DBA' }
          ])
        ],
        author: authorId,
        tags: getTags(['postgresql', 'linux']),
        tagNames: ['postgresql', 'linux'],
        upvotes: 4210,
        views: 125000,
        saves: 2100
      },
      {
        title: 'Fastly Global Outage 2021: A Single Customer Regex Took Down the Internet',
        excerpt: 'An undiscovered bug in the VCL (Varnish Configuration Language) compiler triggered a catastrophic global outage when a single customer updated their configuration with a specific regex pattern.',
        status: 'resolved',
        severity: 'critical',
        coverImage: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=800',
        content: [
          symptom('At 09:47 UTC, 85% of Fastly\'s global network returned 503 Service Unavailable errors. Major websites including Amazon, Reddit, GitHub, and the UK Government went offline instantly.'),
          img('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800', 'Global Traffic Drop'),
          heading('The Investigation', 'search'),
          p('Fastly engineers noticed the outage correlated perfectly with a customer pushing a configuration change. The configuration change itself was entirely valid, but it triggered a dormant bug in the edge software.'),
          code('if (req.http.Fastly-FF) {\n  set req.http.Fastly-FF = regsub(req.http.Fastly-FF, "^[^,]+,?", "");\n}', 'c'),
          rootCause('The edge servers compile customer VCL down to native C code for performance. A bug in the C compiler logic caused the resulting executable to segfault when parsing a specific regex.'),
          alert('Because Fastly\'s edge POPs share the same binary, they all crashed simultaneously when processing requests for that customer.', 'alert-triangle'),
          resolution('Within 49 minutes, engineers identified the specific customer configuration and disabled it. The edge nodes immediately recovered. Fastly then spent 36 hours rolling out a permanent patch to the VCL compiler across their entire fleet.'),
          timeline([
            { time: '09:47 UTC', status: 'critical', actor: 'System', content: 'Global 503 errors spike across 85% of network.' },
            { time: '10:27 UTC', status: 'investigating', actor: 'Engineers', content: 'Identified the customer configuration causing the compiler segfault.' },
            { time: '10:36 UTC', status: 'resolved', actor: 'Engineers', content: 'Disabled the specific customer configuration, edge POPs recovered.' }
          ])
        ],
        author: authorId,
        tags: getTags(['linux']),
        tagNames: ['linux'],
        upvotes: 3890,
        views: 95000,
        saves: 1800
      },
      {
        title: 'AWS S3 US-East-1 Outage: The Typo That Broke the Cloud',
        excerpt: 'An authorized S3 team member executed a command intending to remove a small number of billing servers. A typo in the command parameters removed a massive set of storage subsystem servers instead.',
        status: 'resolved',
        severity: 'critical',
        coverImage: 'https://images.unsplash.com/photo-1563206767-5b18f218e8de?auto=format&fit=crop&q=80&w=800',
        content: [
          symptom('In 2017, the AWS US-East-1 region experienced massive error rates for Amazon S3. Because S3 is foundational to AWS, this caused cascading failures across EC2, EBS, Lambda, and thousands of internet businesses.'),
          img('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800', 'Server Racks offline'),
          heading('The Investigation', 'search'),
          p('The S3 team was debugging an issue with the billing system causing it to operate slowly. To fix it, an engineer needed to take a few servers offline.'),
          rootCause('The engineer executed a playbook script. However, one of the inputs to the script was entered incorrectly. Rather than removing the intended 2 servers, it executed against a significantly larger set of servers.'),
          code('aws s3api remove-servers --subsystem index --count 200  // Intended: --count 2', 'bash'),
          alert('The servers removed supported two critical S3 subsystems: the Index subsystem and the Placement subsystem. They had a "cold start" problem that took hours to boot.', 'alert-triangle'),
          resolution('AWS restored the Index subsystem after 4 hours. Following the incident, AWS removed the ability for tooling to execute capacity removals exceeding a predefined safety threshold, regardless of inputs.'),
          actionItems([
            { completed: true, priority: 'P1', task: 'Implement hard limits on capacity removal tooling', content: 'Implement hard limits on capacity removal tooling', owner: 'S3 Platform' }
          ])
        ],
        author: authorId,
        tags: getTags(['aws']),
        tagNames: ['aws'],
        upvotes: 5120,
        views: 110000,
        saves: 3000
      },
      {
        title: 'Knight Capital 2012: $440 Million Lost in 45 Minutes',
        excerpt: 'A deployment of new trading software left a dead code path on one of eight servers. When activated, the server went rogue, buying high and selling low at algorithmic speed.',
        status: 'resolved',
        severity: 'critical',
        coverImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800',
        content: [
          symptom('At 9:30 AM, the NYSE opened. Immediately, Knight Capital\'s trading algorithms began generating millions of erratic orders on 150 different stocks. By 10:15 AM, they had accumulated a multi-billion dollar position and realized a $440 million cash loss.'),
          img('https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800', 'Stock Market Chart'),
          rootCause('The engineers deployed the new code manually to 8 servers, but forgot to deploy it to the 8th server. When the new system sent orders with the `Power Peg` flag to the 8th server, the server executed a dormant, 8-year-old piece of code designed for testing. This code bought stocks relentlessly, ignoring price and volume limits.'),
          quote('Instead of immediately shutting down the system, engineers attempted to debug it live in production. They actually removed the 7 good servers from the routing table, sending 100% of traffic to the 1 broken server, multiplying the losses.'),
          resolution('The system was finally hard-killed at 10:15 AM. The catastrophic loss forced Knight Capital to secure a massive emergency bailout the next day, effectively wiping out the company\'s independence.'),
          code('if (flag === "PowerPeg") {\n  // Intended: Run new smart routing\n  // Actual (Server 8): Run 2003 test code that spams market orders\n  executeTestLoop(); \n}', 'javascript')
        ],
        author: authorId,
        tags: getTags(['python']),
        tagNames: ['python'],
        upvotes: 6200,
        views: 180000,
        saves: 4500
      },
      {
        title: 'BGP Route Leak: How a Small ISP Took Down Google',
        excerpt: 'A tiny internet service provider in Nigeria accidentally advertised routes for Google\'s IP space. Major telecom networks blindly accepted these routes, blackholing traffic to Google services globally.',
        status: 'resolved',
        severity: 'critical',
        coverImage: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=800',
        content: [
          symptom('Users globally reported that Google Search, YouTube, and Google Cloud were unreachable. Network engineers tracing the traffic noticed that packets destined for Google were being routed to China Telecom, then to a small ISP in Nigeria (MainOne), where they were dropped.'),
          heading('What is BGP?', 'hash'),
          p('The Border Gateway Protocol (BGP) is the postal service of the internet. Networks "advertise" which IP addresses they own. If Network A says "I know the shortest path to Google," other networks will send their Google traffic to Network A.'),
          list([
            'MainOne (the Nigerian ISP) accidentally updated their BGP tables to claim they were the best path to 212 of Google\'s IP prefixes.',
            'China Telecom, MainOne\'s upstream provider, lacked BGP route filtering. They blindly accepted MainOne\'s claim and forwarded it to the rest of the internet.'
          ]),
          img('https://images.unsplash.com/photo-1551808525-51a94da548ce?auto=format&fit=crop&q=80&w=800', 'Networking Cables'),
          rootCause('BGP relies on a trust-based system. Because China Telecom is a massive Tier-1 provider, when they told the world "Send your Google traffic through us (to Nigeria)", ISPs like Comcast and AT&T updated their routing tables immediately.'),
          code('// BGP Advertisement (Simplified)\nPrefix: 8.8.8.0/24\nAS_PATH: 4809 (China Telecom) -> 37282 (MainOne)\n// Result: Traffic enters MainOne and dies (blackholed).', 'bash'),
          resolution('Within 74 minutes, Google and Cloudflare worked with upstream transit providers to sever the rogue BGP announcements. The incident highlighted the desperate need for RPKI (Resource Public Key Infrastructure) to cryptographically verify BGP route announcements across the internet.')
        ],
        author: authorId,
        tags: getTags(['linux']),
        tagNames: ['linux'],
        upvotes: 2800,
        views: 75000,
        saves: 1200
      }
    ];

    let count = 0;
    for (const postData of incidents) {
      // Create semantic embedding
      const combinedText = `${postData.title} ${postData.excerpt} ${postData.tagNames.join(' ')}`;
      const embedding = await embed(combinedText);

      const post = new Post({
        ...postData,
        embedding,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await post.save();
      console.log(`Seeded incident: ${post.title}`);
      count++;
    }

    console.log(`Successfully seeded ${count} highly-detailed DevSolved-formatted real-world incidents for user ${authorId}`);
    process.exit(0);

  } catch (err) {
    console.error('Error seeding incidents:', err);
    process.exit(1);
  }
};

seedUserIncidents();
