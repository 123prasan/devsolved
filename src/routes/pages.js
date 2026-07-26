import express from 'express';
import Post from '../models/Post.js';
import Tag from '../models/Tag.js';
import User from '../models/User.js';
import Comment from '../models/Comment.js';
import { getAnonymousFeed, getPersonalizedFeed } from '../services/feedService.js';
import { hybridSearch } from '../services/searchService.js';
import { optionalAuth, protect } from '../middleware/auth.js';
import { getRedis, isRedisAvailable } from '../config/redis.js';

const router = express.Router();

// ── GET / — Home feed ────────────────────────────────────────────────────────
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { tag, status, severity, q, tab = 'latest' } = req.query;

    if (q) {
      return res.redirect('/search?q=' + encodeURIComponent(q));
    }

    const opts = {
      tagFilter: tag || null,
      statusFilter: status || null,
      severityFilter: severity || null,
      sortFilter: tab === 'trending' ? 'trending' : 'latest',
    };

    if (tab === 'following' && req.user) {
      opts.authorFilter = req.user.following;
      opts.sortFilter = 'latest';
    }

    const postsPromise = req.user
      ? getPersonalizedFeed(req.user, opts)
      : getAnonymousFeed(opts);

    const [posts, trendingTags, topSolvers, totalIncidents] = await Promise.all([
      postsPromise,
      Tag.find().sort({ weeklyCount: -1 }).limit(6).lean(),
      User.find().sort({ reputation: -1 }).limit(5)
        .select('username displayName avatarUrl reputation isPro').lean(),
      Post.countDocuments({ isDraft: false }),
    ]);

    const canonicalUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
    const structuredData = [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "DevSolved",
        "url": `${req.protocol}://${req.get('host')}`,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${req.protocol}://${req.get('host')}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": (posts || []).map((post, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "url": `${req.protocol}://${req.get('host')}/incidents/${post.slug}`
        }))
      }
    ];

    res.render('pages/home', {
      title: 'DevSolved | Developer War Stories & Outage Solutions',
      description: 'Stop losing days to the same edge cases. Discover thousands of solved incidents documented by engineers who fixed them.',
      user: req.user || null,
      posts,
      trendingTags,
      topSolvers,
      totalIncidents,
      currentPath: '/',
      activeTag: tag || null,
      activeStatus: status || null,
      activeSeverity: severity || null,
      activeTab: tab,
      canonicalUrl,
      structuredData
    });
  } catch (err) {
    console.error(err);
    res.render('pages/home', {
      title: 'DevSolved | Developer War Stories',
      description: '',
      user: req.user || null,
      posts: [],
      trendingTags: [],
      topSolvers: [],
      totalIncidents: 0,
      currentPath: '/',
      activeTag: null,
      activeStatus: null,
      activeSeverity: null,
      activeTab: 'latest',
    });
  }
});

// ── GET /search — Dedicated AI Semantic & NLP Search Results ────────────────
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q = '', status, severity, tag, sort = 'relevance' } = req.query;

    let posts = [];
    let searchAnalysis = null;
    let isDefaultTrending = false;

    if (q.trim()) {
      const searchRes = await hybridSearch(q.trim(), 60);
      posts = searchRes.results || searchRes;
      searchAnalysis = searchRes.analysis || null;
    } else {
      isDefaultTrending = true;
      posts = await Post.find({ isDraft: false })
        .sort({ upvotes: -1, views: -1, createdAt: -1 })
        .limit(40)
        .populate('author', 'username displayName avatarUrl reputation isPro')
        .populate('tags', 'name displayName color')
        .lean();
    }

    // Apply client filter overrides if specified
    if (status) {
      const statuses = status.split(',');
      posts = posts.filter((p) => statuses.includes(p.status));
    }
    if (severity) {
      const severities = severity.split(',');
      posts = posts.filter((p) => severities.includes(p.severity));
    }
    if (tag) {
      const tagFilter = tag.toLowerCase();
      posts = posts.filter((p) =>
        (p.tags || []).some((t) => (t.name || t || '').toString().toLowerCase() === tagFilter)
      );
    }

    if (sort === 'upvotes') {
      posts.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    } else if (sort === 'recent') {
      posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const [trendingTags, totalIncidents] = await Promise.all([
      Tag.find().sort({ weeklyCount: -1 }).limit(10).lean(),
      Post.countDocuments({ isDraft: false }),
    ]);

    const canonicalUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
    const structuredData = [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": q ? `Search Results for "${q}"` : "Incidents",
        "url": canonicalUrl
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": (posts || []).map((post, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "url": `${req.protocol}://${req.get('host')}/incidents/${post.slug}`
        }))
      }
    ];

    res.render('pages/search', {
      title: q ? `"${q}" — Search | DevSolved` : 'Search & Discover | DevSolved',
      description: 'Search and filter across thousands of documented engineering incidents and postmortems.',
      user: req.user || null,
      query: q,
      posts,
      searchAnalysis,
      isDefaultTrending,
      trendingTags,
      totalIncidents,
      currentPath: '/search',
      activeStatus: status || null,
      activeSeverity: severity || null,
      activeTag: tag || null,
      activeTag: tag || null,
      activeSort: sort,
      canonicalUrl,
      structuredData
    });
  } catch (err) {
    console.error('Search page error:', err);
    res.render('pages/search', {
      title: 'Search & Discover | DevSolved',
      description: '',
      user: req.user || null,
      query: req.query.q || '',
      posts: [],
      searchAnalysis: null,
      isDefaultTrending: true,
      trendingTags: [],
      totalIncidents: 0,
      currentPath: '/search',
      activeStatus: null,
      activeSeverity: null,
      activeTag: null,
      activeSort: 'relevance',
    });
  }
});

