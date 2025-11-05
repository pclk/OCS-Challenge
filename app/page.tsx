import ExerciseForm from './components/ExerciseForm';
import Leaderboard from './components/Leaderboard';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-white">
          Exercise Leaderboard
        </h1>
        <ExerciseForm />
        <Leaderboard />
      </div>
    </main>
  );
}

