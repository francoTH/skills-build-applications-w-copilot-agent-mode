import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = { _id?: string; name: string; mascot?: string; members?: string[] };
type TeamState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; teams: Team[] };

export default function Teams() {
  const [state, setState] = useState<TeamState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then(({ teams }) => {
        if (active) setState({ status: 'success', teams });
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
        <h2 className="h4">Teams</h2>
        <p>Manage teams and members.</p>
        {state.status === 'loading' && <p role="status">Loading teams...</p>}
        {state.status === 'error' && <p role="alert">Unable to load teams.</p>}
        {state.status === 'success' && state.teams.length === 0 && <p>No teams found.</p>}
        {state.status === 'success' && state.teams.length > 0 && (
          <ul className="list-group list-group-flush">
            {state.teams.map((team) => (
              <li className="list-group-item" key={team._id ?? team.name}>
                <strong>{team.name}</strong>
                {team.mascot && <span> - {team.mascot}</span>}
                {team.members && <span> ({team.members.join(', ') || 'No members'})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