// ── GET /t/:slug — Programmatic SEO Technology Pages ──
router.get('/t/:slug', optionalAuth, async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase().trim();
    const tag = await Tag.findOne({ name: slug }).lean();

    if (!tag) {
      return res.redirect('/search?q=' + encodeURIComponent(slug));
    }

    // Fetch posts associated with this tag
    const posts = await Post.find({ tags: tag._id, isDraft: false })
      .populate('author', 'username displayName avatarUrl reputation isPro')
      .populate('tags')
      .sort({ upvotes: -1, createdAt: -1 })
      .lean();

    const canonicalUrl = `${req.protocol}://${req.get('host')}/t/${slug}`;
    const structuredData = [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `${tag.displayName || tag.name} Incidents & Architecture Postmortems`,
        "description": tag.description || `Explore real-world production outages, root cause analyses, and solutions related to ${tag.displayName || tag.name}.`,
        "url": canonicalUrl
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": (posts || []).map((post, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "url": `${req.protocol}://${req.get('host')}/incidents/${post.slug}`
        }))
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": `${req.protocol}://${req.get('host')}`
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Topics",
            "item": `${req.protocol}://${req.get('host')}/tags`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": tag.displayName || tag.name,
            "item": canonicalUrl
          }
        ]
      }
    ];

    res.render('pages/topic', {
      title: `${tag.displayName || tag.name} Incidents & Postmortems | DevSolved`,
      description: tag.description || `Explore real-world production outages, root cause analyses, and solutions related to ${tag.displayName || tag.name}. Learn from the engineering community to prevent these bugs in your own systems.`,
      user: req.user || null,
      tag,
      posts,
      totalIncidents: posts.length,
      currentPath: `/t/${slug}`,
      canonicalUrl,
      structuredData
    });
  } catch (err) {
    console.error('Topic page error:', err);
    res.redirect('/search');
  }
});

