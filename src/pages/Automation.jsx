import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Zap, Clock, Send, Bell, CheckCircle, AlertCircle, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AutomationPage() {
  const [runningJobs, setRunningJobs] = useState({});

  const automations = [
    {
      id: 'invoice-reminders',
      name: 'Invoice Payment Reminders',
      description: 'Automatically send payment reminders for outstanding invoices based on due dates',
      icon: Send,
      color: 'green',
      schedule: 'Daily at 9:00 AM',
      function: 'sendInvoiceReminders',
      enabled: true
    },
    {
      id: 'appointment-reminders',
      name: 'Test Appointment Reminders',
      description: 'Send reminders to clients 24 hours and 1 hour before scheduled tests',
      icon: Bell,
      color: 'blue',
      schedule: 'Hourly',
      function: 'sendAppointmentReminders',
      enabled: true
    },
    {
      id: 'auto-invoices',
      name: 'Auto-Generate Invoices',
      description: 'Automatically create invoices when tests are completed',
      icon: CheckCircle,
      color: 'purple',
      schedule: 'Triggered on test completion',
      function: 'autoGenerateInvoice',
      enabled: true
    },
    {
      id: 'document-expiry',
      name: 'Document Expiry Notifications',
      description: 'Send email alerts for documents approaching expiration dates',
      icon: AlertCircle,
      color: 'orange',
      schedule: 'Daily at 8:00 AM',
      function: 'notifyExpiringDocuments',
      enabled: true
    }
  ];

  const runAutomationMutation = useMutation({
    mutationFn: async (functionName) => {
      const response = await base44.functions.invoke(functionName, {});
      return response.data;
    },
    onSuccess: (data, functionName) => {
      setRunningJobs(prev => ({ ...prev, [functionName]: 'success' }));
      setTimeout(() => {
        setRunningJobs(prev => {
          const updated = { ...prev };
          delete updated[functionName];
          return updated;
        });
      }, 3000);
    },
    onError: (error, functionName) => {
      setRunningJobs(prev => ({ ...prev, [functionName]: 'error' }));
      setTimeout(() => {
        setRunningJobs(prev => {
          const updated = { ...prev };
          delete updated[functionName];
          return updated;
        });
      }, 3000);
    }
  });

  const handleRunNow = (automation) => {
    setRunningJobs(prev => ({ ...prev, [automation.function]: 'running' }));
    runAutomationMutation.mutate(automation.function);
  };

  const getJobStatus = (functionName) => {
    return runningJobs[functionName] || null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center shadow-inner">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-500 bg-clip-text text-transparent">
              Automation Center
            </h1>
            <p className="text-gray-500 mt-1">Manage automated workflows and scheduled tasks</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="clay-card rounded-3xl p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-blue-800 mb-2">Automated Scheduling</h3>
            <p className="text-sm text-blue-700 mb-3">
              These automations run automatically on their configured schedules. You can manually trigger them anytime using the &quot;Run Now&quot; button for testing or immediate execution.
            </p>
            <div className="clay-button rounded-2xl p-3 bg-white inline-block">
              <p className="text-xs text-gray-600">
                <strong>Note:</strong> Invoice reminders check daily for invoices that need reminders (3 days before due, 1 day after, 7 days after). Appointment reminders run hourly to catch upcoming tests.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Automation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {automations.map((automation) => {
          const status = getJobStatus(automation.function);
          const Icon = automation.icon;
          
          return (
            <div key={automation.id} className="clay-card rounded-3xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${automation.color}-400 to-${automation.color}-500 flex items-center justify-center shadow-inner`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{automation.name}</h3>
                    <Badge className={`${automation.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'} rounded-lg px-2 py-0.5 text-xs mt-1`}>
                      {automation.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
                {status && (
                  <div>
                    {status === 'running' && (
                      <Badge className="bg-blue-100 text-blue-700 rounded-full px-3 py-1 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Running
                      </Badge>
                    )}
                    {status === 'success' && (
                      <Badge className="bg-green-100 text-green-700 rounded-full px-3 py-1 flex items-center gap-2">
                        <CheckCircle className="w-3 h-3" />
                        Success
                      </Badge>
                    )}
                    {status === 'error' && (
                      <Badge className="bg-red-100 text-red-700 rounded-full px-3 py-1 flex items-center gap-2">
                        <AlertCircle className="w-3 h-3" />
                        Failed
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-4">{automation.description}</p>

              <div className="clay-button rounded-2xl p-3 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-700">
                    <strong>Schedule:</strong> {automation.schedule}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => handleRunNow(automation)}
                disabled={!automation.enabled || status === 'running'}
                className="w-full clay-button rounded-2xl px-6 py-3 flex items-center justify-center gap-2 font-semibold text-blue-600 hover:scale-[1.02]"
              >
                {status === 'running' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Run Now
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* How It Works */}
      <div className="clay-card rounded-3xl p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">How Automations Work</h3>
        <div className="space-y-4">
          <div className="clay-button rounded-2xl p-4">
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Send className="w-4 h-4 text-green-600" />
              Invoice Payment Reminders
            </h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-6 list-disc">
              <li>Sends reminder 3 days before invoice due date</li>
              <li>Sends first reminder 1 day after due date if unpaid</li>
              <li>Sends second reminder 7 days after due date if still unpaid</li>
              <li>Tracks reminder history to avoid duplicate sends</li>
              <li>Uses customizable email templates from Settings</li>
            </ul>
          </div>

          <div className="clay-button rounded-2xl p-4">
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              Test Appointment Reminders
            </h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-6 list-disc">
              <li>Sends reminder 24 hours before scheduled test</li>
              <li>Sends reminder 1 hour before scheduled test</li>
              <li>Includes test details and access instructions</li>
              <li>Prevents duplicate reminders for same time slot</li>
            </ul>
          </div>

          <div className="clay-button rounded-2xl p-4">
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              Auto-Generate Invoices
            </h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-6 list-disc">
              <li>Automatically creates draft invoice when test is scheduled</li>
              <li>Calculates tax based on app settings</li>
              <li>Links invoice to test and client</li>
              <li>Sets scheduled send time for 2 hours after test appointment</li>
            </ul>
          </div>

          <div className="clay-button rounded-2xl p-4">
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              Document Expiry Notifications
            </h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-6 list-disc">
              <li>Checks all documents daily for upcoming expiration dates</li>
              <li>Sends email alerts based on configured alert days (default 30 days)</li>
              <li>Updates document status to &quot;Pending Renewal&quot; or &quot;Expired&quot;</li>
              <li>Includes document details and issuing authority in notifications</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}