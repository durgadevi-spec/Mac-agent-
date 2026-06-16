import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  MapPin,
} from 'lucide-react';
import {
  getTodayCallLogs,
  getTodayCallStats,
  getTodayFieldVisits,
  getLatestFieldLocation,
  formatDuration,
  CallLog,
  FieldVisit,
  FieldLocation,
} from '../lib/mobileSync';

interface MobileSyncProps {
  employeeId: string;
}

const MobileSyncWidget: React.FC<MobileSyncProps> = ({ employeeId }) => {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [callStats, setCallStats] = useState<any>(null);
  const [fieldVisits, setFieldVisits] = useState<FieldVisit[]>([]);
  const [currentLocation, setCurrentLocation] = useState<FieldLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calls' | 'field'>('calls');

  useEffect(() => {
    loadMobileData();
    // Refresh every 30 seconds
    const interval = setInterval(loadMobileData, 30000);
    return () => clearInterval(interval);
  }, [employeeId]);

  const loadMobileData = async () => {
    try {
      setLoading(true);
      const [calls, stats, visits, location] = await Promise.all([
        getTodayCallLogs(employeeId),
        getTodayCallStats(employeeId),
        getTodayFieldVisits(employeeId),
        getLatestFieldLocation(employeeId),
      ]);

      setCallLogs(calls);
      setCallStats(stats);
      setFieldVisits(visits);
      setCurrentLocation(location);
    } catch (err) {
      console.error('[MobileSyncWidget] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCallIcon = (type: string) => {
    switch (type) {
      case 'incoming':
        return <PhoneIncoming className="w-4 h-4 text-blue-500" />;
      case 'outgoing':
        return <Phone className="w-4 h-4 text-green-500" />;
      case 'missed':
        return <PhoneOff className="w-4 h-4 text-red-500" />;
      default:
        return <Phone className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCallTypeLabel = (type: string) => {
    switch (type) {
      case 'incoming':
        return 'Incoming';
      case 'outgoing':
        return 'Outgoing';
      case 'missed':
        return 'Missed';
      default:
        return type;
    }
  };

  if (loading && !callStats) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin">
            <Phone className="w-6 h-6 text-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 text-white p-2 rounded-lg">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Mobile Activity</h3>
              <p className="text-xs text-slate-600">Real-time call & field tracking</p>
            </div>
          </div>
          <button
            onClick={loadMobileData}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {callStats && (
        <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div>
            <p className="text-xs text-slate-600 mb-1">Total Calls</p>
            <p className="text-2xl font-bold text-slate-900">{callStats.totalCalls}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Incoming</p>
            <p className="text-2xl font-bold text-blue-600">{callStats.incoming}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Outgoing</p>
            <p className="text-2xl font-bold text-green-600">{callStats.outgoing}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Total Duration</p>
            <p className="text-lg font-bold text-slate-900">{formatDuration(callStats.totalDuration)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white">
        <button
          onClick={() => setActiveTab('calls')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition ${
            activeTab === 'calls'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Call Logs ({callLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('field')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition ${
            activeTab === 'field'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Field Activity ({fieldVisits.length})
        </button>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'calls' ? (
          <div className="divide-y divide-slate-200">
            {callLogs.length === 0 ? (
              <div className="p-6 text-center">
                <Phone className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No calls tracked today</p>
              </div>
            ) : (
              callLogs.slice(0, 20).map(log => (
                <div
                  key={log.id}
                  className="px-6 py-3 hover:bg-slate-50 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getCallIcon(log.call_type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {log.contact_name || log.phone_number || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-600">
                        {getCallTypeLabel(log.call_type)} •{' '}
                        {new Date(log.call_start).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {formatDuration(log.duration_seconds)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {currentLocation && (
              <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-200">
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-500 text-white p-2 rounded-lg mt-1">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Current Location</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Lat: {currentLocation.lat.toFixed(4)}, Lng: {currentLocation.lng.toFixed(4)}
                    </p>
                    <p className="text-xs text-slate-600">
                      Accuracy: ±{Math.round(currentLocation.accuracy || 0)}m
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(currentLocation.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {fieldVisits.length === 0 ? (
              <div className="p-6 text-center">
                <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No field visits tracked today</p>
              </div>
            ) : (
              fieldVisits.slice(0, 10).map(visit => (
                <div key={visit.id} className="px-6 py-3 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{visit.client_name}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        Started:{' '}
                        {new Date(visit.start_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {visit.end_time && (
                        <p className="text-xs text-slate-600">
                          Ended:{' '}
                          {new Date(visit.end_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Status:{' '}
                        <span
                          className={`font-medium ${
                            visit.status === 'ongoing' ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {visit.status}
                        </span>
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                      <div className="flex gap-1 mt-2">
                        {visit.end_time && (
                          <span className="px-2 py-1 bg-slate-200 rounded">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default MobileSyncWidget;
