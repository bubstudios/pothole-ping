import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.0.0';

function formatDate(iso) {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
}

function wrapText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line, i) => {
    doc.text(line, x, y + i * lineHeight);
  });
  return y + lines.length * lineHeight;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reportId, damageId } = await req.json();
    if (!reportId || !damageId) {
      return Response.json({ error: 'reportId and damageId are required' }, { status: 400 });
    }

    const [report, damage] = await Promise.all([
      base44.entities.PotholeReport.get(reportId),
      base44.entities.VehicleDamage.get(damageId),
    ]);

    if (!report) return Response.json({ error: 'Pothole report not found' }, { status: 404 });
    if (!damage) return Response.json({ error: 'Damage record not found' }, { status: 404 });

    // Mark packet as generated
    await base44.entities.VehicleDamage.update(damageId, { claim_status: 'packet_generated' });

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // ── Header ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(249, 115, 22); // orange
    doc.text('Pothole Damage Claim Packet', margin, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${formatDate(new Date().toISOString())}`, margin, y);
    y += 12;

    // ── Section: Claimant Info ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text('Claimant Information', margin, y);
    y += 8;

    doc.setDrawColor(249, 115, 22);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(`Name: ${user.full_name || 'N/A'}`, margin, y); y += 6;
    doc.text(`Email: ${user.email || 'N/A'}`, margin, y); y += 12;

    // ── Section: Pothole Report (Timestamped Proof) ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text('Original Pothole Report (Timestamped Proof)', margin, y);
    y += 8;

    doc.setDrawColor(249, 115, 22);
    doc.line(margin, y, margin + contentWidth, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);

    doc.text(`Report ID: ${report.id}`, margin, y); y += 6;
    doc.text(`Date Reported: ${formatDate(report.created_date)}`, margin, y); y += 6;
    doc.text(`Location: ${report.address || 'Unknown'}`, margin, y); y += 6;
    doc.text(`Coordinates: ${Number(report.latitude).toFixed(6)}, ${Number(report.longitude).toFixed(6)}`, margin, y); y += 6;
    doc.text(`Severity: ${report.severity}`, margin, y); y += 6;
    doc.text(`Status: ${report.status?.replace('_', ' ')}`, margin, y); y += 6;
    doc.text(`Community Confirmations: ${Math.round(report.upvotes || 0)}`, margin, y); y += 6;

    if (report.description) {
      y += 2;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      y = wrapText(doc, `Description: ${report.description}`, margin, y, contentWidth, 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
    }
    y += 4;

    // Key proof statement
    const reportedBefore = report.created_date && damage.damage_date
      ? new Date(report.created_date) <= new Date(damage.damage_date)
      : true;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    if (reportedBefore) {
      doc.setTextColor(34, 139, 34);
      doc.text('This pothole was reported BEFORE the damage occurred.', margin, y);
      y += 6;
      doc.text('The jurisdiction was on notice and may be liable for damages.', margin, y);
    } else {
      doc.setTextColor(200, 50, 50);
      doc.text('Note: The pothole was reported AFTER the damage occurred.', margin, y);
    }
    y += 10;

    // ── Section: Jurisdiction ──
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Responsible Jurisdiction', margin, y);
    y += 8;

    doc.setDrawColor(249, 115, 22);
    doc.line(margin, y, margin + contentWidth, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(`Authority: ${report.jurisdiction_name || 'Unknown'}`, margin, y); y += 6;
    doc.text(`Type: ${report.jurisdiction_type || 'Unknown'}`, margin, y); y += 6;
    doc.text(`Phone: ${report.jurisdiction_phone || 'N/A'}`, margin, y); y += 6;
    doc.text(`Website: ${report.jurisdiction_website || 'N/A'}`, margin, y); y += 6;
    doc.text(`Email: ${report.submission_email || 'N/A'}`, margin, y); y += 12;

    // ── Section: Vehicle Damage ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text('Vehicle Damage Details', margin, y);
    y += 8;

    doc.setDrawColor(249, 115, 22);
    doc.line(margin, y, margin + contentWidth, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(`Date of Damage: ${formatDate(damage.damage_date || damage.created_date)}`, margin, y); y += 6;
    doc.text(`Damage Type: ${damage.damage_type}`, margin, y); y += 6;
    doc.text(`Estimated Repair Cost: $${Number(damage.cost_estimate).toFixed(2)}`, margin, y); y += 6;

    if (damage.description) {
      y += 2;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      y = wrapText(doc, `Damage Description: ${damage.description}`, margin, y, contentWidth, 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
    }
    y += 12;

    // ── Section: Filing Instructions ──
    if (y > 220) { doc.addPage(); y = margin; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text('How to File Your Claim', margin, y);
    y += 8;

    doc.setDrawColor(249, 115, 22);
    doc.line(margin, y, margin + contentWidth, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);

    const instructions = [
      '1. Print or save this packet as your evidence.',
      '2. Contact the jurisdiction listed above to obtain their official claim form.',
      '3. Attach this packet to their form as supporting documentation.',
      '4. Include receipts/estimates for all repair work.',
      '5. File within the jurisdiction\'s claim window (typically 30-180 days).',
      '',
      `The timestamped report (${formatDate(report.created_date)}) proves the jurisdiction${reportedBefore ? ' was on notice before your damage occurred, strengthening your claim.' : ' may still accept your claim — check local policies.'}`,
    ];
    instructions.forEach((line) => {
      if (!line) { y += 4; return; }
      y = wrapText(doc, line, margin, y, contentWidth, 5);
    });
    y += 12;

    // ── Footer ──
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    y = wrapText(doc, 'This document was generated by PotholePing, a crowdsourced road hazard reporting platform. It serves as a timestamped record and is not a substitute for legal advice.', margin, y, contentWidth, 4);

    // ── Output as base64 (chunked to avoid stack overflow) ──
    const pdfBytes = doc.output('arraybuffer');
    const bytes = new Uint8Array(pdfBytes);
    let base64 = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      base64 += String.fromCharCode.apply(null, chunk);
    }
    base64 = btoa(base64);

    return Response.json({ pdf_base64: base64, filename: `pothole-damage-claim-${reportId.slice(0, 8)}.pdf` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});