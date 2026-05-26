import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface IdleReasonModalProps {
  idleStartTime: number | null;
  onSubmit: (reason: string, wasWorking: boolean) => void;
  onDismiss: () => void;
  countdownSeconds?: number;
  onStepChange?: (step: 'countdown' | 'confirm' | 'details_yes' | 'details_no') => void;
}

type Step = 'countdown' | 'confirm' | 'details_yes' | 'details_no';

export default function IdleReasonModal({ 
  idleStartTime, 
  onSubmit, 
  onDismiss, 
  countdownSeconds = 30,
  onStepChange
}: IdleReasonModalProps) {
  const [step, setStep] = useState<Step>('countdown');

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  const [countdown, setCountdown] = useState(countdownSeconds);
  const [reason, setReason] = useState('');
  const [awayReason, setAwayReason] = useState('Select Reason');

  useEffect(() => {
    if (step === 'countdown') {
      const id = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(id);
            setStep('confirm');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }
  }, [step]);

  const timeString = idleStartTime 
    ? new Date(idleStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    : 'a while ago';

  const handleOverlayClick = () => {
    if (step === 'countdown') {
      onDismiss();
    }
  };

  const handleSubmit = (wasWorking: boolean) => {
    const finalReason = wasWorking 
      ? reason 
      : (awayReason !== 'Select Reason' ? `[${awayReason}] ${reason}` : reason);
    onSubmit(finalReason, wasWorking);
  };

  return (
    <div 
      className="fixed inset-0 bg-white/40 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center"
      onClick={handleOverlayClick}
    >
      <div 
        className="w-full max-w-lg bg-white rounded shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ minHeight: '400px' }}
      >
        {/* Header */}
        <div className="bg-[#eaf4f4] py-4 px-6 flex items-center justify-between border-b border-[#cce3e3]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-emerald-700 font-bold text-lg leading-tight">TimeGuard</h2>
              <p className="text-[#598383] text-[10px] font-semibold">Enterprise Edition</p>
            </div>
          </div>
          <div className="text-[#598383] font-semibold text-sm">
            {new Date().toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', weekday: 'long' })}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-slate-50 relative">
          
          {step === 'countdown' && (
            <div 
              className="flex-1 flex flex-col items-center justify-center p-10 text-center cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={onDismiss}
            >
              <h3 className="text-xl text-slate-700 font-medium mb-12">
                If you are working, please click anywhere on the window.
              </h3>
              <div className="mx-auto w-40 h-40 rounded-full border-[3px] border-dashed border-rose-300 flex items-center justify-center">
                <span className="text-6xl text-slate-700 font-bold">{countdown}</span>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="flex-1 flex flex-col">
              <div className="text-center py-4 border-b border-slate-100">
                <h3 className="text-xl font-medium text-emerald-700">Idle Time Alert</h3>
              </div>
              <div className="p-10 text-center flex-1 flex flex-col justify-center">
                <p className="text-lg text-slate-600 mb-10">
                  Your device seems to be inactive from {timeString}, please confirm
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setStep('details_yes')}
                    className="bg-[#38a392] hover:bg-[#2b8676] text-white py-12 rounded transition flex flex-col items-center justify-center gap-2"
                  >
                    <span className="text-4xl font-light">YES</span>
                    <span className="text-sm opacity-90">I was working</span>
                  </button>
                  <button 
                    onClick={() => setStep('details_no')}
                    className="bg-[#cfcfcf] hover:bg-[#b0b0b0] text-white py-12 rounded transition flex flex-col items-center justify-center gap-2"
                  >
                    <span className="text-4xl font-light">NO</span>
                    <span className="text-sm opacity-90">I took a break</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'details_yes' && (
            <div className="flex-1 flex flex-col">
              <div className="text-center py-4 border-b border-slate-100">
                <h3 className="text-xl font-medium text-emerald-700">Idle Time Alert</h3>
              </div>
              <div className="p-8 flex-1 flex flex-col">
                <p className="text-lg text-slate-600 mb-6 text-center">
                  Your device seems to be inactive from {timeString}, please confirm
                </p>
                
                <div className="mb-6 flex-1">
                  <label className="block text-sm text-slate-600 mb-2">Describe your activity in detail:</label>
                  <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full border border-emerald-600 rounded p-3 h-24 outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
                  />
                </div>

                <div className="flex items-end justify-between mt-auto">
                  <button 
                    onClick={() => setStep('details_no')}
                    className="text-slate-500 hover:text-slate-700 text-sm pb-1"
                  >
                    No, I was not working
                  </button>
                  <button 
                    onClick={() => handleSubmit(true)}
                    className="bg-[#38a392] hover:bg-[#2b8676] text-white px-8 py-2 rounded font-medium transition"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'details_no' && (
            <div className="flex-1 flex flex-col">
              <div className="text-center py-4 border-b border-slate-100">
                <h3 className="text-xl font-medium text-emerald-700">Idle Time Alert</h3>
              </div>
              <div className="p-8 flex-1 flex flex-col">
                <p className="text-lg text-slate-600 mb-6 text-center">
                  Your device seems to be inactive from {timeString}, please confirm
                </p>
                
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-sm text-slate-600">I was away for</span>
                  <select 
                    value={awayReason}
                    onChange={(e) => setAwayReason(e.target.value)}
                    className="border border-slate-300 rounded px-3 py-1.5 outline-none focus:border-emerald-500 flex-1 bg-white"
                  >
                    <option>Select Reason</option>
                    <option>Meeting</option>
                    <option>Break</option>
                    <option>Lunch</option>
                    <option>Call</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="mb-6 flex-1">
                  <label className="block text-sm text-slate-600 mb-2">Describe your activity in detail:</label>
                  <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full border border-emerald-600 rounded p-3 h-24 outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
                  />
                </div>

                <div className="flex items-end justify-between mt-auto">
                  <button 
                    onClick={() => setStep('details_yes')}
                    className="text-slate-500 hover:text-slate-700 text-sm pb-1"
                  >
                    Yes, I was working
                  </button>
                  <button 
                    onClick={() => handleSubmit(false)}
                    className="bg-[#38a392] hover:bg-[#2b8676] text-white px-8 py-2 rounded font-medium transition"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
