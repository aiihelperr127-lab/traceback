import { Link } from 'react-router-dom';

export default function ChallengeCard({ challenge }) {
  const { id, title, category, difficulty, points, solveCount } = challenge;

  return (
    <Link to={`/challenges/${id}`} className="card card-glow challenge-card">
      <div className="challenge-card-top">
        <span className={`badge badge-${difficulty}`}>{difficulty}</span>
        <span className="challenge-card-pts">{points} pts</span>
      </div>
      <h3 className="challenge-card-title">{title}</h3>
      <div className="challenge-card-bottom">
        <span className="challenge-card-cat">{category}</span>
        <span>{solveCount} solve{solveCount !== 1 ? 's' : ''}</span>
      </div>
    </Link>
  );
}
