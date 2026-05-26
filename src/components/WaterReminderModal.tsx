import { Droplets } from 'lucide-react';

interface WaterReminderModalProps {
  onDismiss: () => void;
}

export default function WaterReminderModal({ onDismiss }: WaterReminderModalProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-blue-100 p-8 max-w-xs w-full text-center animate-[pop_0.3s_ease-out]">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Droplets className="w-9 h-9 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Hydration Reminder</h2>
        <p className="text-gray-500 text-sm mb-6">
          Please have some water &#128167; Stay hydrated for peak performance!
        </p>
        <button
          onClick={onDismiss}
          className="w-full bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold py-3 rounded-xl shadow transition-all"
        >
          OK, Thanks!
        </button>
      </div>
    </div>
  );
}
