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
        title: 'AWS Cost Optimization: The $40,000 S3 Bandwidth Bill',
        excerpt: 'Serving static assets directly from a public Amazon S3 bucket instead of using a Content Delivery Network (CDN) resulted in astronomical bandwidth costs and high global latency.',
        status: 'resolved',
        severity: 'high',
        investigationHours: 12,
        coverImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200',
        content: [
          alert('Financial Impact: $42,500 in unexpected AWS Data Transfer charges over 7 days. MTTR to mitigate billing hemorrhage: 4 hours.', 'alert-triangle'),
          
          heading('The Incident Trigger: Going Viral', 'activity'),
          symptom('At 08:00 UTC on Tuesday, our new global marketing campaign launched. The frontend React application was highly interactive, featuring heavy 4K background videos and uncompressed high-resolution hero images. By Wednesday evening, our AWS Billing Dashboard triggered a critical anomaly alert: our Daily Spend had spiked by 5,000%.'),
          img('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=1200', 'AWS Billing Dashboard Anomaly Detection Spike'),
          
          heading('Timeline of the Cost Hemorrhage', 'clock'),
          timeline([
            { time: 'Tuesday 08:00 UTC', status: 'monitoring', actor: 'Marketing', content: 'Campaign goes live globally, heavily promoted in the APAC region.' },
            { time: 'Wednesday 14:00 UTC', status: 'investigating', actor: 'Users', content: 'Users in Asia report slow page load times (10+ seconds for the hero video).' },
            { time: 'Wednesday 18:30 UTC', status: 'critical', actor: 'AWS Cost Explorer', content: 'Automated billing anomaly alert fires: $15,000 threshold breached.' },
            { time: 'Wednesday 19:15 UTC', status: 'investigating', actor: 'SRE Team', content: 'Identified that 98% of the cost is "Data Transfer Out to Internet" from the US-East-1 S3 bucket.' },
            { time: 'Wednesday 21:00 UTC', status: 'resolved', actor: 'DevOps', content: 'CloudFront distribution deployed, OAC enabled, and frontend URLs hotfixed.' }
          ]),

          heading('Architecture Deep Dive: S3 vs CDN', 'server'),
          p('Amazon S3 is incredibly durable (11 nines) for object storage, but it is fundamentally **not** a Content Delivery Network. When users request assets directly from S3, two critical architectural problems emerge:'),
          list([
            'High Latency (The Physics Problem): S3 buckets are regional. A user in Tokyo requesting a 50MB video from us-east-1 (Virginia) must wait for packets to cross the Pacific Ocean, resulting in terrible Time-To-First-Byte (TTFB).',
            'Massive Costs (The Billing Problem): AWS charges premium rates for "Data Transfer Out" to the internet directly from S3 (typically ~$0.09 per GB). If 10,000 users download a 50MB video, that\'s 500GB of egress. Viral traffic can easily push this into petabytes.'
          ]),
          quote('We assumed S3 was cheap storage. We completely misunderstood the difference between Storage Pricing and Network Egress Pricing.'),

          heading('The Root Cause Analysis', 'terminal'),
          rootCause('To meet a tight deadline, the frontend team bypassed the infrastructure review process. They made the S3 bucket public by disabling "Block Public Access" and hardcoded the raw S3 bucket URLs directly into the React codebase.'),
          code('// The fatal flaw: Hardcoding the direct S3 URL in the React Component\nexport default function HeroSection() {\n  return (\n    <video \n      src="https://production-marketing-assets.s3.us-east-1.amazonaws.com/hero-4k-bg.mp4" \n      autoPlay loop muted \n    />\n  );\n}', 'javascript'),
          p('Because the campaign went viral in Asia, petabytes of data were pulled directly from the US-East-1 region across the public internet, completely bypassing edge caching and racking up astronomical egress fees.'),

          heading('5 Whys Analysis', 'help-circle'),
          fiveWhys([
            { question: 'Why did the AWS bill spike to $42,500?', answer: 'We incurred massive "Data Transfer Out" fees from our marketing S3 bucket.' },
            { question: 'Why was there so much Data Transfer Out?', answer: 'Global users were downloading heavy 4K videos directly from the S3 bucket.' },
            { question: 'Why were users downloading directly from S3?', answer: 'The frontend code used raw S3 URLs instead of routing traffic through a CDN (CloudFront).' },
            { question: 'Why wasn\'t CloudFront used?', answer: 'The frontend team lacked AWS infrastructure knowledge and made the bucket public to "get it working quickly".' },
            { question: 'Why was the team able to make the bucket public?', answer: 'We did not have Organization-wide SCPs (Service Control Policies) enforcing "Block Public Access" at the account level.' }
          ]),

          heading('The Resolution: CloudFront + OAC', 'check-circle'),
          resolution('The SRE team immediately placed Amazon CloudFront in front of the S3 bucket. CloudFront caches heavy assets at hundreds of edge locations (PoPs) worldwide.'),
          p('Data transfer from S3 to CloudFront is $0.00. By serving the assets from the edge, latency dropped by 80%, and bandwidth costs plummeted.'),
          p('To secure the bucket and prevent anyone from bypassing the CDN, we implemented Origin Access Control (OAC), which strictly limits S3 access to only our specific CloudFront distribution:'),
          code('{\n  "Version": "2012-10-17",\n  "Statement": {\n    "Effect": "Allow",\n    "Principal": {\n      "Service": "cloudfront.amazonaws.com"\n    },\n    "Action": "s3:GetObject",\n    "Resource": "arn:aws:s3:::production-marketing-assets/*",\n    "Condition": {\n      "StringEquals": {\n        "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/EDFDVBD632BHDS5"\n      }\n    }\n  }\n}', 'json'),
          p('Finally, the frontend code was updated to use the custom CDN domain with aggressive Cache-Control headers.'),
          code('// The fix: Using the custom CDN domain\nexport default function HeroSection() {\n  return (\n    <video \n      src="https://cdn.devsolved.com/hero-4k-bg.mp4" \n      autoPlay loop muted \n    />\n  );\n}', 'javascript'),

          heading('Post-Incident Action Items', 'clipboard-list'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Deploy CloudFront distributions for all existing static asset buckets', owner: 'DevOps Team' },
            { completed: true, priority: 'high', task: 'Enforce "Block Public Access" globally via AWS Organizations SCPs', owner: 'Security Team' },
            { completed: true, priority: 'medium', task: 'Implement aggressive Cache-Control headers (max-age=31536000) for immutable assets', owner: 'Frontend Team' },
            { completed: false, priority: 'medium', task: 'Set up AWS Budgets with lower thresholds (e.g. $100/day anomaly detection)', owner: 'FinOps Team' }
          ])
        ],
        tags: getTags(['aws', 'infrastructure', 'frontend', 'react']),
        isDraft: false,
        upvotes: 3840,
        views: 72000,
        createdAt: new Date('2023-04-12T14:00:00Z')
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
