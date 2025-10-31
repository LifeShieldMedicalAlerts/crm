import { useContactCenter } from '../contextproviders/ContactCenterContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { X, Plus, CreditCard } from 'lucide-react';
import { useState, useEffect } from 'react';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const CONTACT_STATUSES = [
  'not_subscribed',
  'subscribed',
  'active',
  'inactive',
  'do_not_contact'
];

const CHRONIC_CONDITIONS = [
  'Diabetes',
  'Hypertension',
  'Heart Disease',
  'COPD',
  'Asthma',
  'Arthritis',
  'Kidney Disease',
  'Liver Disease',
  'Cancer',
  'Stroke',
  'Alzheimer\'s Disease',
  'Parkinson\'s Disease',
  'Depression',
  'Anxiety',
  'Obesity',
  'Sleep Apnea',
  'Osteoporosis',
  'Thyroid Disease',
  'High Cholesterol',
  'Anemia'
];

export default function CustomerInformation() {
  const {
    matchedContacts,
    customerData,
    updateCustomerData,
    togglePayment
  } = useContactCenter();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email_address: '',
    primary_phone: '',
    secondary_phone: '',
    contact_status: 'not_subscribed',
    have_consent: false,
    last_consent: '',
    referral_source: '',
    street_address_one: '',
    street_address_two: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    address_county: '',
    conditions: [],
    emergency_contacts: []
  });

  const [newEmergencyContact, setNewEmergencyContact] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email_address: ''
  });

  const [showAddContact, setShowAddContact] = useState(false);

  // Populate form when customerData changes
  useEffect(() => {
    if (customerData) {
      setFormData({
        first_name: customerData.first_name || '',
        last_name: customerData.last_name || '',
        email_address: customerData.email_address || '',
        primary_phone: customerData.primary_phone || '',
        secondary_phone: customerData.secondary_phone || '',
        contact_status: customerData.contact_status || 'not_subscribed',
        have_consent: customerData.have_consent || false,
        last_consent: customerData.last_consent || '',
        referral_source: customerData.referral_source || '',
        street_address_one: customerData.street_address_one || '',
        street_address_two: customerData.street_address_two || '',
        address_city: customerData.address_city || '',
        address_state: customerData.address_state || '',
        address_zip: customerData.address_zip || '',
        address_county: customerData.address_county || '',
        conditions: customerData.conditions || [],
        emergency_contacts: customerData.emergency_contacts || []
      });
    }
  }, [customerData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (checked) => {
    setFormData(prev => ({
      ...prev,
      have_consent: checked,
      last_consent: checked ? new Date().toISOString() : ''
    }));
  };

  const toggleCondition = (condition) => {
    setFormData(prev => {
      const conditions = prev.conditions.includes(condition)
        ? prev.conditions.filter(c => c !== condition)
        : [...prev.conditions, condition];
      return { ...prev, conditions };
    });
  };

  const removeCondition = (condition) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c !== condition)
    }));
  };

  const handleAddEmergencyContact = () => {
    if (newEmergencyContact.first_name && newEmergencyContact.last_name) {
      setFormData(prev => ({
        ...prev,
        emergency_contacts: [...prev.emergency_contacts, { ...newEmergencyContact }]
      }));
      setNewEmergencyContact({
        first_name: '',
        last_name: '',
        phone_number: '',
        email_address: ''
      });
      setShowAddContact(false);
    }
  };

  const handleRemoveEmergencyContact = (index) => {
    setFormData(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateEmergencyContact = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateCustomerData(formData);
  };

  return (
    <div className="h-full p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Customer Information</h2>
        <Button onClick={togglePayment} variant="default">
          <CreditCard className="h-4 w-4 mr-2" />
          Payment
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Personal Information
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                placeholder="Enter first name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_address">Email Address</Label>
            <Input
              id="email_address"
              name="email_address"
              type="email"
              value={formData.email_address}
              onChange={handleInputChange}
              placeholder="email@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_phone">Primary Phone</Label>
              <Input
                id="primary_phone"
                name="primary_phone"
                type="tel"
                value={formData.primary_phone}
                onChange={handleInputChange}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secondary_phone">Secondary Phone</Label>
              <Input
                id="secondary_phone"
                name="secondary_phone"
                type="tel"
                value={formData.secondary_phone}
                onChange={handleInputChange}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Address Information Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Address Information
          </h3>

          <div className="space-y-2">
            <Label htmlFor="street_address_one">Street Address 1</Label>
            <Input
              id="street_address_one"
              name="street_address_one"
              value={formData.street_address_one}
              onChange={handleInputChange}
              placeholder="123 Main Street"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="street_address_two">Street Address 2</Label>
            <Input
              id="street_address_two"
              name="street_address_two"
              value={formData.street_address_two}
              onChange={handleInputChange}
              placeholder="Apt, Suite, Unit, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address_city">City</Label>
              <Input
                id="address_city"
                name="address_city"
                value={formData.address_city}
                onChange={handleInputChange}
                placeholder="City"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_state">State</Label>
              <Select
                value={formData.address_state}
                onValueChange={(value) => handleSelectChange('address_state', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map(state => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address_zip">ZIP Code</Label>
              <Input
                id="address_zip"
                name="address_zip"
                value={formData.address_zip}
                onChange={handleInputChange}
                placeholder="12345"
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_county">County</Label>
              <Input
                id="address_county"
                name="address_county"
                value={formData.address_county}
                onChange={handleInputChange}
                placeholder="County"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Chronic Conditions Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Chronic Conditions
          </h3>

          <div className="space-y-2">
            <Label>Conditions</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  {formData.conditions.length > 0 
                    ? `${formData.conditions.length} condition${formData.conditions.length > 1 ? 's' : ''} selected`
                    : 'Select conditions'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <div className="max-h-[300px] overflow-y-auto p-4 space-y-2">
                  {CHRONIC_CONDITIONS.map(condition => (
                    <div key={condition} className="flex items-center space-x-2">
                      <Checkbox
                        id={condition}
                        checked={formData.conditions.includes(condition)}
                        onCheckedChange={() => toggleCondition(condition)}
                      />
                      <label
                        htmlFor={condition}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {condition}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {formData.conditions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.conditions.map(condition => (
                <Badge key={condition} variant="secondary" className="pl-2 pr-1">
                  {condition}
                  <button
                    type="button"
                    onClick={() => removeCondition(condition)}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Emergency Contacts Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Emergency Contacts
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddContact(!showAddContact)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Contact
            </Button>
          </div>

          {showAddContact && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="new_first_name">First Name</Label>
                  <Input
                    id="new_first_name"
                    value={newEmergencyContact.first_name}
                    onChange={(e) => setNewEmergencyContact(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_last_name">Last Name</Label>
                  <Input
                    id="new_last_name"
                    value={newEmergencyContact.last_name}
                    onChange={(e) => setNewEmergencyContact(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="new_phone">Phone Number</Label>
                  <Input
                    id="new_phone"
                    type="tel"
                    value={newEmergencyContact.phone_number}
                    onChange={(e) => setNewEmergencyContact(prev => ({ ...prev, phone_number: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_email">Email Address</Label>
                  <Input
                    id="new_email"
                    type="email"
                    value={newEmergencyContact.email_address}
                    onChange={(e) => setNewEmergencyContact(prev => ({ ...prev, email_address: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddContact(false);
                    setNewEmergencyContact({ first_name: '', last_name: '', phone_number: '', email_address: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddEmergencyContact}
                  disabled={!newEmergencyContact.first_name || !newEmergencyContact.last_name}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {formData.emergency_contacts.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              {formData.emergency_contacts.map((contact, index) => (
                <AccordionItem key={index} value={`contact-${index}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-medium">
                        {contact.first_name} {contact.last_name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {contact.phone_number}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>First Name</Label>
                          <Input
                            value={contact.first_name}
                            onChange={(e) => handleUpdateEmergencyContact(index, 'first_name', e.target.value)}
                            placeholder="First name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Last Name</Label>
                          <Input
                            value={contact.last_name}
                            onChange={(e) => handleUpdateEmergencyContact(index, 'last_name', e.target.value)}
                            placeholder="Last name"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <Input
                            type="tel"
                            value={contact.phone_number}
                            onChange={(e) => handleUpdateEmergencyContact(index, 'phone_number', e.target.value)}
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email Address</Label>
                          <Input
                            type="email"
                            value={contact.email_address}
                            onChange={(e) => handleUpdateEmergencyContact(index, 'email_address', e.target.value)}
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveEmergencyContact(index)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove Contact
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          {formData.emergency_contacts.length === 0 && !showAddContact && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No emergency contacts added yet
            </p>
          )}
        </div>

        <Separator />

        {customerData && (
          <>
            {/* Account Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Account Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Customer ID:</span>
                  <p className="text-muted-foreground break-all">{customerData.customer_id}</p>
                </div>
                <div>
                  <span className="font-semibold">Created:</span>
                  <p className="text-muted-foreground">
                    {new Date(customerData.create_time).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="font-semibold">Billing ID:</span>
                  <p className="text-muted-foreground">{customerData.billing_id || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-semibold">Attributed Revenue:</span>
                  <p className="text-muted-foreground">
                    ${customerData.attributed_revenue?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </form>
    </div>
  );
}