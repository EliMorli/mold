import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, FileText, Upload, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [formData, setFormData] = useState({
    document_name: '',
    document_type: 'Other',
    category: 'Operations',
    file_url: '',
    expiry_date: '',
    issue_date: '',
    issuing_authority: '',
    status: 'Active',
    alert_days_before: 30,
    description: '',
    tags: []
  });

  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Document.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['documents']);
      setShowModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Document.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['documents']);
      setShowModal(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setSelectedDoc(null);
    setFormData({
      document_name: '',
      document_type: 'Other',
      category: 'Operations',
      file_url: '',
      expiry_date: '',
      issue_date: '',
      issuing_authority: '',
      status: 'Active',
      alert_days_before: 30,
      description: '',
      tags: []
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, file_url: data.file_url });
    } catch (error) {
      alert('Failed to upload file');
    }
  };

  // Check for expiring documents
  const getExpiringDocs = () => {
    const today = new Date();
    return documents.filter(doc => {
      if (!doc.expiry_date) return false;
      const expiryDate = new Date(doc.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= (doc.alert_days_before || 30) && daysUntilExpiry >= 0;
    });
  };

  const expiredDocs = documents.filter(doc => {
    if (!doc.expiry_date) return false;
    return new Date(doc.expiry_date) < new Date();
  });

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.document_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterCategory === "All" || doc.category === filterCategory;
    return matchesSearch && matchesFilter;
  });

  const categoryColors = {
    'Legal': 'bg-blue-100 text-blue-700',
    'Financial': 'bg-green-100 text-green-700',
    'Templates': 'bg-purple-100 text-purple-700',
    'Compliance': 'bg-orange-100 text-orange-700',
    'Operations': 'bg-cyan-100 text-cyan-700',
  };

  const statusColors = {
    'Active': 'bg-green-100 text-green-700',
    'Expired': 'bg-red-100 text-red-700',
    'Pending Renewal': 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
              Document Bank
            </h1>
            <p className="text-gray-500 mt-1">{documents.length} total documents</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-blue-600 hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {(expiredDocs.length > 0 || getExpiringDocs().length > 0) && (
        <div className="space-y-3">
          {expiredDocs.length > 0 && (
            <div className="clay-card rounded-3xl p-4 bg-red-50 border-2 border-red-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-bold text-red-800">{expiredDocs.length} Expired Documents</p>
                  <p className="text-sm text-red-600">
                    {expiredDocs.map(d => d.document_name).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}
          {getExpiringDocs().length > 0 && (
            <div className="clay-card rounded-3xl p-4 bg-orange-50 border-2 border-orange-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
                <div>
                  <p className="font-bold text-orange-800">{getExpiringDocs().length} Documents Expiring Soon</p>
                  <p className="text-sm text-orange-600">
                    {getExpiringDocs().map(d => d.document_name).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 clay-button rounded-2xl border-0 h-12 text-gray-700"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {['All', 'Legal', 'Financial', 'Templates', 'Compliance', 'Operations'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-6 py-3 rounded-2xl whitespace-nowrap font-medium transition-all ${
                  filterCategory === cat
                    ? 'clay-nav-active text-blue-700'
                    : 'clay-button text-gray-600 hover:scale-105'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.map((doc) => {
          const isExpiring = getExpiringDocs().some(d => d.id === doc.id);
          const isExpired = expiredDocs.some(d => d.id === doc.id);
          
          return (
            <div
              key={doc.id}
              onClick={() => {
                setSelectedDoc(doc);
                setFormData(doc);
                setShowModal(true);
              }}
              className="clay-card clay-card-hover rounded-3xl p-6 cursor-pointer relative"
            >
              {(isExpiring || isExpired) && (
                <div className="absolute top-4 right-4">
                  <AlertTriangle className={`w-5 h-5 ${isExpired ? 'text-red-600' : 'text-orange-600'}`} />
                </div>
              )}

              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center shadow-inner flex-shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 text-sm truncate">{doc.document_name}</h3>
                  <p className="text-xs text-gray-500 truncate">{doc.document_type}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge className={`${categoryColors[doc.category]} rounded-lg px-2 py-0.5 text-xs`}>
                    {doc.category}
                  </Badge>
                  <Badge className={`${statusColors[doc.status]} rounded-lg px-2 py-0.5 text-xs`}>
                    {doc.status}
                  </Badge>
                </div>

                {doc.expiry_date && (
                  <p className="text-xs text-gray-600">
                    Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                  </p>
                )}

                {doc.issuing_authority && (
                  <p className="text-xs text-gray-500 truncate">
                    Issued by: {doc.issuing_authority}
                  </p>
                )}
              </div>

              {doc.file_url && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-blue-600 text-sm hover:underline"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Document Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="clay-card rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedDoc ? 'Document Details' : 'Upload Document'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="clay-button rounded-2xl p-2 hover:scale-110 transition-transform"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (selectedDoc) {
                updateMutation.mutate({ id: selectedDoc.id, data: formData });
              } else {
                createMutation.mutate(formData);
              }
            }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-gray-700 font-medium mb-2 block">Document Name *</Label>
                  <Input
                    value={formData.document_name}
                    onChange={(e) => setFormData({...formData, document_name: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                    placeholder="Business License"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Type *</Label>
                  <Select value={formData.document_type} onValueChange={(value) => setFormData({...formData, document_type: value})}>
                    <SelectTrigger className="clay-button rounded-2xl border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="W-9">W-9</SelectItem>
                      <SelectItem value="Insurance Certificate">Insurance Certificate</SelectItem>
                      <SelectItem value="Business License">Business License</SelectItem>
                      <SelectItem value="Certification">Certification</SelectItem>
                      <SelectItem value="Contract Template">Contract Template</SelectItem>
                      <SelectItem value="Invoice Template">Invoice Template</SelectItem>
                      <SelectItem value="Email Template">Email Template</SelectItem>
                      <SelectItem value="Recommendation Template">Recommendation Template</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger className="clay-button rounded-2xl border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Legal">Legal</SelectItem>
                      <SelectItem value="Financial">Financial</SelectItem>
                      <SelectItem value="Templates">Templates</SelectItem>
                      <SelectItem value="Compliance">Compliance</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Issue Date</Label>
                  <Input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                  />
                </div>

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Expiry Date</Label>
                  <Input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-gray-700 font-medium mb-2 block">Issuing Authority</Label>
                  <Input
                    value={formData.issuing_authority}
                    onChange={(e) => setFormData({...formData, issuing_authority: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                    placeholder="State Department of Health"
                  />
                </div>

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Alert Days Before Expiry</Label>
                  <Input
                    type="number"
                    value={formData.alert_days_before}
                    onChange={(e) => setFormData({...formData, alert_days_before: parseInt(e.target.value)})}
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
                      <SelectItem value="Expired">Expired</SelectItem>
                      <SelectItem value="Pending Renewal">Pending Renewal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label className="text-gray-700 font-medium mb-2 block">Upload File</Label>
                  <div className="clay-button rounded-2xl p-4 flex items-center gap-3">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="doc-upload"
                    />
                    <label htmlFor="doc-upload" className="cursor-pointer flex items-center gap-2 text-blue-600 font-medium">
                      <Upload className="w-4 h-4" />
                      {formData.file_url ? 'Change File' : 'Upload File'}
                    </label>
                    {formData.file_url && (
                      <a href={formData.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm">
                        View File
                      </a>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label className="text-gray-700 font-medium mb-2 block">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="clay-button rounded-2xl border-0 min-h-[80px]"
                    placeholder="Additional details..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="clay-button rounded-2xl px-6 py-3 font-medium text-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="clay-button rounded-2xl px-6 py-3 font-semibold text-blue-600 hover:scale-105 transition-transform"
                >
                  {selectedDoc ? 'Update' : 'Save'} Document
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}