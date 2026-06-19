import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Search, Plus, MessageSquare, Bell, BellOff, ChevronDown, ChevronRight, MapPin, AlertTriangle, MessageCircle } from 'lucide-react';
import moment from 'moment';

const postTypeIcons = {
  discussion: MessageCircle,
  alert: AlertTriangle,
  pothole: MapPin,
};

const postTypeColors = {
  discussion: 'bg-blue-100 text-blue-700',
  alert: 'bg-red-100 text-red-700',
  pothole: 'bg-orange-100 text-orange-700',
};

function CommentThread({ comment, allComments, postId, onReply }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const children = allComments.filter(c => c.parent_comment_id === comment.id);

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(postId, replyText, comment.id);
    setReplyText('');
    setShowReply(false);
  };

  return (
    <div className="pl-4 border-l-2 border-muted">
      <div className="py-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-xs">{comment.author_name || 'Anonymous'}</span>
          <span className="text-[10px] text-muted-foreground">{moment(comment.created_date).fromNow()}</span>
        </div>
        <p className="text-sm mt-0.5">{comment.text}</p>
        <button
          onClick={() => setShowReply(!showReply)}
          className="text-xs text-primary mt-1 hover:underline"
        >
          Reply
        </button>
        {showReply && (
          <div className="mt-2 flex gap-2">
            <Input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="h-7 text-xs"
              onKeyDown={e => e.key === 'Enter' && handleReply()}
            />
            <Button size="sm" className="h-7 text-xs" onClick={handleReply}>Send</Button>
          </div>
        )}
      </div>
      {children.map(child => (
        <CommentThread key={child.id} comment={child} allComments={allComments} postId={postId} onReply={onReply} />
      ))}
    </div>
  );
}

