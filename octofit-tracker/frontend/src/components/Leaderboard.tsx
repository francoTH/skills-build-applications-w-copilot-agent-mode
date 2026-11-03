import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };
type LeaderboardState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; leaderboard: LeaderboardEntry[] };

export default function Leaderboard() {
  const [state, setState] = useState<LeaderboardState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')
      .then(({ leaderboard }) => {
        if (active) setState({ status: 'success', leaderboard });
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
        <h2 className="h4">Leaderboard</h2>
        <p>Compare team point totals.</p>
        {state.status === 'loading' && <p role="status">Loading leaderboard...</p>}
        {state.status === 'error' && <p role="alert">Unable to load leaderboard.</p>}
        {state.status === 'success' && state.leaderboard.length === 0 && <p>No leaderboard scores yet.</p>}
        {state.status === 'success' && state.leaderboard.length > 0 && (
          <ol className="list-group list-group-numbered list-group-flush">
            {state.leaderboard.map((entry) => (
              <li className="list-group-item" key={`${entry.rank}-${entry.teamName}`}>
                <strong>{entry.teamName}</strong>: {entry.totalPoints} points
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
