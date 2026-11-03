import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Workout = { _id?: string; title: string; focus?: string; minutes?: number; difficulty?: string; reason?: string };
type WorkoutState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; suggestions: Workout[] };

const userEmail = 'mona@example.com';

export default function Workouts() {
  const [state, setState] = useState<WorkoutState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ suggestions: Workout[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
      .then(({ suggestions }) => {
        if (active) setState({ status: 'success', suggestions });
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
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        {state.status === 'loading' && <p role="status">Loading workout suggestions...</p>}
        {state.status === 'error' && <p role="alert">Unable to load workout suggestions.</p>}
        {state.status === 'success' && state.suggestions.length === 0 && <p>No workout suggestions found.</p>}
        {state.status === 'success' && state.suggestions.length > 0 && (
          <ul className="list-group list-group-flush">
            {state.suggestions.map((workout) => (
              <li className="list-group-item" key={workout._id ?? workout.title}>
                <strong>{workout.title}</strong>
                {workout.focus && <span> - {workout.focus}</span>}
                {workout.minutes !== undefined && <span> - {workout.minutes} minutes</span>}
                {workout.difficulty && <span> - {workout.difficulty}</span>}
                {workout.reason && <p className="mb-0">{workout.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
