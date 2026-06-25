import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { pothole_id, pothole_address, pothole_severity, zip_code } = body;

    if (!pothole_id || !zip_code) {
      return Response.json({ error: 'Missing pothole_id or zip_code' }, { status: 400 });
    }

    const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
    const appId = Deno.env.get('ONESIGNAL_APP_ID');

    if (!apiKey || !appId) {
      return Response.json({ error: 'OneSignal credentials not configured' }, { status: 500 });
    }

    // Send notification to users in the watch zone
    const notificationPayload = {
      app_id: appId,
      include_external_user_ids: [`watch_zone_${zip_code}`],
      headings: { en: '🚨 New Pothole Report' },
      contents: { 
        en: `Pothole reported at ${pothole_address || 'your area'} (${pothole_severity} severity)` 
      },
      big_picture: 'https://cdn.onesignal.com/icons/alert.png',
      data: {
        pothole_id,
        zip_code,
        type: 'pothole_alert'
      }
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(apiKey)}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(notificationPayload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OneSignal error:', result);
      return Response.json({ error: 'Failed to send notification', details: result }, { status: 500 });
    }

    return Response.json({ success: true, notification_id: result.body?.notification_id });
  } catch (error) {
    console.error('sendWatchZoneNotifications error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});