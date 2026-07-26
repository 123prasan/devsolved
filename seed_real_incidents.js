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
