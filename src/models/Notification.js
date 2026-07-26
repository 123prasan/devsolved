import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  category: {
    type: String,
    enum: ['comment', 'solution', 'system', 'mention', 'upvote', 'follow'],
    default: 'system'
  },
  typeLabel: {
    type: String,
    default: 'System Notification'
  },
  title: {
    type: String,
    required: true
  },
  targetTitle: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  unread: {
    type: Boolean,
    default: true
  },
  link: {
    type: String,
    default: '/notifications'
  },
  avatar: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: 'bell'
  },
  badgeText: {
    type: String,
    default: 'New'
  },
  badgeColor: {
    type: String,
    default: '#3B82F6'
  },
  actionText: {
    type: String,
    default: 'View Details'
  },
  interactiveType: {
    type: String,
    default: 'link' // e.g. follow_back, reply, claim_rep, leaderboard, digest, security_verify, link
  },
  targetUser: {
    type: String,
    default: ''
  }
}, { timestamps: true });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