function PostCard({ post, onNewComment }) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    const res = await base44.entities.WatchZoneComment.filter({ post_id: post.id }, 'created_date', 100);
    setComments(res);
    setLoadingComments(false);
  }, [post.id]);

  const handleExpand = () => {
    if (!expanded) {
      loadComments();
    }
    setExpanded(!expanded);
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    await onNewComment(post.id, commentText, null);
    setCommentText('');
    loadComments();
  };

  const TypeIcon = postTypeIcons[post.type] || MessageCircle;

  return (
    <div className="bg-card rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <TypeIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${postTypeColors[post.type] || ''}`}>
              {post.type}
            </Badge>
          </div>
          <h4 className="font-medium text-sm mt-1">{post.title}</h4>
        </div>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">{post.text}</p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{post.author_name || 'Anonymous'} · {moment(post.created_date).fromNow()}</span>
        <button
          onClick={handleExpand}
          className="flex items-center gap-1 text-primary hover:underline"
        >
          <MessageSquare className="w-3 h-3" />
          {post.comment_count || 0} comments
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </div>
      {expanded && (
        <div className="border-t pt-2 mt-2">
          <div className="flex gap-2 mb-3">
            <Input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="h-8 text-sm"
              onKeyDown={e => e.key === 'Enter' && handleComment()}
            />
            <Button size="sm" className="h-8 text-xs shrink-0" onClick={handleComment}>Post</Button>
          </div>
          {loadingComments ? (
            <p className="text-xs text-muted-foreground">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No comments yet.</p>
          ) : (
            <div className="space-y-1">
              {comments
                .filter(c => !c.parent_comment_id)
                .map(comment => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    allComments={comments}
                    postId={post.id}
                    onReply={async (postId, text, parentId) => {
                      await base44.entities.WatchZoneComment.create({
                        post_id: postId,
                        text,
                        author_name: 'User',
                        parent_comment_id: parentId,
                      });
                      loadComments();
                    }}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WatchZones() {
  const [zipSearch, setZipSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [subscribedZones, setSubscribedZones] = useState([]);
  const [subscriptionIds, setSubscriptionIds] = useState(new Set());
  const [posts, setPosts] = useState([]);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', text: '', type: 'discussion', zoneId: '' });
  const [loading, setLoading] = useState(true);

  const loadSubscriptions = useCallback(async () => {
    const subs = await base44.entities.UserWatchZone.list();
    const ids = new Set(subs.map(s => s.watch_zone_id));
    setSubscriptionIds(ids);
    if (ids.size > 0) {
      const allZones = await base44.entities.WatchZone.list();
      setSubscribedZones(allZones.filter(z => ids.has(z.id)));
    } else {
      setSubscribedZones([]);
      setPosts([]);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    if (subscriptionIds.size === 0) return;
    const allPosts = [];
    for (const zoneId of subscriptionIds) {
      const zonePosts = await base44.entities.WatchZonePost.filter({ watch_zone_id: zoneId }, '-created_date', 50);
      allPosts.push(...zonePosts);
    }
    allPosts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    setPosts(allPosts);
  }, [subscriptionIds]);

  useEffect(() => {
    loadSubscriptions().then(() => setLoading(false));
    const handler = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener('potholeping-scroll-reset', handler);
    return () => window.removeEventListener('potholeping-scroll-reset', handler);
  }, [loadSubscriptions]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const searchZones = async () => {
    if (!zipSearch.trim()) return;
    const results = await base44.entities.WatchZone.filter({ zip_code: zipSearch.trim() });
    setSearchResults(results);
  };

  const createZone = async () => {
    if (!zipSearch.trim()) return;
    const existing = await base44.entities.WatchZone.filter({ zip_code: zipSearch.trim() });
    if (existing.length > 0) {
      setSearchResults(existing);
      return;
    }
    await base44.entities.WatchZone.create({ zip_code: zipSearch.trim(), city: '', state: '', member_count: 0 });
    const created = await base44.entities.WatchZone.filter({ zip_code: zipSearch.trim() });
    setSearchResults(created);
  };

  const toggleSubscription = async (zoneId) => {
    if (subscriptionIds.has(zoneId)) {
      const subs = await base44.entities.UserWatchZone.filter({ watch_zone_id: zoneId });
      if (subs.length > 0) {
        await base44.entities.UserWatchZone.delete(subs[0].id);
      }
    } else {
      await base44.entities.UserWatchZone.create({ watch_zone_id: zoneId });
    }
    await loadSubscriptions();
  };

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.text.trim() || !newPost.zoneId) return;
    await base44.entities.WatchZonePost.create({
      watch_zone_id: newPost.zoneId,
      title: newPost.title,
      text: newPost.text,
      author_name: 'User',
      type: newPost.type,
    });
    setNewPost({ title: '', text: '', type: 'discussion', zoneId: '' });
    setShowNewPost(false);
    loadPosts();
  };

  const handleNewComment = async (postId, text, parentId) => {
    await base44.entities.WatchZoneComment.create({
      post_id: postId,
      text,
      author_name: 'User',
      parent_comment_id: parentId || null,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center gap-3 px-4 h-14 max-w-2xl mx-auto">
          <Link to="/" className="p-1.5 -ml-1.5 hover:bg-muted rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-heading font-bold text-lg">Neighborhood Watch</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-20 sm:pb-4 space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={zipSearch}
              onChange={e => setZipSearch(e.target.value)}
              placeholder="Search by ZIP code..."
              className="pl-9"
              onKeyDown={e => e.key === 'Enter' && searchZones()}
            />
          </div>
          <Button size="sm" onClick={searchZones}>Find</Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Results</h3>
            {searchResults.map(zone => (
              <div key={zone.id} className="flex items-center justify-between bg-card rounded-lg border p-3">
                <div>
                  <p className="font-medium">{zone.zip_code}</p>
                  <p className="text-xs text-muted-foreground">{zone.city}{zone.city && zone.state ? ', ' : ''}{zone.state}</p>
                </div>
                <Button
                  size="sm"
                  variant={subscriptionIds.has(zone.id) ? 'secondary' : 'default'}
                  onClick={() => toggleSubscription(zone.id)}
                  className="gap-1.5"
                >
                  {subscriptionIds.has(zone.id) ? (
                    <><BellOff className="w-3.5 h-3.5" /> Unwatch</>
                  ) : (
                    <><Bell className="w-3.5 h-3.5" /> Watch</>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Show create zone if none found */}
        {zipSearch && searchResults.length === 0 && (
          <div className="text-center py-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">No zone found for {zipSearch}</p>
            <Button size="sm" onClick={createZone}>Create "{zipSearch}" Zone</Button>
          </div>
        )}

        {/* Subscribed Zones */}
        {subscribedZones.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Your Zones</h3>
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setShowNewPost(!showNewPost)}>
                <Plus className="w-3.5 h-3.5" /> New Post
              </Button>
            </div>

            {/* Zone pills */}
            <div className="flex flex-wrap gap-2">
              {subscribedZones.map(zone => (
                <Badge key={zone.id} variant="secondary" className="gap-1.5 px-2.5 py-1.5">
                  <MapPin className="w-3 h-3" />
                  {zone.zip_code}
                </Badge>
              ))}
            </div>

            {/* New Post Form */}
            {showNewPost && (
              <div className="bg-card rounded-lg border p-3 space-y-3">
                <Input
                  value={newPost.title}
                  onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="Post title..."
                  className="text-sm"
                />
                <textarea
                  value={newPost.text}
                  onChange={e => setNewPost({ ...newPost, text: e.target.value })}
                  placeholder="What's happening in your neighborhood?"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={newPost.type}
                    onChange={e => setNewPost({ ...newPost, type: e.target.value })}
                    className="text-xs rounded-md border border-input bg-transparent px-2 py-1.5"
                  >
                    <option value="discussion">Discussion</option>
                    <option value="alert">Alert</option>
                    <option value="pothole">Pothole</option>
                  </select>
                  <select
                    value={newPost.zoneId}
                    onChange={e => setNewPost({ ...newPost, zoneId: e.target.value })}
                    className="text-xs rounded-md border border-input bg-transparent px-2 py-1.5 flex-1"
                  >
                    <option value="">Select zone...</option>
                    {subscribedZones.map(zone => (
                      <option key={zone.id} value={zone.id}>{zone.zip_code}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreatePost}>Post</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewPost(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Posts Feed */}
            <ScrollArea className="h-[calc(100vh-340px)]">
              {posts.length === 0 ? (
                <div className="text-center py-10">
                  <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No posts yet in your zones.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Be the first to start a discussion!</p>
                </div>
              ) : (
                <div className="space-y-3 pb-4">
                  {posts.map(post => (
                    <PostCard key={post.id} post={post} onNewComment={handleNewComment} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* No subscriptions */}
        {subscribedZones.length === 0 && !loading && (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="font-heading font-semibold text-lg mb-1">No Zones Yet</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Search for a ZIP code above to start watching your neighborhood.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}