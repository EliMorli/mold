import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, 
  Edit2,
  Check,
  X,
  Wrench,
  Mail,
  Phone,
  Award,
  Star,
  FlaskConical,
  DollarSign,
  Calendar,
  TrendingUp,
  Plus,
  Wallet,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import ExpenseModal from "../components/expenses/ExpenseModal";

export default function TechnicianProfilePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const techId = urlParams.get('id');
  const [isEditing, setIsEditing] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);

  const queryClient = useQueryClient();

  const { data: technician, isLoading } = useQuery({
    queryKey: ['technician', techId],
    queryFn: async () => {
      const techs = await base44.entities.Technician.list();
      return techs.find(t => t.id === techId);
    },
    enabled: !!techId,
  });

  const { data: allTests = [] } = useQuery({
    queryKey: ['tests'],
    queryFn: () => base44.entities.Test.list('-created_date'),
    initialData: [],
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date'),
    initialData: [],
  });

  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (technician) {
      setFormData(technician);
    }
  }, [technician]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Technician.update(techId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['technician', techId]);
      queryClient.invalidateQueries(['technicians']);
      setIsEditing(false);
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      setShowPayrollModal(false);
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  // Filter data for this technician
  const techTests = allTests.filter(test => test.technician_id === techId);
  const techPayroll = allExpenses.filter(exp => 
    exp.category === 'Salaries' && exp.technician_id === techId
  );

  // Calculate stats
  const totalTests = techTests.length;
  const completedTests = techTests.filter(t => t.status === 'Completed').length;
  const totalRevenue = techTests.reduce((sum, test) => sum + (test.cost || 0), 0);
  const totalPayroll = techPayroll.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  // Calculate current week stats
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
  endOfWeek.setHours(23, 59, 59, 999);

  const thisWeekTests = techTests.filter(test => {
    if (!test.completed_date) return false;
    const testDate = new Date(test.completed_date);
    return testDate >= startOfWeek && testDate <= endOfWeek;
  });

  const thisWeekEarnings = thisWeekTests.reduce((sum, test) => sum + (test.cost || 0), 0);
  const thisWeekTestCount = thisWeekTests.length;

  const statusColors = {
    'Scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
    'In Progress': 'bg-purple-100 text-purple-700 border-purple-200',
    'Lab Analysis': 'bg-orange-100 text-orange-700 border-orange-200',
    'Completed': 'bg-green-100 text-green-700 border-green-200',
    'Cancelled': 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="clay-card rounded-3xl p-8">
          <p className="text-gray-600">Loading technician profile...</p>
        </div>
      </div>
    );
  }

  if (!technician) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="clay-card rounded-3xl p-8 text-center">
          <p className="text-gray-600 mb-4">Technician not found</p>
          <Button
            onClick={() => window.location.href = createPageUrl('Technicians')}
            className="clay-button rounded-2xl px-6 py-3"
          >
            Back to Technicians
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = createPageUrl('Technicians')}
              className="clay-button rounded-2xl p-3 hover:scale-110 transition-transform"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center shadow-inner">
                <Wrench className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">{formData.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-semibold text-gray-600">{formData.rating || 5.0}</span>
                  {formData.certification && (
                    <>
                      <span className="text-gray-400">•</span>
                      <Award className="w-4 h-4 text-orange-400" />
                      <span className="text-sm text-gray-600">{formData.certification}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-orange-600 hover:scale-105"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setFormData(technician);
                    setIsEditing(false);
                  }}
                  className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-medium text-gray-600"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-green-600 hover:scale-105"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center shadow-inner">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Tests</p>
              <p className="text-2xl font-bold text-gray-800">{totalTests}</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center shadow-inner">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-800">{completedTests}</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center shadow-inner">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Payroll</p>
              <p className="text-2xl font-bold text-gray-800">${totalPayroll.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400 to-red-400 flex items-center justify-center shadow-inner">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Week</p>
              <p className="text-2xl font-bold text-gray-800">{thisWeekTestCount} tests</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Tech Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Contact Information */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-orange-600 mb-4">Contact Information</h3>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger className="clay-button rounded-2xl border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4 text-orange-400" />
                  <span className="text-sm">{formData.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4 text-pink-400" />
                  <span className="text-sm">{formData.phone}</span>
                </div>
                <div className="pt-2">
                  <Badge className={`${
                    formData.status === 'Active' ? 'bg-green-100 text-green-700' :
                    formData.status === 'On Leave' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  } rounded-xl px-3 py-1`}>
                    {formData.status}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Certification */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-blue-600 mb-4">Certification</h3>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Certification</Label>
                  <Input
                    value={formData.certification}
                    onChange={(e) => setFormData({...formData, certification: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Expiry Date</Label>
                  <Input
                    type="date"
                    value={formData.certification_expiry}
                    onChange={(e) => setFormData({...formData, certification_expiry: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Rating</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({...formData, rating: parseFloat(e.target.value) || 5})}
                    className="clay-button rounded-2xl border-0"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Certification</p>
                  <p className="text-gray-700 font-medium">{formData.certification || 'N/A'}</p>
                </div>
                {formData.certification_expiry && (
                  <div>
                    <p className="text-sm text-gray-500">Expiry Date</p>
                    <p className="text-gray-700">{formatDate(formData.certification_expiry)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Rating</p>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-lg font-bold text-gray-800">{formData.rating || 5.0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-green-600 mb-4">Notes</h3>
            {isEditing ? (
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="clay-button rounded-2xl border-0 min-h-[120px]"
                placeholder="Additional notes..."
              />
            ) : (
              <p className="text-gray-700 text-sm whitespace-pre-wrap">
                {formData.notes || <span className="text-gray-400 italic">No notes</span>}
              </p>
            )}
          </div>
        </div>

        {/* Right Column - Tests & Payroll */}
        <div className="lg:col-span-2 space-y-6">
          {/* This Week Summary */}
          <div className="clay-card rounded-3xl p-6 bg-gradient-to-br from-purple-50 to-blue-50">
            <h3 className="text-lg font-bold text-purple-700 mb-4">This Week Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="clay-button rounded-2xl p-4">
                <p className="text-sm text-gray-500 mb-1">Tests Completed</p>
                <p className="text-3xl font-bold text-gray-800">{thisWeekTestCount}</p>
              </div>
              <div className="clay-button rounded-2xl p-4">
                <p className="text-sm text-gray-500 mb-1">Estimated Earnings</p>
                <p className="text-3xl font-bold text-gray-800">${thisWeekEarnings.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Payroll History */}
          <div className="clay-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-pink-600 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Payroll History ({techPayroll.length})
              </h3>
              <Button
                onClick={() => setShowPayrollModal(true)}
                className="clay-button rounded-2xl px-4 py-2 flex items-center gap-2 text-sm font-semibold text-pink-600 hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                Add Payment
              </Button>
            </div>
            
            {techPayroll.length > 0 ? (
              <div className="space-y-3">
                {techPayroll.slice(0, 10).map((payroll) => (
                  <div key={payroll.id} className="clay-button rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{payroll.pay_period_label || 'Payment'}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDate(payroll.payroll_start_date)} - {formatDate(payroll.payroll_end_date)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Paid: {formatDate(payroll.payment_date)} • {payroll.payment_method}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-800">${payroll.amount.toLocaleString()}</p>
                        <Badge className={`${
                          payroll.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        } rounded-lg px-2 py-0.5 text-xs mt-1`}>
                          {payroll.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No payroll records yet</p>
              </div>
            )}
          </div>

          {/* Jobs History */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-purple-600 mb-4">Jobs History ({totalTests} total)</h3>
            {techTests.length > 0 ? (
              <div className="space-y-3">
                {techTests.map((test) => (
                  <div
                    key={test.id}
                    onClick={() => window.location.href = `${createPageUrl('TestProfile')}?id=${test.id}`}
                    className="clay-button rounded-2xl p-4 cursor-pointer hover:scale-[1.01] transition-transform"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center shadow-inner">
                          <FlaskConical className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">{test.test_number}</h4>
                          <p className="text-sm text-gray-500">{test.test_type}</p>
                        </div>
                      </div>
                      <Badge className={`${statusColors[test.status]} border rounded-xl px-3 py-1 font-medium text-xs`}>
                        {test.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-3 h-3 text-blue-400" />
                        <span className="truncate">{test.property_address}</span>
                      </div>
                      {test.scheduled_date && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-3 h-3 text-pink-400" />
                          <span className="truncate">{formatDateTime(test.scheduled_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FlaskConical className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No jobs assigned yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payroll Modal */}
      {showPayrollModal && (
        <ExpenseModal
          expense={{
            category: 'Salaries',
            technician_id: techId,
            technician_name: formData.name,
            status: 'Paid'
          }}
          onClose={() => setShowPayrollModal(false)}
          onSave={(data) => createExpenseMutation.mutate(data)}
          saving={createExpenseMutation.isPending}
        />
      )}
    </div>
  );
}