// ── GET /leaderboard — Global Developer Leaderboard (Real Telemetry & Resolution Rate) ──
router.get('/leaderboard', optionalAuth, async (req, res) => {
  try {
    const activeTab = (req.query.tab || 'trending').toLowerCase();

    // 1. Fetch top problem solvers
    const users = await User.find({}).sort({ reputation: -1 }).limit(30).lean();

    // 2. Real Telemetry Calculations for each engineer
    let unrankedList = await Promise.all(users.map(async (u) => {
      const totalIncidents = await Post.countDocuments({ author: u._id, isDraft: false });
      const resolvedIncidents = await Post.countDocuments({
        author: u._id,
        isDraft: false,
        $or: [{ status: 'resolved' }, { githubPrUrl: { $ne: '' } }, { githubPrUrl: { $exists: true, $ne: '' } }]
      });
      const topStory = await Post.findOne({ author: u._id, isDraft: false }).sort({ upvotes: -1, views: -1 }).lean();

      let resolutionRate = '0.0%';
      let rateNum = 0.0;
      if (totalIncidents > 0) {
        rateNum = (resolvedIncidents / totalIncidents) * 100;
        resolutionRate = rateNum.toFixed(1) + '%';
      }

      const followersCount = u.followers ? u.followers.length : 0;
      const followingCount = u.following ? u.following.length : 0;
      const connectedSREs = followersCount + followingCount;

      const isCurrentUser = Boolean(req.user && (String(req.user._id) === String(u._id) || req.user.username === u.username));
      const rep = u.reputation || 0;
      const trendingScore = rep * (1 + (connectedSREs / 40));

      return {
        ...u,
        reputation: rep,
        totalIncidents,
        resolvedIncidents,
        resolutionRate,
        rateNum: parseFloat(resolutionRate),
        connectedSREs,
        topStory,
        isCurrentUser,
        trendingScore
      };
    }));

    // 3. Sort according to active Tab!
    if (activeTab === 'titans') {
      unrankedList.sort((a, b) => b.reputation - a.reputation);
    } else if (activeTab === 'resolution') {
      unrankedList.sort((a, b) => b.rateNum - a.rateNum || b.reputation - a.reputation);
    } else {
      unrankedList.sort((a, b) => b.trendingScore - a.trendingScore);
    }

    // 4. Assign dynamic ranks, badges, and honors
    const rankings = unrankedList.map((solver, idx) => {
      let badgeTitle = 'Systems Architect';
      let badgeColor = '#3B82F6';
      if (activeTab === 'titans') {
        badgeTitle = idx === 0 ? 'All-Time Titan' : (idx === 1 ? 'Principal Architect' : (idx === 2 ? 'Master Investigator' : 'Veteran SRE'));
        badgeColor = idx === 0 ? '#FCD34D' : (idx === 1 ? '#60A5FA' : (idx === 2 ? '#10B981' : '#A1A1AA'));
      } else if (activeTab === 'resolution') {
        badgeTitle = idx === 0 ? 'Resolution Leader' : (idx === 1 ? 'Precision Debugger' : 'Incident Closer');
        badgeColor = idx === 0 ? '#10B981' : (idx === 1 ? '#3B82F6' : '#F59E0B');
      } else {
        badgeTitle = idx === 0 ? 'Trending Leader' : (idx === 1 ? 'High Impact' : (idx === 2 ? 'Outage Resolver' : 'Systems Architect'));
        badgeColor = idx === 0 ? '#10B981' : (idx === 1 ? '#F59E0B' : (idx === 2 ? '#3B82F6' : '#A1A1AA'));
      }

      return {
        ...solver,
        rank: idx + 1,
        badgeTitle,
        badgeColor
      };
    });

    res.render('pages/leaderboard', {
      title: 'Developer War Stories Leaderboard | DevSolved',
      description: 'Recognizing the community top problem solvers and production bug debuggers.',
      user: req.user || null,
      rankings,
      activeTab,
      currentPath: '/leaderboard'
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).render('pages/error', { message: 'Failed to generate telemetry leaderboard' });
  }
});

// ── GET /digest — Weekly Telemetry Digest (Working target for Notification #4) ────
router.get('/digest', optionalAuth, (req, res) => {
  res.render('pages/digest', {
    title: 'Weekly Tech-Stack Digest | DevSolved',
    description: 'Curated deep-dive production war stories matching Node.js, Docker, and MongoDB.',
    user: req.user || null,
    currentPath: '/digest'
  });
});

// ── GET /write — Create new incident (or edit draft) ────────────────────────
router.get('/write', protect, async (req, res, next) => {
  try {
    let post = null;
    if (req.query.id) {
      post = await Post.findById(req.query.id);
      if (!post || post.author.toString() !== req.user._id.toString()) {
        return res.redirect('/write');
      }
    }

    res.render('pages/write', {
      title: post ? 'Edit Draft | DevSolved' : 'New Incident | DevSolved',
      user: req.user,
      currentPath: '/write',
      post: post
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /write/preview — Live high-fidelity EJS rendering via incident.ejs ───
router.post('/write/preview', optionalAuth, async (req, res, next) => {
  try {
    const { title, excerpt, tags, content, coverImage, status, severity, investigationHours } = req.body;
    const formattedTags = Array.isArray(tags)
      ? tags.map(t => typeof t === 'string' ? { name: t } : (t && t.name ? t : { name: 'general' }))
      : [{ name: 'general' }];

    const previewPost = {
      _id: 'preview-incident-id',
      slug: 'live-preview',
      title: title || 'Untitled Incident Report',
      excerpt: excerpt || 'Detailed engineering incident analysis and root cause investigation.',
      content: Array.isArray(content) ? content : [],
      tags: formattedTags,
      coverImage: coverImage || '',
      status: status || 'investigating',
      severity: severity || 'high',
      investigationHours: parseFloat(investigationHours) || 0,
      createdAt: new Date(),
      views: 1,
      upvotes: 0,
      saves: 0,
      author: req.user || {
        _id: 'author-preview-id',
        username: 'engineering_responder',
        displayName: 'Incident Responder',
        avatarUrl: 'https://ui-avatars.com/api/?name=Incident+Responder&background=3B82F6&color=fff&size=120',
        reputation: 350,
        bio: 'On-call production systems investigator'
      }
    };

    res.render('pages/incident', {
      title: `${previewPost.title} | Preview`,
      post: previewPost,
      user: req.user || null,
      comments: [],
      hasUpvoted: false,
      hasSaved: false,
      relatedPosts: [],
      currentPath: '/write/preview',
      isPreview: true
    });
  } catch (err) {
    res.status(500).send(`<div style="padding: 30px; color: #EF4444; background: #09090B; font-family: -apple-system, sans-serif;"><h3>Preview Rendering Error</h3><p>${err.message}</p></div>`);
  }
});

// ── GET /drafts — List user drafts ────────────────────────────────────────────
router.get('/drafts', protect, async (req, res, next) => {
  try {
    const drafts = await Post.find({ author: req.user._id, isDraft: true })
      .sort('-updatedAt')
      .lean();

    res.render('pages/drafts', {
      title: 'Your Drafts | DevSolved',
      user: req.user,
      currentPath: '/drafts',
      drafts,
    });
  } catch (err) {
    next(err);
  }
});
// ── GET /embed/incidents/:slug — Embed widget ──────────────────────────────
router.get('/embed/incidents/:slug', async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug, isDraft: false })
      .populate('author', 'username displayName avatarUrl')
      .populate('tags', 'name displayName color')
      .lean();

    if (!post) return next();

    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");

    let snippet = post.excerpt || '';
    if (!snippet && post.content && Array.isArray(post.content)) {
      const textBlock = post.content.find(b => b.type === 'paragraph' || b.type === 'symptom' || b.type === 'rootCause');
      if (textBlock && textBlock.content) {
        snippet = textBlock.content.replace(/<[^>]*>?/gm, '').substring(0, 160) + '...';
      }
    }

    res.render('pages/embed-incident', {
      post,
      snippet,
      devsolvedUrl: `${req.protocol}://${req.get('host')}`
    });
  } catch (err) {
    next(err);
  }
});


// ── GET /incidents/:slug — Single incident page ───────────────────────────────
router.get('/incidents/:slug', optionalAuth, async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug, isDraft: false })
      .populate('author', 'username displayName avatarUrl reputation bio badges')
      .populate('tags', 'name displayName color')
      .lean();

    if (!post) return next();

    Post.updateOne({ _id: post._id }, { $inc: { views: 1 } }).exec();

    const relatedPosts = post.tags?.length > 0
      ? await Post.find({
        tags: post.tags[0]._id,
        _id: { $ne: post._id },
        isDraft: false,
      })
        .sort({ globalScore: -1 })
        .limit(2)
        .populate('author', 'username displayName avatarUrl')
        .lean()
      : [];

    const allComments = await Comment.find({ post: post._id })
      .populate('author', 'username displayName avatarUrl reputation')
      .sort({ createdAt: 1 })
      .lean();

    const rootComments = [];
    const commentMap = {};
    allComments.forEach(c => { c.replies = []; commentMap[c._id.toString()] = c; });
    allComments.forEach(c => {
      if (c.parentComment) {
        const parentId = c.parentComment.toString();
        if (commentMap[parentId]) { commentMap[parentId].replies.push(c); }
        else { rootComments.push(c); }
      } else { rootComments.push(c); }
    });
    const sortComments = (comments) => {
      comments.sort((a, b) => b.upvotes - a.upvotes || new Date(a.createdAt) - new Date(b.createdAt));
      comments.forEach(c => sortComments(c.replies));
    };
    sortComments(rootComments);

    const canonicalUrl = `${req.protocol}://${req.get('host')}/incidents/${post.slug}`;
    const structuredData = [
      {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": post.title,
        "datePublished": post.createdAt,
        "dateModified": post.updatedAt || post.createdAt,
        "author": {
          "@type": "Person",
          "name": post.author ? (post.author.displayName || post.author.username) : "Anonymous",
          "url": post.author ? `${req.protocol}://${req.get('host')}/u/${post.author.username}` : undefined
        },
        "publisher": {
          "@type": "Organization",
          "name": "DevSolved",
          "logo": {
            "@type": "ImageObject",
            "url": `${req.protocol}://${req.get('host')}/images/android-chrome-512x512.png`
          }
        },
        "image": post.coverImage || undefined,
        "keywords": post.tags ? post.tags.map(t => t.name).join(', ') : undefined,
        "interactionStatistic": [
          {
            "@type": "InteractionCounter",
            "interactionType": "https://schema.org/LikeAction",
            "userInteractionCount": post.upvotes || 0
          },
          {
            "@type": "InteractionCounter",
            "interactionType": "https://schema.org/CommentAction",
            "userInteractionCount": allComments.length || 0
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "DevSolved", "item": `${req.protocol}://${req.get('host')}/` },
          {
            "@type": "ListItem",
            "position": 2,
            "name": (post.tags && post.tags.length > 0) ? (post.tags[0].displayName || post.tags[0].name) : "Incidents",
            "item": (post.tags && post.tags.length > 0) ? `${req.protocol}://${req.get('host')}/t/${encodeURIComponent(post.tags[0].name)}` : `${req.protocol}://${req.get('host')}/search`
          },
          { "@type": "ListItem", "position": 3, "name": post.title, "item": canonicalUrl }
        ]
      }
    ];

    res.render('pages/incident', {
      title: `${post.title} | DevSolved`,
      description: post.excerpt,
      user: req.user || null,
      post,
      relatedPosts,
      comments: rootComments,
      currentPath: `/incidents/${post.slug}`,
      isOwner: req.user && post.author && req.user._id && String(req.user._id) === String(post.author._id),
      hasUpvoted: req.user && post.upvotedBy
        ? post.upvotedBy?.some((id) => String(id) === String(req.user._id))
        : false,
      hasSaved: req.user && req.user.savedPosts
        ? req.user.savedPosts?.some((id) => String(id) === String(post._id))
        : false,
      canonicalUrl,
      structuredData,
      ogImage: post.coverImage || undefined,
      ogType: 'article',
      publishedTime: post.createdAt ? post.createdAt.toISOString() : undefined,
      authorUrl: post.author ? `${req.protocol}://${req.get('host')}/u/${post.author.username}` : undefined
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /tags — Tags directory ────────────────────────────────────────────────
router.get('/tags', optionalAuth, async (req, res, next) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};

    const tags = await Tag.find(query)
      .sort({ incidentCount: -1 })
      .populate('topSolvers', 'username avatarUrl displayName')
      .lean();

    res.render('pages/tags', {
      title: 'Explore Tags | DevSolved',
      description: 'Discover war stories, postmortems, and exact architectural solutions across thousands of technologies.',
      user: req.user || null,
      tags,
      activeCategory: category || 'all',
      currentPath: '/tags',
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /u/:username — Public profile ─────────────────────────────────────────
router.get('/u/:username', optionalAuth, async (req, res, next) => {
  try {
    const uname = req.params.username.toLowerCase();
    const profileUser = await User.findOne({ username: new RegExp('^' + uname + '$', 'i') })
      .populate('followedTags', 'name displayName color')
      .lean();

    if (!profileUser) return next();

    const tab = req.query.tab || 'posts';
    let postQuery = { isDraft: false };
    if (tab === 'upvoted') { postQuery.upvotedBy = profileUser._id; }
    else if (tab === 'saved') { postQuery._id = { $in: profileUser.savedPosts || [] }; }
    else { postQuery.author = profileUser._id; }

    const posts = await Post.find(postQuery)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('tags', 'name displayName color')
      .lean();

    const isOwn = req.user && profileUser._id && req.user._id && String(req.user._id) === String(profileUser._id);
    const isFollowing = req.user && profileUser.followers
      ? profileUser.followers?.some((id) => String(id) === String(req.user._id))
      : false;

    // ── Real Telemetry Calculation: Resolution Rate & Connected SREs ────────
    const totalAuthored = await Post.countDocuments({ author: profileUser._id, isDraft: false });
    const resolvedAuthored = await Post.countDocuments({
      author: profileUser._id,
      isDraft: false,
      $or: [{ status: 'resolved' }, { githubPrUrl: { $ne: '' } }, { githubPrUrl: { $exists: true, $ne: '' } }]
    });

    // Calculation Formula: (Resolved Incidents / Total Published Incidents) * 100%
    let resolutionRate = '0.0%';
    if (totalAuthored > 0) {
      resolutionRate = ((resolvedAuthored / totalAuthored) * 100).toFixed(1) + '%';
    }

    // Calculation Formula: Connected SREs = Network Reach (Followers + Following)
    const rawFollowers = profileUser.followers?.length || 0;
    const rawFollowing = profileUser.following?.length || 0;
    const connectedSREs = rawFollowers + rawFollowing;
    const verifiedFixesCount = resolvedAuthored;

    // ── Dynamic Real Achievements Engine ──────────────────────────────────────
    const realBadges = [];
    realBadges.push({
      name: 'Alpha Account',
      description: 'Verified workspace identity and founding developer profile on DevSolved.',
      iconName: 'terminal',
      tier: 'gold',
      awardedAt: profileUser.joinedAt || profileUser.createdAt || new Date()
    });
    if (resolvedAuthored >= 1) {
      realBadges.push({
        name: 'Verified Resolver',
        description: 'Successfully diagnosed and resolved a production systems outage.',
        iconName: 'shield-check',
        tier: 'green',
        awardedAt: new Date()
      });
    }
    if (totalAuthored >= 1) {
      realBadges.push({
        name: 'Incident Scribe',
        description: 'Published initial technical postmortem to the developer community.',
        iconName: 'file-text',
        tier: 'blue',
        awardedAt: new Date()
      });
    }
    if (totalAuthored >= 3) {
      realBadges.push({
        name: 'Systems Chronicler',
        description: 'Documented 3+ deep-dive investigation reports and root cause analyses.',
        iconName: 'book-open',
        tier: 'blue',
        awardedAt: new Date()
      });
    }
    if ((profileUser.reputation || 0) >= 50) {
      realBadges.push({
        name: 'Principal Investigator',
        description: 'Earned 50+ developer reputation through verified fixes and peer recognition.',
        iconName: 'award',
        tier: 'gold',
        awardedAt: new Date()
      });
    }
    if (connectedSREs >= 1) {
      realBadges.push({
        name: 'Network Collaborator',
        description: 'Connected with peer engineers across the distributed SRE telemetry network.',
        iconName: 'users',
        tier: 'green',
        awardedAt: new Date()
      });
    }
    // Merge existing DB badges with computed real badges without duplicate names
    const mergedBadges = [...(profileUser.badges || [])];
    const existingBadgeNames = new Set(mergedBadges.map(b => (b.name || b)));
    for (const rb of realBadges) {
      if (!existingBadgeNames.has(rb.name)) mergedBadges.push(rb);
    }
    profileUser.badges = mergedBadges;

    const canonicalUrl = `${req.protocol}://${req.get('host')}/u/${profileUser.username}`;
    const structuredData = [
      {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "mainEntity": {
          "@type": "Person",
          "name": profileUser.displayName || profileUser.username,
          "description": profileUser.bio || `Developer profile on DevSolved`,
          "image": profileUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.username)}`,
          "url": canonicalUrl,
          "interactionStatistic": [{
            "@type": "InteractionCounter",
            "interactionType": "https://schema.org/FollowAction",
            "userInteractionCount": rawFollowers
          }]
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "DevSolved", "item": `${req.protocol}://${req.get('host')}/` },
          { "@type": "ListItem", "position": 2, "name": "Engineers", "item": `${req.protocol}://${req.get('host')}/leaderboard` },
          { "@type": "ListItem", "position": 3, "name": profileUser.displayName || profileUser.username, "item": canonicalUrl }
        ]
      }
    ];

    res.render('pages/profile', {
      title: `${profileUser.displayName || profileUser.username} (@${profileUser.username}) | DevSolved`,
      description: profileUser.bio || `Developer profile of @${profileUser.username} on DevSolved`,
      user: req.user || null,
      profileUser,
      posts,
      isOwn,
      isFollowing,
      activeTab: tab,
      resolutionRate,
      connectedSREs,
      verifiedFixesCount,
      followersCount: rawFollowers,
      currentPath: `/u/${profileUser.username}`,
      canonicalUrl,
      structuredData,
      ogImage: profileUser.avatarUrl || undefined
    });
  } catch (err) {
    next(err);
  }
});

// ── Documentation & Legal Pages ──────────────────────────────────────────────
const renderStaticDoc = (viewPath, title, description) => {
  return (req, res) => {
    const canonicalUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
    res.render(viewPath, {
      title,
      description,
      user: req.user || null,
      currentPath: req.originalUrl.split('?')[0],
      canonicalUrl
    });
  };
};

router.get('/docs', optionalAuth, renderStaticDoc('pages/docs/index', 'Documentation | DevSolved', 'Platform documentation for DevSolved.'));
router.get('/api-docs', optionalAuth, renderStaticDoc('pages/docs/api', 'Developer API | DevSolved', 'DevSolved Developer API (Coming Soon).'));
router.get('/guidelines', optionalAuth, renderStaticDoc('pages/docs/guidelines', 'Writing Guidelines | DevSolved', 'Ethical guidelines and formatting rules for postmortems on DevSolved.'));
router.get('/help', optionalAuth, renderStaticDoc('pages/docs/help', 'Help Center | DevSolved', 'Help Center and FAQs for DevSolved.'));

router.get('/privacy', optionalAuth, renderStaticDoc('pages/legal/privacy', 'Privacy Policy | DevSolved', 'How DevSolved protects your privacy and handles data telemetry.'));
router.get('/terms', optionalAuth, renderStaticDoc('pages/legal/terms', 'Terms of Service | DevSolved', 'DevSolved Terms of Service and platform engagement rules.'));
router.get('/cookies', optionalAuth, renderStaticDoc('pages/legal/cookies', 'Cookie Policy | DevSolved', 'DevSolved Cookie Policy regarding authentication sessions.'));
router.get('/security', optionalAuth, renderStaticDoc('pages/legal/security', 'Security & Responsible Disclosure | DevSolved', 'DevSolved security practices and vulnerability reporting.'));

// ── Enterprise Sitemap Index ─────────────────────────────────────────────────
const CACHE_TTL = 3600; // 1 hour

router.get('/sitemap.xml', async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  const sitemaps = ['/sitemap-static.xml', '/sitemap-incidents.xml', '/sitemap-users.xml', '/sitemap-topics.xml'];
  for (const sm of sitemaps) {
    xml += `  <sitemap>\n    <loc>${baseUrl}${sm}</loc>\n    <lastmod>${new Date().toISOString()}</lastmod>\n  </sitemap>\n`;
  }

  xml += '</sitemapindex>';
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

router.get('/sitemap-static.xml', async (req, res) => {
  try {
    const cacheKey = 'sitemap:static';
    if (isRedisAvailable()) {
      const cached = await getRedis().get(cacheKey);
      if (cached) {
        res.header('Content-Type', 'application/xml');
        return res.send(cached);
      }
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    const platformRoutes = ['', '/search', '/leaderboard', '/tags'];
    for (const route of platformRoutes) {
      xml += `  <url>\n    <loc>${baseUrl}${route}</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    }

    const staticRoutes = ['/docs', '/api-docs', '/guidelines', '/help', '/privacy', '/terms', '/cookies', '/security'];
    for (const route of staticRoutes) {
      xml += `  <url>\n    <loc>${baseUrl}${route}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
    }

    xml += '</urlset>';

    if (isRedisAvailable()) await getRedis().set(cacheKey, xml, 'EX', CACHE_TTL);
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).end();
  }
});
router.get('/sitemap-topics.xml', async (req, res) => {
  try {
    const cacheKey = 'sitemap:topics';
    if (isRedisAvailable()) {
      const cached = await getRedis().get(cacheKey);
      if (cached) {
        res.header('Content-Type', 'application/xml');
        return res.send(cached);
      }
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    const tags = await Tag.find({}).lean();
    for (const tag of tags) {
      // Tags don't have a strict lastmod, we can use updatedAt or a default
      const lastMod = tag.updatedAt ? new Date(tag.updatedAt).toISOString() : new Date().toISOString();
      xml += `  <url>\n    <loc>${baseUrl}/t/${encodeURIComponent(tag.name)}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }

    xml += '</urlset>';

    if (isRedisAvailable()) await getRedis().set(cacheKey, xml, 'EX', CACHE_TTL);
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).end();
  }
});

router.get('/sitemap-incidents.xml', async (req, res) => {
  try {
    const cacheKey = 'sitemap:incidents';
    if (isRedisAvailable()) {
      const cached = await getRedis().get(cacheKey);
      if (cached) {
        res.header('Content-Type', 'application/xml');
        return res.send(cached);
      }
    }

    const posts = await Post.find({ isDraft: false }).select('slug updatedAt coverImage').lean();
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    for (const post of posts) {
      const lastMod = post.updatedAt ? new Date(post.updatedAt).toISOString() : new Date().toISOString();
      xml += `  <url>\n    <loc>${baseUrl}/incidents/${post.slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n`;
      if (post.coverImage && post.coverImage.startsWith('http')) {
        xml += `    <image:image>\n      <image:loc><![CDATA[${post.coverImage}]]></image:loc>\n    </image:image>\n`;
      }
      xml += `  </url>\n`;
    }

    xml += '</urlset>';

    if (isRedisAvailable()) await getRedis().set(cacheKey, xml, 'EX', CACHE_TTL);
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).end();
  }
});

router.get('/sitemap-users.xml', async (req, res) => {
  try {
    const cacheKey = 'sitemap:users';
    if (isRedisAvailable()) {
      const cached = await getRedis().get(cacheKey);
      if (cached) {
        res.header('Content-Type', 'application/xml');
        return res.send(cached);
      }
    }

    const users = await User.find({}).select('username').lean();
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const user of users) {
      xml += `  <url>\n    <loc>${baseUrl}/u/${encodeURIComponent(user.username.toLowerCase())}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    }

    xml += '</urlset>';

    if (isRedisAvailable()) await getRedis().set(cacheKey, xml, 'EX', CACHE_TTL);
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).end();
  }
});

// ── RSS / Atom Feed (SEO Syndication) ────────────────────────────────────────
router.get('/feed.xml', async (req, res) => {
  try {
    const cacheKey = 'seo:rssfeed';
    if (isRedisAvailable()) {
      const cached = await getRedis().get(cacheKey);
      if (cached) {
        res.header('Content-Type', 'application/rss+xml');
        return res.send(cached);
      }
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const posts = await Post.find({ isDraft: false })
      .populate('author', 'username displayName')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    let rss = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
    rss += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n`;
    rss += `<channel>\n`;
    rss += `  <title>DevSolved Incidents & Postmortems</title>\n`;
    rss += `  <description>Explore real-world production outages, root cause analyses, and solutions documented by the engineering community.</description>\n`;
    rss += `  <link>${baseUrl}</link>\n`;
    rss += `  <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />\n`;

    posts.forEach(post => {
      const postUrl = `${baseUrl}/incidents/${post.slug}`;
      const pubDate = new Date(post.createdAt).toUTCString();
      const authorName = post.author ? (post.author.displayName || post.author.username) : 'DevSolved Engineer';

      rss += `  <item>\n`;
      rss += `    <title><![CDATA[${post.title}]]></title>\n`;
      rss += `    <link>${postUrl}</link>\n`;
      rss += `    <guid>${postUrl}</guid>\n`;
      rss += `    <pubDate>${pubDate}</pubDate>\n`;
      rss += `    <description><![CDATA[${post.excerpt || 'Technical root-cause and remediation steps.'}]]></description>\n`;
      rss += `    <author>contact@devsolved.com (${authorName})</author>\n`;
      rss += `  </item>\n`;
    });

    rss += `</channel>\n`;
    rss += `</rss>`;

    if (isRedisAvailable()) await getRedis().set(cacheKey, rss, 'EX', 3600); // 1 hour cache

    res.header('Content-Type', 'application/rss+xml');
    res.send(rss);
  } catch (err) {
    console.error('RSS Feed error:', err);
    res.status(500).end();
  }
});

export default router;
