import { useEffect, useState } from 'react';
import { Droplets, Sun, Heart } from 'lucide-react';
import { Employee } from '../lib/supabase';

interface MotivationScreenProps {
  employee: Employee;
  onReady: () => void;
}

export default function MotivationScreen({ employee, onReady }: MotivationScreenProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleContinue = () => {
    onReady();
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const tips = [
    'Break large tasks into small steps.',
    'Take a short walk during breaks.',
    'Celebrate small wins throughout the day.',
    'Focus on one task at a time.',
    'Stay hydrated — it boosts focus!',
  ];
  const tip = tips[Math.floor(Math.random() * tips.length)];

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-pink-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-rose-100 rounded-full opacity-40 blur-3xl" />
      </div>

      <div
        className={`relative w-full max-w-md text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        {/* Sun icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-pink-300 to-rose-400 rounded-full shadow-xl mb-6">
          <Sun className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {greeting}, {employee.employee_name.split(' ')[0]}! &#128522;
        </h1>
        <p className="text-lg text-pink-500 font-medium mb-6">Have a good day!</p>

        {/* Water reminder card */}
        <div className="bg-white rounded-2xl shadow-md border border-pink-100 p-5 mb-6 flex items-center gap-4 text-left">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <Droplets className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-700">Don't forget to drink water!</p>
            <p className="text-sm text-gray-400">You'll get hourly reminders to stay hydrated.</p>
          </div>
        </div>

        {/* Tip card */}
        <div className="bg-white rounded-2xl shadow-md border border-pink-100 p-5 mb-8 flex items-center gap-4 text-left">
          <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center shrink-0">
            <Heart className="w-6 h-6 text-pink-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-700">Tip of the Day</p>
            <p className="text-sm text-gray-400">{tip}</p>
          </div>
        </div>

        <button
          onClick={handleContinue}
          className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
        >
          Start My Day
        </button>
      </div>
    </div>
  );
}
