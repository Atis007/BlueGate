import { useSupabaseSession } from '../hooks/useSupabaseSession';
import './Dashboard.css';

export default function TeacherDashboard() {
  const { userProfile } = useSupabaseSession();

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Tanári Felület</h1>
        <p className="welcome-text">
          Üdvözöljük, <strong>{userProfile?.name}</strong>!
        </p>
      </div>

      <div className="dashboard-content">
        <div className="info-card">
          <h2>Jelenlét Nyilvántartás</h2>
          <p>A tanári felületen megtekintheti a diákok jelenlétét.</p>
        </div>

        <div className="info-card">
          <h2>Hamarosan...</h2>
          <p>További funkciók fejlesztés alatt állnak.</p>
        </div>
      </div>
    </div>
  );
}
