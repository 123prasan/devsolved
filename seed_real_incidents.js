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
        investigationHours: 8,
        coverImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200',
        content: [
          alert('Financial Impact: $42,500 in unexpected AWS Data Transfer charges over 7 days.', 'alert-triangle'),
          symptom('The engineering team deployed a new marketing campaign featuring heavy 4K video assets and high-res images. The assets were uploaded to an AWS S3 bucket and linked directly in the frontend HTML. Within a week, the AWS billing dashboard triggered a critical billing alert.'),

          heading('The Architecture Flaw', 'server'),
          p('Amazon S3 is incredibly durable for object storage, but it is **not** a Content Delivery Network. When users request assets directly from S3, two major problems occur:'),
          list([
            'High Latency: The data must travel from the specific AWS Region (e.g., us-east-1) to the user, regardless of their global location.',
            'Massive Costs: AWS charges premium rates (up to $0.09 per GB) for Data Transfer Out to the Internet directly from S3.'
          ]),

          heading('The Root Cause', 'terminal'),
          rootCause('The frontend team bypassed the infrastructure team and made the S3 bucket public, linking the raw S3 URLs in the source code. Because the marketing campaign went viral in Asia, petabytes of data were pulled directly from the US-East-1 region.'),
          img('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=1200', 'AWS Billing Dashboard spike'),
          quote('We assumed S3 was cheap storage. We didn\'t realize we were paying for the network transit every single time a user loaded the page.'),

          heading('The Resolution: CloudFront + OAC', 'check-circle'),
          resolution('The infrastructure team immediately placed Amazon CloudFront (AWS\'s CDN) in front of the S3 bucket. CloudFront caches the heavy assets at edge locations worldwide, drastically reducing latency and reducing Data Transfer Out costs to almost zero (since data transfer from S3 to CloudFront is free).'),
          p('To secure the bucket and prevent direct access, the team implemented Origin Access Control (OAC):'),
          code('{\n  "Version": "2012-10-17",\n  "Statement": {\n    "Effect": "Allow",\n    "Principal": {\n      "Service": "cloudfront.amazonaws.com"\n    },\n    "Action": "s3:GetObject",\n    "Resource": "arn:aws:s3:::production-assets/*",\n    "Condition": {\n      "StringEquals": {\n        "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/EDFDVBD632BHDS5"\n      }\n    }\n  }\n}', 'json'),

          heading('Post-Incident Action Items', 'clipboard-list'),
          actionItems([
            { completed: true, priority: 'critical', task: 'Deploy CloudFront distributions for all static asset buckets', owner: 'DevOps Team' },
            { completed: true, priority: 'high', task: 'Block public access at the account level for S3 (Block Public Access)', owner: 'Security Team' },
            { completed: true, priority: 'medium', task: 'Implement aggressive Cache-Control headers (max-age=31536000) for immutable assets', owner: 'Frontend Team' }
          ])
        ],
        tags: getTags(['aws', 'infrastructure', 'frontend']),
        isDraft: false,
        upvotes: 2150,
        views: 45000,
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
