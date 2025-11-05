import { getExercises, getLeaderboard } from '@/lib/db';

interface LeaderboardEntry {
  id: number;
  value: number;
  created_at: string;
  user_name: string;
  user_id: number;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export default async function Leaderboard() {
  const exercises = getExercises();
  const leaderboards: Record<string, LeaderboardEntry[]> = {};

  // Fetch leaderboard for each exercise
  for (const exercise of exercises) {
    leaderboards[exercise.name] = getLeaderboard(exercise.id, 10);
  }

  return (
    <div className="space-y-6">
      {exercises.map((exercise) => {
        const entries = leaderboards[exercise.name] || [];
        return (
          <div
            key={exercise.id}
            className="bg-black border border-white/20 rounded-lg shadow-md p-6"
          >
            <h2 className="text-2xl font-bold mb-4 text-white">
              {exercise.name} Leaderboard
            </h2>
            {entries.length === 0 ? (
              <p className="text-white/70">No scores yet. Be the first!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-4 font-semibold text-white">
                        Rank
                      </th>
                      <th className="text-left py-2 px-4 font-semibold text-white">
                        Name
                      </th>
                      <th className="text-right py-2 px-4 font-semibold text-white">
                        {exercise.type === 'seconds' ? 'Seconds' : 'Reps'}
                      </th>
                      <th className="text-right py-2 px-4 font-semibold text-white">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className="border-b border-white/10 hover:bg-white/5"
                      >
                        <td className="py-3 px-4 text-white font-medium">
                          #{index + 1}
                        </td>
                        <td className="py-3 px-4 text-white">
                          {entry.user_name}
                        </td>
                        <td className="py-3 px-4 text-[#ff7301] text-right font-semibold">
                          {entry.value}
                        </td>
                        <td className="py-3 px-4 text-white/70 text-right text-sm">
                          {formatDate(entry.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

