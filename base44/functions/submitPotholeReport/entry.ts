import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reportId } = await req.json();
    if (!reportId) return Response.json({ error: 'reportId required' }, { status: 400 });

    const report = await base44.entities.PotholeReport.get(reportId);
    if (!report) return Response.json({ error: 'Report not found' }, { status: 404 });

    const results = { email: null, open311: null };

    // Email submission
    if (report.submission_email) {
      try {
        const body = [
          `POTHOLE REPORT — Please Fix`,
          ``,
          `Location: ${report.address || `${report.latitude}, ${report.longitude}`}`,
          `Coordinates: ${report.latitude}, ${report.longitude}`,
          `Severity: ${report.severity?.toUpperCase()}`,
          `Description: ${report.description || 'No description provided'}`,
          `Photo: ${report.photo_url || 'None'}`,
          `Reported via: PotholePing app`,
          ``,
          `Google Maps: https://www.google.com/maps?q=${report.latitude},${report.longitude}`,
        ].join('\n');

        await base44.integrations.Core.SendEmail({
          to: report.submission_email,
          subject: `Pothole Report — ${report.address || 'Unnamed Location'} — ${report.severity?.toUpperCase()}`,
          body,
        });

        results.email = 'sent';
      } catch (e) {
        results.email = 'failed: ' + e.message;
      }
    }

    // Open311 submission
    if (report.open311_endpoint && report.open311_service_code) {
      try {
        const baseUrl = report.open311_endpoint.replace(/\/$/, '');
        const apiUrl = `${baseUrl}/requests.json`;

        const formData = new URLSearchParams();
        formData.append('service_code', report.open311_service_code);
        formData.append('lat', String(report.latitude));
        formData.append('long', String(report.longitude));
        formData.append('address_string', report.address || '');
        formData.append('description', [
          report.description || 'Pothole needs repair',
          `Severity: ${report.severity?.toUpperCase() || 'MODERATE'}`,
          `Reported via PotholePing`,
        ].filter(Boolean).join(' | '));
        if (report.photo_url) {
          formData.append('media_url', report.photo_url);
        }

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        });

        if (res.ok) {
          const data = await res.json();
          const serviceRequestId = data?.[0]?.service_request_id || data?.service_request_id || 'unknown';
          results.open311 = { status: 'submitted', id: serviceRequestId };

          await base44.entities.PotholeReport.update(reportId, {
            submission_status: 'open311_submitted',
            submission_details: `Open311 request ${serviceRequestId} submitted to ${report.open311_endpoint}`,
          });
        } else {
          const errText = await res.text();
          results.open311 = { status: 'failed', error: errText };
        }
      } catch (e) {
        results.open311 = { status: 'failed', error: e.message };
      }
    }

    // Set combined status
    if (results.email === 'sent' && !results.open311) {
      await base44.entities.PotholeReport.update(reportId, {
        submission_status: 'email_sent',
        submission_details: `Email sent to ${report.submission_email}`,
      });
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});