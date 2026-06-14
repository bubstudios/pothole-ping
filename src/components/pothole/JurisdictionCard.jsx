import React from 'react';
import { Phone, Building2, Info, Mail, Globe } from 'lucide-react';

const typeColors = {
  city: 'bg-blue-50 border-blue-200 text-blue-800',
  county: 'bg-purple-50 border-purple-200 text-purple-800',
  state: 'bg-green-50 border-green-200 text-green-800',
  federal: 'bg-red-50 border-red-200 text-red-800',
  unknown: 'bg-gray-50 border-gray-200 text-gray-800',
};

const typeLabels = {
  city: 'City',
  county: 'County',
  state: 'State Highway',
  federal: 'Federal',
  unknown: 'Unknown',
};

function buildEmailBody(report) {
  const lines = [
    'Pothole Report',
    '',
    `📍 Address: ${report.address || 'Unknown'}`,
    `🌐 Coordinates: ${report.latitude}, ${report.longitude}`,
    `⚠️ Severity: ${report.severity || 'Unknown'}`,
  ];
  if (report.description) {
    lines.push(`📝 Description: ${report.description}`);
  }
  if (report.photo_url) {
    lines.push(`📷 Photo: ${report.photo_url}`);
  }
  lines.push(
    '',
    `🔗 View on map: https://www.google.com/maps?q=${report.latitude},${report.longitude}`,
    '',
    `— Sent via PotholePing`
  );
  return encodeURIComponent(lines.join('\n'));
}

export default function JurisdictionCard({ report }) {
  if (!report?.jurisdiction_name) return null;

  const colorClass = typeColors[report.jurisdiction_type] || typeColors.unknown;
  const hasEmail = !!report.submission_email;
  const hasWebsite = !!report.jurisdiction_website;

  return (
    <div className={`rounded-lg border-2 p-4 ${colorClass}`}>
      <div className="flex items-start gap-3">
        <Building2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-heading font-semibold text-sm">
              {report.jurisdiction_name}
            </h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/50 font-medium">
              {typeLabels[report.jurisdiction_type] || 'Unknown'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {report.jurisdiction_phone && (
              <a
                href={`tel:${report.jurisdiction_phone}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white/60 hover:bg-white border border-white/40 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                Call
              </a>
            )}

            {hasEmail && (
              <a
                href={`mailto:${report.submission_email}?subject=${encodeURIComponent('Pothole Report — ' + (report.address || `${report.latitude},${report.longitude}`))}&body=${buildEmailBody(report)}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white/60 hover:bg-white border border-white/40 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                Email Report
              </a>
            )}

            {hasWebsite && (
              <a
                href={report.jurisdiction_website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white/60 hover:bg-white border border-white/40 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                Submit Online
              </a>
            )}
          </div>

          {report.jurisdiction_details && (
            <div className="flex items-start gap-1.5 mt-2 text-xs opacity-80">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <p>{report.jurisdiction_details}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}