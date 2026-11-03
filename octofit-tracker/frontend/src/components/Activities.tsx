import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type ActivityRecord = {
  _id?: string;
  type: string;
  minutes: number;
  points: number;
  occurredAt?: string;
};

type ActivityState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; activities: ActivityRecord[] };

export default function Activities() {
  const [state, setState] = useState<ActivityState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ activities: ActivityRecord[] }>('/api/activities')
      .then(({ activities }) => {
        if (active) setState({ status: 'success', activities });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Activities</h2>
        <p>Track student activity minutes and points.</p>
        {state.status === 'loading' && <p role="status">Loading activities...</p>}
        {state.status === 'error' && <p role="alert">Unable to load activities.</p>}
        {state.status === 'success' && state.activities.length === 0 && <p>No activities recorded yet.</p>}
        {state.status === 'success' && state.activities.length > 0 && (
          <ul className="list-group list-group-flush">
            {state.activities.map((activity, index) => (
              <li className="list-group-item" key={activity._id ?? `${activity.type}-${activity.occurredAt ?? index}`}>
                <strong>{activity.type}</strong>: {activity.minutes} minutes, {activity.points} points
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
