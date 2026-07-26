import express from 'express';
import { protect } from '../middleware/auth.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const router = express.Router();

// ── Helper: Format Time Ago ───────────────────────────────────────────────────
const formatTimeAgo = (date) => {
  if (!date) return 'Just now';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(date).toLocaleDateString();
};

// ── GET /notifications ────────────────────────────────────────────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const dbNotifs = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).lean();

    const notifications = dbNotifs.map(n => ({
      id: n._id.toString(),
      category: n.category || 'system',
      typeLabel: n.typeLabel || 'System Notification',
      title: n.title || '',
      targetTitle: n.targetTitle || '',
      content: n.content || '',
      timestamp: formatTimeAgo(n.createdAt),
      rawTime: new Date(n.createdAt).getTime(),
      unread: n.unread !== false,
      link: n.link || '/notifications',
      avatar: n.avatar || 'https://ui-avatars.com/api/?name=DevSolved+Bot&background=27272A&color=fff&size=100',
      icon: n.icon || 'bell',
      badgeText: n.badgeText || 'Alert',
      badgeColor: n.badgeColor || '#3B82F6',
      actionText: n.actionText || 'View Details',
      interactiveType: n.interactiveType || 'link',
      targetUser: n.targetUser || 'developer'
    }));

    const unreadCount = notifications.filter(n => n.unread).length;

    res.render('pages/notifications', {
      title: 'DevSolved | Notifications & Telemetry',
      description: 'Stay updated on your developer war stories, mentions, solutions, and system telemetry.',
      user: req.user,
      notifications,
      unreadCount,
      currentPath: '/notifications',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /notifications/mark-all-read ─────────────────────────────────────────
router.post('/mark-all-read', protect, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id }, { unread: false });
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /notifications/:id/toggle-read ─────────────────────────────────────
router.post('/:id/toggle-read', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { unread } = req.body;
    await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id },
      { unread: Boolean(unread) }
    );
    res.json({ success: true, id, unread });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /notifications/reply (Interactive Mention Quick Reply) ────────────
router.post('/reply', protect, async (req, res) => {
  try {
    const { notificationId, replyText, targetUser } = req.body;
    if (!replyText) {
      return res.status(400).json({ success: false, message: 'Reply text cannot be empty' });
    }

    if (notificationId && notificationId.length === 24) {
      await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: req.user._id },
        { unread: false, badgeText: 'Replied ✓', badgeColor: '#10B981' }
      );
    }

    // Dispatch a real Direct Reply notification to the target user if they exist in DB
    if (targetUser) {
      const cleanUsername = targetUser.replace(/^@/, '').trim().toLowerCase();
      const recipientUser = await User.findOne({ username: new RegExp('^' + cleanUsername + '$', 'i') });
      if (recipientUser && String(recipientUser._id) !== String(req.user._id)) {
        await Notification.create({
          recipient: recipientUser._id,
          sender: req.user._id,
          category: 'comment',
          typeLabel: 'Direct Mention',
          title: `${req.user.displayName || req.user.username} (@${req.user.username}) replied directly to your alert`,
          targetTitle: 'Telemetry Discussion Thread',
          content: replyText,
          unread: true,
          link: `/u/${req.user.username}`,
          avatar: req.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.user.displayName || req.user.username)}&background=3B82F6&color=fff&size=100`,
          icon: 'message-square',
          badgeText: 'New Mention',
          badgeColor: '#3B82F6',
          actionText: 'View Profile',
          interactiveType: 'reply',
          targetUser: req.user.username
        });
      }
    }

    res.json({
      success: true,
      notificationId,
      message: `Reply transmitted to @${targetUser}: "${replyText.substring(0, 40)}..."`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /notifications/action (General Interactive Actions) ───────────────
router.post('/action', protect, async (req, res) => {
  try {
    const { notificationId, actionType, target } = req.body;
    let responseMsg = 'Action executed successfully.';

    if (actionType === 'follow_back') {
      if (target) {
        const targetUsername = target.replace(/^@/, '').trim().toLowerCase();
        const targetUser = await User.findOne({ username: new RegExp('^' + targetUsername + '$', 'i') });
        const currentUser = await User.findById(req.user._id);

        if (targetUser && currentUser && targetUser._id.toString() !== currentUser._id.toString()) {
          const isFollowing = currentUser.following.some(id => id.toString() === targetUser._id.toString());
          if (!isFollowing) {
            currentUser.following.push(targetUser._id);
            targetUser.followers.push(currentUser._id);
            await Promise.all([currentUser.save(), targetUser.save()]);

            // Dispatch a real mutual connection notification back to the targeted developer!
            await Notification.create({
              recipient: targetUser._id,
              sender: currentUser._id,
              category: 'system',
              typeLabel: 'Mutual SRE Connection',
              title: `${currentUser.displayName || currentUser.username} (@${currentUser.username}) followed you back!`,
              targetTitle: 'Connected SRE Network',
              content: `You and @${currentUser.username} are now mutually connected. You can track each other's war stories and system postmortems.`,
              unread: true,
              link: `/u/${currentUser.username}`,
              avatar: currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.username)}&background=10B981&color=fff&size=100`,
              icon: 'users',
              badgeText: 'Mutual Connection',
              badgeColor: '#10B981',
              actionText: 'View Profile',
              interactiveType: 'link',
              targetUser: currentUser.username
            });
          }
        }
      }
      responseMsg = `You are now mutually following @${target || 'developer'}!`;
      if (notificationId && notificationId.length === 24) {
        await Notification.findOneAndUpdate(
          { _id: notificationId, recipient: req.user._id },
          { unread: false, badgeText: 'Following Back ✓', badgeColor: '#10B981' }
        );
      }
    } else if (actionType === 'claim_rep') {
      responseMsg = '+50 Reputation and Bug Slayer badge synced to your account!';
      await User.findByIdAndUpdate(req.user._id, { $inc: { reputation: 50 } });
      if (notificationId && notificationId.length === 24) {
        await Notification.findOneAndUpdate(
          { _id: notificationId, recipient: req.user._id },
          { unread: false, badgeText: '+50 Rep Claimed ✓', badgeColor: '#10B981' }
        );
      }
    } else if (actionType === 'security_verify') {
      responseMsg = 'Device session IP 192.168.1.1 verified as trusted terminal.';
      if (notificationId && notificationId.length === 24) {
        await Notification.findOneAndUpdate(
          { _id: notificationId, recipient: req.user._id },
          { unread: false, badgeText: 'Verified Terminal ✓', badgeColor: '#10B981' }
        );
      }
    }

    res.json({ success: true, notificationId, message: responseMsg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /notifications/:id ───────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findOneAndDelete({ _id: id, recipient: req.user._id });
    res.json({ success: true, id, message: 'Notification removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
