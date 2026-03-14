const ROW_CLASS = ['', 'lb-gold', 'lb-silver', 'lb-bronze'];

export default function LeaderboardTable({ teams }) {
  if (!teams?.length) {
    return <div className="empty-state"><p>No teams on the board yet.</p></div>;
  }

  return (
    <div className="lb-table-wrap">
      <table className="lb-table">
        <thead>
          <tr>
            <th style={{ width: 64 }}>Rank</th>
            <th>Team</th>
            <th style={{ width: 100 }}>Score</th>
            <th style={{ width: 120 }}>Last Solve</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr key={team.id} className={ROW_CLASS[team.rank] || ''}>
              <td className="lb-rank">#{team.rank}</td>
              <td className="lb-team">{team.teamName}</td>
              <td className="lb-score">{team.score.toLocaleString()}</td>
              <td className="lb-time">
                {team.lastSolveTime
                  ? new Date(team.lastSolveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '\u2014'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
