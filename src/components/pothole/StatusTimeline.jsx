import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';

const statusConfig = {
  reported: { label: 'Reported', dot: 'bg-red-500', line: 'bg-red-300' },
  acknowledged: { label: 'Acknowledged', dot: 'bg-yellow-500', line: 'bg-yellow-300' },
  in_progress: { label: 'In Progress', dot: 'bg-blue-500', line: 'bg-blue-300' },
  fixed: { label: 'Fixed', dot: 'bg-green-500', line: 'bg-green-300' },
  disputed: { label: 'Disputed — still there', dot: 'bg-purple-500', line: 'bg-purple-300' },
};

export default function StatusTimeline({ pothole }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.PotholeStatusEvent
      .filter({ pothole_id: pothole.id }, 'created_date')
      .then((data) => {
        if (data.length === 0 && pothole.created_date) {
          setEvents([{ status: 'reported', note: 'Initially reported', created_date: pothole.created_date }]);
        } else {
          setEvents(data);
        }
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [pothole.id]);

  if (loading || events.length === 0) return null;

  return (
    <div className="border-t pt-4">
      <h3 className="font-heading font-semibold text-sm mb-3">Timeline</h3>
      <div>
        {events.map((event, i) => {
          const config = statusConfig[event.status] || statusConfig.reported;
          const isLast = i === events.length - 1;
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${config.dot} flex-shrink-0 mt-1`} />
                {!isLast && <div className={`w-0.5 flex-1 ${config.line} min-h-[24px]`} />}
              </div>
              <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
                <p className="text-sm font-medium">{config.label}</p>
                {event.note && <p className="text-xs text-muted-foreground">{event.note}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(event.created_date), { addSuffix: true })}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}