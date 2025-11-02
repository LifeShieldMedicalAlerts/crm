import { useAuth } from '@/contextproviders/AuthContext';
import { useContactCenter } from '../contextproviders/ContactCenterContext';
import useApi from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  HelpCircle,
  CheckSquare,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  BookOpen,
  DollarSign,
  AlertTriangle,
  Plus,
  X,
  Loader2
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

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

const formatPhoneNumber = (value) => {
  const numbers = value.replace(/\D/g, '');
  const char = { 0: '(', 3: ') ', 6: '-' };
  let formatted = '';
  for (let i = 0; i < numbers.length && i < 10; i++) {
    formatted += (char[i] || '') + numbers[i];
  }
  return formatted;
};

export default function CallScript() {
  const {dbUser} = useAuth();
  const { scriptData, customerData, productOfferings, debouncedUpdate } = useContactCenter();
  const paymentApi = useApi();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAccountVerified, setIsAccountVerified] = useState(false);
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);
  const [isSubscriptionCreated, setIsSubscriptionCreated] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  // Local form state that syncs with customerData
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



  // Separate billing information state (not saved to customer DB)
  const [billingInformation, setBillingInformation] = useState({
    type: 'checking',
    routing_number: '',
    account_number: '',
    selected_product: '',
    frequency: 'Monthly'
  });

  const [newEmergencyContact, setNewEmergencyContact] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email_address: ''
  });
  const [showAddContact, setShowAddContact] = useState(false);

  // Sync customerData to local formData
  useEffect(() => {
    if (customerData) {
      setFormData({...customerData})
    }
  }, [customerData]);

  useEffect(() => {
    if (Array.isArray(scriptData) && scriptData.length > 0) {
      const startSlideIndex = scriptData.findIndex(slide => slide?.startSlide);
      setCurrentSlideIndex(startSlideIndex >= 0 ? startSlideIndex : 0);
    }
  }, [scriptData]);


  // Reset verification when leaving billing slide
  useEffect(() => {
    const hasBillingFields = currentSlide?.slideContent?.some(content => content.type === 'billing_fields');
    const hasSubAuth = currentSlide?.slideContent?.some(content => content.type === 'subscription_authorization');
    if (!hasBillingFields) {
      setIsAccountVerified(false);
    }
    if (!hasSubAuth) {
      setIsSubscriptionCreated(false);
      setDisclaimerAccepted(false);
    }
  }, [currentSlideIndex]);

  const formatDate = (date = new Date()) => {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};


  const handleFieldChange = (name, value) => {
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);
    // Sync to context
    debouncedUpdate({ data: updatedData });
  };

  const handleBillingFieldChange = (name, value) => {
    setBillingInformation(prev => ({ ...prev, [name]: value }));
    // Reset verification when billing info changes
    setIsAccountVerified(false);
  };

  const handleCheckboxChange = (name, checked) => {
    const updatedData = {
      ...formData,
      [name]: checked,
      ...(name === 'have_consent' && checked ? { last_consent: new Date().toISOString() } : {})
    };
    setFormData(updatedData);
    debouncedUpdate({ data: updatedData });
  };

  const toggleCondition = (condition) => {
    const conditions = formData.conditions.includes(condition)
      ? formData.conditions.filter(c => c !== condition)
      : [...formData.conditions, condition];
    const updatedData = { ...formData, conditions };
    setFormData(updatedData);
    debouncedUpdate({ data: updatedData });
  };

  const removeCondition = (condition) => {
    const updatedData = {
      ...formData,
      conditions: formData.conditions.filter(c => c !== condition)
    };
    setFormData(updatedData);
    debouncedUpdate({ data: updatedData });
  };

  const handleAddEmergencyContact = () => {
    if (newEmergencyContact.first_name && newEmergencyContact.last_name) {
      const updatedData = {
        ...formData,
        emergency_contacts: [...formData.emergency_contacts, { ...newEmergencyContact }]
      };
      setFormData(updatedData);
      debouncedUpdate({ data: updatedData });
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
    const updatedData = {
      ...formData,
      emergency_contacts: formData.emergency_contacts.filter((_, i) => i !== index)
    };
    setFormData(updatedData);
    debouncedUpdate({ data: updatedData });
  };

  const handleUpdateEmergencyContact = (index, field, value) => {
    const updatedData = {
      ...formData,
      emergency_contacts: formData.emergency_contacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      )
    };
    setFormData(updatedData);
    debouncedUpdate({ data: updatedData });
  };

  const hasSubscriptionAuthorization = () => {
    return currentSlide?.slideContent?.some(content => content.type === 'subscription_authorization');
  };

  const verifyAccountInformation = useCallback(async () => {
    if (!billingInformation.routing_number || !billingInformation.account_number) {
      toast.error('Invalid billing information. Please enter both routing and account number.');
      return false;
    }

    if (billingInformation.routing_number.length !== 9) {
      toast.error('Routing number must be exactly 9 digits.');
      return false;
    }

    if (billingInformation.account_number.length < 5) {
      toast.error('Account number must be at least 5 digits.');
      return false;
    }

    setIsVerifying(true);
    const verificationResult = await paymentApi.execute('/billing/verifyaccount', 'POST', {
      customerInformation: formData,
      paymentInformation: billingInformation
    });


    setIsVerifying(false);

    if (verificationResult.success === true) {
      setIsAccountVerified(true);
      toast.success('Account verified successfully!');
      return true;
    } else {
      toast.error('Invalid Payment Method', {
        description: verificationResult?.data?.reason || 'Please double check routing and account number.'
      });
      return false;
    }
  }, [billingInformation, formData, paymentApi]);

  const createSubscription = useCallback(async () => {
    setIsCreatingSubscription(true);

    try {
      const result = await paymentApi.execute('/billing/subscribecustomer', 'POST', {
        customerInformation: formData,
        paymentInformation: billingInformation
      });

      setIsCreatingSubscription(false);

      return true;

      if (result.success) {
        setIsSubscriptionCreated(true);
        toast.success('Subscription created successfully!');
        return true;
      } else {
        toast.error('Failed to create subscription', {
          description: result?.data?.reason || 'Please try again.'
        });
        return false;
      }
    } catch (error) {
      setIsCreatingSubscription(false);
      toast.error('An error occurred', {
        description: 'Please try again later.'
      });
      return false;
    }
  }, [formData, billingInformation, paymentApi]);

  // Check if current slide has billing fields
  const hasBillingFields = () => {
    return currentSlide?.slideContent?.some(content => content.type === 'billing_fields');
  };

  // Validation function to check if current slide's required fields are filled
  const isCurrentSlideValid = () => {
    if (!currentSlide?.slideContent) return true;

    for (const content of currentSlide.slideContent) {
      // Check form_fields
      if (content.type === 'form_fields' && content.fields) {
        for (const field of content.fields) {
          if (field.required) {
            const value = formData[field.name];
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              return false;
            }
          }
        }
      }

      // Check address_form
      if (content.type === 'address_form' && content.fields) {
        for (const field of content.fields) {
          if (field.required) {
            const value = formData[field.name];
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              return false;
            }
          }
        }
      }

      // Check billing_fields
      if (content.type === 'billing_fields' && content.fields) {
        for (const field of content.fields) {
          if (field.required) {
            const value = billingInformation[field.name];
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              return false;
            }
          }
        }
      }

      if (content.type === 'product_selector' && content.required) {
        if (!billingInformation.selected_product) {
          return false;
        }
      }
      if (content.type === 'subscription_authorization' && content.required) {
        if (!disclaimerAccepted) {
          return false;
        }
      }
    }

    return true;
  };

  if (!scriptData || !Array.isArray(scriptData) || scriptData.length === 0) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No script loaded</p>
        </div>
      </div>
    );
  }

  const currentSlide = scriptData[currentSlideIndex];
  const isFirstSlide = currentSlideIndex === 0;
  const isLastSlide = currentSlideIndex === scriptData.length - 1;
  const canProceed = isCurrentSlideValid();
  const isBillingSlide = hasBillingFields();
  const isSubscriptionSlide = hasSubscriptionAuthorization();

  const handlePrevious = () => {
    if (!isFirstSlide) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const handleNext = async () => {
    if (!canProceed) {
      toast.error('Please complete all required fields before proceeding');
      return;
    }

    // Special handling for billing slide
    if (isBillingSlide && !isAccountVerified) {
      const verified = await verifyAccountInformation();
      if (!verified) {
        return; // Stay on slide if verification fails
      }
    }

    if (hasSubscriptionAuthorization() && !isSubscriptionCreated) {
      const created = await createSubscription();
      if (!created) {
        return; // Stay on slide if subscription creation fails
      }
    }

    if (!isLastSlide) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

const handlePlaceholders = useCallback((content) => {
  if (!content) return content;
  
  const placeholderRegex = /\{([^}]+)\}/g;
  
  return content.replace(placeholderRegex, (fullMatch, placeholder) => {
    const [route, value] = placeholder.split('.');
    
    switch(route) {
      case 'Customer':
        return customerData?.[value] || '';
      case 'Billing':
        return billingInformation?.[value] || '';
      case 'Agent':
        return dbUser?.[value] || '';
      default:
        return fullMatch; 
    }
  });
}, [customerData, billingInformation, dbUser]);

  const renderContent = (content, index) => {
    switch (content.type) {
      case 'script':
        return (
          <Card key={index} className="border-l-4 border-l-blue-500">
            <CardContent>
              <div className="flex gap-3">
                <MessageSquare className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-base leading-relaxed">{handlePlaceholders(content?.content)}</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'question':
        return (
          <Card key={index} className="border-l-4 border-l-purple-500 bg-purple-50/50">
            <CardContent>
              <div className="flex gap-3">
                <HelpCircle className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <p className="text-base font-medium leading-relaxed">{handlePlaceholders(content?.content)}</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'form_fields':
        return (
          <Card key={index} className="border-l-4 border-l-green-500">
            <CardContent>
              <div className="space-y-4">
                {content.fields?.map((field, fieldIndex) => (
                  <div key={fieldIndex} className="space-y-2">
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {field.type === 'text' || field.type === 'tel' || field.type === 'email' ? (
                      <Input
                        id={field.name}
                        name={field.name}
                        type="text"
                        value={formData[field.name] || ''}
                        onChange={(e) => {
                          const value = field.type === 'tel'
                            ? formatPhoneNumber(e.target.value)
                            : e.target.value;
                          handleFieldChange(field.name, value);
                        }}
                        placeholder={field.placeholder}
                        required={field.required}
                        maxLength={field.maxLength}
                      />
                    ) : field.type === 'checkbox' ? (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={field.name}
                          checked={formData[field.name] || false}
                          onCheckedChange={(checked) => handleCheckboxChange(field.name, checked)}
                        />
                        <label
                          htmlFor={field.name}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {field.label}
                        </label>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'billing_fields':
        return (
          <Card key={index} className="border-l-4 border-l-emerald-500">
            <CardContent>
              <div className="space-y-4">
                {content.fields?.map((field, fieldIndex) => (
                  <div key={fieldIndex} className="space-y-2">
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {field.type === 'select' ? (
                      <Select
                        value={billingInformation[field.name]}
                        onValueChange={(value) => handleBillingFieldChange(field.name, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder || 'Select...'} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        value={billingInformation[field.name] || ''}
                        onChange={(e) => {
                          let value = e.target.value;
                          // Auto-format routing and account numbers to digits only
                          if (field.name === 'routing_number' || field.name === 'account_number') {
                            value = value.replace(/\D/g, '');
                            if (field.name === 'routing_number') {
                              value = value.slice(0, 9);
                            }
                          }
                          handleBillingFieldChange(field.name, value);
                        }}
                        placeholder={field.placeholder}
                        required={field.required}
                        maxLength={field.maxLength}
                      />
                    )}
                    {field.helpText && (
                      <p className="text-xs text-muted-foreground">{field.helpText}</p>
                    )}
                  </div>
                ))}

                {isAccountVerified && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckSquare className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Account verified successfully</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'chronic_conditions_selector':
        return (
          <Card key={index} className="border-l-4 border-l-teal-500">
            <CardContent className="space-y-4">
              <Label>{content.label || 'Chronic Conditions'}</Label>
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
            </CardContent>
          </Card>
        );

      case 'address_form':
        return (
          <Card key={index} className="border-l-4 border-l-indigo-500">
            <CardContent>
              <div className="space-y-4">
                {content.fields?.map((field, fieldIndex) => (
                  <div key={fieldIndex} className="space-y-2">
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {field.type === 'select' ? (
                      <Select
                        value={formData[field.name]}
                        onValueChange={(value) => handleFieldChange(field.name, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map(option => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        maxLength={field.maxLength}
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'emergency_contacts_manager':
        return (
          <Card key={index} className="border-l-4 border-l-orange-500">
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{content.label || 'Emergency Contacts'}</Label>
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
                        onChange={(e) => {
                          const value = formatPhoneNumber(e.target.value);
                          setNewEmergencyContact(prev => ({ ...prev, phone_number: value }));
                        }}
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
                  {formData.emergency_contacts.map((contact, idx) => (
                    <AccordionItem key={idx} value={`contact-${idx}`}>
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
                                onChange={(e) => handleUpdateEmergencyContact(idx, 'first_name', e.target.value)}
                                placeholder="First name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Last Name</Label>
                              <Input
                                value={contact.last_name}
                                onChange={(e) => handleUpdateEmergencyContact(idx, 'last_name', e.target.value)}
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
                                onChange={(e) => handleUpdateEmergencyContact(idx, 'phone_number', e.target.value)}
                                placeholder="+1 (555) 123-4567"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Email Address</Label>
                              <Input
                                type="email"
                                value={contact.email_address}
                                onChange={(e) => handleUpdateEmergencyContact(idx, 'email_address', e.target.value)}
                                placeholder="email@example.com"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveEmergencyContact(idx)}
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
            </CardContent>
          </Card>
        );

      case 'verification_display':
        return (
          <Card key={index} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle>Customer Information Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Name:</span>
                  <p className="text-muted-foreground">{formData.first_name} {formData.last_name}</p>
                </div>
                <div>
                  <span className="font-semibold">Phone:</span>
                  <p className="text-muted-foreground">{formData.primary_phone}</p>
                </div>
                <div>
                  <span className="font-semibold">Email:</span>
                  <p className="text-muted-foreground">{formData.email_address || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-semibold">Address:</span>
                  <p className="text-muted-foreground">
                    {formData.street_address_one}, {formData.address_city}, {formData.address_state} {formData.address_zip}
                  </p>
                </div>
              </div>
              {content.note && (
                <p className="text-xs text-muted-foreground italic">{content.note}</p>
              )}
            </CardContent>
          </Card>
        );

      case 'name_verification_display':
        return (
          <Card key={index} className="border-l-4 border-l-purple-500 bg-purple-50/50">
            <CardContent>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Customer Name on File:</p>
                <p className="text-2xl font-bold">
                  {formData.first_name} {formData.last_name}
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 'checklist':
        return (
          <Card key={index} className="border-l-4 border-l-green-500">
            <CardContent>
              <div className="flex gap-3">
                <CheckSquare className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  {content.label && (
                    <p className="font-medium mb-2">{content.label}</p>
                  )}
                  <ul className="space-y-2">
                    {content.items?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'product_selector':
        return (
          <Card key={index} className="border-l-4 border-l-indigo-500">
            <CardContent className="space-y-4">
              <Label>
                {content.label || 'Select Product'}
                {content.required && <span className="text-red-500 ml-1">*</span>}
              </Label>

              {productOfferings && productOfferings.length > 0 ? (
                <div className="grid gap-3">
                  {productOfferings.map((product) => (
                    <div
                      key={product.internal_product_id}
                      className={`
                  border-2 rounded-lg p-4 cursor-pointer transition-all
                  ${billingInformation.selected_product === product.internal_product_id
                          ? 'border-primary bg-primary/5 ring-2 ring-primary'
                          : 'border-border hover:border-primary/50'}
                `}
                      onClick={() => handleBillingFieldChange('selected_product', product.internal_product_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`
                      h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all
                      ${billingInformation.selected_product === product.internal_product_id
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'}
                    `}>
                            {billingInformation.selected_product === product.internal_product_id && (
                              <div className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{product.friendly_name}</p>
                            {product.description && (
                              <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                            )}
                          </div>
                        </div>
                        {product.price && (
                          <div className="text-right">
                            <p className="text-lg font-bold text-emerald-600">${product.price}</p>
                            {product.billing_frequency && (
                              <p className="text-xs text-muted-foreground">/{product.billing_frequency}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No product offerings available</p>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'subscription_authorization':
        return (
          <Card key={index} className="border-l-4 border-l-purple-500">
            <CardContent className="space-y-4">
              <Label className="text-base font-semibold">Authorization Disclaimer</Label>

              <div className="border rounded-lg p-4 bg-muted/30 max-h-[300px] overflow-y-auto space-y-3">
                <p className="text-sm whitespace-pre-line">{handlePlaceholders(content?.disclaimer)}</p>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg bg-background">
                <Checkbox
                  id="disclaimer_accept"
                  checked={disclaimerAccepted}
                  onCheckedChange={setDisclaimerAccepted}
                />
                <label
                  htmlFor="disclaimer_accept"
                  className="text-sm font-medium leading-tight cursor-pointer flex-1"
                >
                  {content.checkboxLabel}
                  {content.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              </div>

              {isSubscriptionCreated && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckSquare className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Subscription created successfully</span>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'note':
        return (
          <Card key={index} className="border-l-4 border-l-yellow-500 bg-yellow-50/50">
            <CardContent>
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm italic text-muted-foreground">{handlePlaceholders(content?.content)}</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'tip':
        return (
          <Card key={index} className="border-l-4 border-l-cyan-500 bg-cyan-50/50">
            <CardContent>
              <div className="flex gap-3">
                <Lightbulb className="h-5 w-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{handlePlaceholders(content?.content)}</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'statistics':
        return (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Condition Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.items?.map((stat, idx) => (
                <div key={idx} className="space-y-2">
                  <Badge variant="outline" className="mb-2">{stat.condition}</Badge>
                  <p className="text-sm leading-relaxed">{stat.stat}</p>
                  <p className="text-xs text-muted-foreground">Source: {stat.source}</p>
                  {idx < content.items.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case 'stories':
        return (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5" />
                Case Studies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.items?.map((story, idx) => (
                <div key={idx} className="space-y-2">
                  <Badge variant="secondary">{story.condition}</Badge>
                  <p className="text-sm leading-relaxed italic">{story.story}</p>
                  {idx < content.items.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case 'pricing':
        return (
          <Card key={index} className="border-l-4 border-l-emerald-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                Pricing Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.options?.map((option, idx) => (
                <div key={idx} className="p-4 bg-muted/50 rounded-lg">
                  <div className="font-semibold text-lg">{option.plan}</div>
                  <div className="text-xl font-bold text-emerald-600 mt-1">{option.price}</div>
                  {option.details && (
                    <div className="text-sm text-muted-foreground mt-2">{option.details}</div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case 'objection':
        return (
          <Card key={index} className="border-l-4 border-l-orange-500 bg-orange-50/50">
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm mb-2">{content.question}</p>
                  <div className="pl-4 border-l-2 border-orange-300">
                    <p className="text-sm">{content.response}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'objections':
        return (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Common Objections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.items?.map((obj, idx) => (
                <div key={idx} className="space-y-2 p-4 bg-orange-50/50 rounded-lg">
                  <Badge variant="outline" className="bg-white">{obj.category}</Badge>
                  <div>
                    <p className="font-medium text-sm mb-1">"{obj.objection}"</p>
                    <div className="pl-4 border-l-2 border-orange-300">
                      <p className="text-sm text-muted-foreground">{obj.response}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card key={index}>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(content, null, 2)}
              </pre>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4 max-w-4xl mx-auto">
          {currentSlide?.slideContent && Array.isArray(currentSlide.slideContent) && currentSlide.slideContent.length > 0 ? (
            <div className="space-y-4">
              {currentSlide.slideContent.map((content, index) => renderContent(content, index))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No content in this slide</p>
            </div>
          )}
        </div>
      </div>
      <div className="p-6 pt-4 border-t">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstSlide}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            {scriptData.map((slide, index) => (
              <button
                key={slide.slideId || index}
                onClick={() => setCurrentSlideIndex(index)}
                className={`h-2 rounded-full transition-all ${index === currentSlideIndex
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleNext}
            disabled={isLastSlide || !canProceed || (isBillingSlide && isVerifying) || (isSubscriptionSlide && isCreatingSubscription)}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : isCreatingSubscription ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Subscription...
              </>
            ) : isBillingSlide && !isAccountVerified ? (
              <>
                Verify Account
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            ) : isSubscriptionSlide && !isSubscriptionCreated ? (
              <>
                Submit Subscription
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}