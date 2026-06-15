import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, message } = await req.json();
    if (!message || !message.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    const label = type === 'bug' ? 'Bug Report' : 'Suggestion';
    const body = [
      `${label} from PotholePing`,
      '',
      `From: ${user.full_name || 'Anonymous'} (${user.email})`,
      `Type: ${label}`,
      '',
      message,
    ].join('\n');

    await base44.integrations.Core.SendEmail({
      to: 'mckeecmatt@gmail.com',
      subject: `[PotholePing] ${label}: ${message.substring(0, 60)}${message.length > 60 ? '...' : ''}`,
      body,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});