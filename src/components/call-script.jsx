import { useState, useEffect, useCallback, useRef } from 'react';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
  Loader2,
  Info
} from 'lucide-react';
import { ChargeDatePicker } from './charge-date-picker';
import AddressAutoComplete from './address-autocomplete'; 

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
  'Alzheimers Disease',
  'Parkinsons Disease',
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

const formatE164 = (value) => {
  const cleaned = value.replace(/^\+1/, '');
  const numbers = cleaned.replace(/\D/g, '');
  const char = { 0: '(', 3: ') ', 6: '-' };
  let formatted = '';
  for (let i = 0; i < numbers.length && i < 10; i++) {
    formatted += (char[i] || '') + numbers[i];
  }
  return formatted;
};

const formatCardNumber = (value) => {
  const numbers = value.replace(/\D/g, '');
  const groups = numbers.match(/.{1,4}/g);
  return groups ? groups.join(' ').substr(0, 19) : numbers;
};

const formatCardExpiration = (value) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}`;
};

const formatCVV = (value) => {
  return value.replace(/\D/g, '').slice(0, 4);
};

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date()
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Format for display in EST
const formatDate = (dateStr) => {
  const date = parseLocalDate(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York'
  })
}

export default function CallScript() {
  const { dbUser } = useAuth();
  const { scriptData, customerData, productOfferings, debouncedUpdate, currentCall, currentQueueName, setCanCallBack } = useContactCenter();
  const paymentApi = useApi();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false);
  const [isAccountVerified, setIsAccountVerified] = useState(false);
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);
  const [isSubscriptionCreated, setIsSubscriptionCreated] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const prevCallRef = useRef(null);

  // Usage:
  // formatDate('2025-11-11T05:00:00.000Z') → "November 11, 2025"

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

  const [billingInformation, setBillingInformation] = useState({
    type: 'checking',
    routing_number: '',
    account_number: '',
    card_number: '',
    card_expiration: '',
    card_cvv: '',
    selected_product: '',
    charge_date: new Date().toISOString().split('T')[0],
    frequency: 'Monthly',
    charge_amount: '$49.99'
  });

  const [newEmergencyContact, setNewEmergencyContact] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email_address: ''
  });
  const [showAddContact, setShowAddContact] = useState(false);

  useEffect(() => {
    if (formData.have_consent === true) {
      setCanCallBack(true);
    } else {
      setCanCallBack(false);
    }
  }, [hasAttemptedVerification, formData])

useEffect(() => {
  setBillingInformation((prev) => ({
    ...prev,
    routing_number: '',
    account_number: '',
    card_number: '',
    card_expiration: '',
    card_cvv: '',
  }))
}, [billingInformation.type])

  // Sync customerData to local formData
  useEffect(() => {
    if (customerData) {
      setFormData({ ...customerData })
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
      setDisclaimerAccepted(false);
    }
  }, [currentSlideIndex]);



  const handleFieldChange = (name, value) => {
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);
    // Sync to context
    debouncedUpdate({ data: updatedData });
  };

  const handleBillingFieldChange = useCallback((name, value) => {
    if (name === 'selected_product') {
      const foundProduct = productOfferings?.find(p => p.internal_product_id === value);
      if (foundProduct?.friendly_price) {
        setBillingInformation(prev => ({
          ...prev,
          [name]: value,
          charge_amount: foundProduct.friendly_price,
          frequency: foundProduct.billing_frequency

        }));
      } else {
        setBillingInformation(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setBillingInformation(prev => ({ ...prev, [name]: value }));
    }
    // Reset verification when billing info changes
    setIsAccountVerified(false);
  }, [productOfferings]);

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
    const conditions = formData?.conditions?.includes(condition)
      ? formData?.conditions?.filter(c => c !== condition)
      : [...formData?.conditions, condition];
    const updatedData = { ...formData, conditions };
    setFormData(updatedData);
    debouncedUpdate({ data: updatedData });
  };

  const removeCondition = (condition) => {
    const updatedData = {
      ...formData,
      conditions: formData?.conditions?.filter(c => c !== condition)
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
    const currentMedium = billingInformation.type === 'checking' || billingInformation.type === 'savings' ? 'ach' : 'card';

    // Validate based on payment medium
    if (currentMedium === 'ach') {
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
    } else if (currentMedium === 'card') {
      if (!billingInformation.card_number || !billingInformation.card_expiration || !billingInformation.card_cvv) {
        toast.error('Please enter complete card information.');
        return false;
      }

      const cardNumberDigits = billingInformation.card_number.replace(/\s/g, '');
      if (cardNumberDigits.length < 13 || cardNumberDigits.length > 19) {
        toast.error('Invalid card number.');
        return false;
      }

      if (billingInformation.card_expiration.length !== 5) {
        toast.error('Invalid expiration date. Use MM/YY format.');
        return false;
      }

      if (billingInformation.card_cvv.length < 3) {
        toast.error('Invalid security code.');
        return false;
      }
    }

    setHasAttemptedVerification(true);

    setIsVerifying(true);

    // Training queue
    if (currentQueueName && currentQueueName === 'training@sip.lifeshieldmedicalalerts.com') {
      await new Promise(resolve => setTimeout(resolve, 4000));
      const success = Math.random() < 0.8; // 80% chance of success
      setIsVerifying(false);

      if (success) {
        setIsAccountVerified(true);
        toast.success('Payment method verified successfully!');
        return true;
      } else {
        toast.error('Invalid Payment Method', {
          description: 'Please double check payment information.'
        });
        return false;
      }
    }

    //Real stuff
    const verificationResult = await paymentApi.execute('/billing/verifyaccount', 'POST', {
      customer_id: formData?.customer_id,
      payment_information: billingInformation,
      action: 'VERIFY_PAYMENT_METHOD'
    });

    setIsVerifying(false);

    if (verificationResult.success === true) {
      setIsAccountVerified(true);
      toast.success('Payment method verified successfully!');
      return true;
    } else {
      toast.error('Failed To Validate Payment Information', {
        description: verificationResult?.data?.reason || 'Please double check payment information.'
      });
      return false;
    }
  }, [billingInformation, formData, paymentApi, currentQueueName]);

  const createSubscription = useCallback(async () => {
    setIsCreatingSubscription(true);

    if (currentQueueName && currentQueueName === 'training@sip.lifeshieldmedicalalerts.com') {
      await new Promise(resolve => setTimeout(resolve, 4000));
      setIsCreatingSubscription(false);
      toast.success('Subscription created successfully!');
      return true;
    }
    //actual processing
    try {
      const result = await paymentApi.execute('/billing/subscribecustomer', 'POST', {
        customerId: formData?.customer_id,
        frequency: billingInformation.frequency,
        charge_date: billingInformation.charge_date,
        agentId: dbUser?.agent_id,
        action: "CREATE_SUBSCRIPTION"
      });

      if (result?.success) {
        setIsCreatingSubscription(false);
        setIsSubscriptionCreated(true);
        toast.success('Subscription created successfully!');
        return true;
      } else {
        toast.error('Failed to create subscription', {
          description: result?.data?.reason || 'Please try again.'
        });
        setIsCreatingSubscription(false);
        return false;
      }
    } catch (error) {
      setIsCreatingSubscription(false);
      toast.error('An error occurred', {
        description: 'Please try again later.'
      });
      return false;
    }

  }, [formData, billingInformation, paymentApi, currentQueueName, dbUser]);

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
        const typeField = content.fields.find(f => f.name === 'type');
        const selectedOption = typeField?.options?.find(
          opt => opt.value === billingInformation.type
        );
        const currentMedium = selectedOption?.medium;

        for (const field of content.fields) {
          if (field.medium && field.medium !== currentMedium) {
            continue;
          }
          
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

      switch (route) {
        case 'Customer':
          if(value === "primary_phone"){
            return formatE164(customerData?.[value] || '');
          }else{
            return customerData?.[value] || '';
          }
        case 'Billing':
          if (value === "charge_date") {
            return formatDate(billingInformation?.[value] || new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' }));
          } else if (value === "account_lastfour") {
            return billingInformation?.account_number?.slice(-4) || '';
          } else {
            return billingInformation?.[value] || '';
          }
        case 'Agent':
          return dbUser?.[value] || '';
        default:
          return fullMatch;
      }
    });
  }, [customerData, billingInformation, dbUser]);

  const handleAddressUpdate = (value) => {
    console.log('Address update values: ', value);
    const updatedData = { ...formData, ...value };
    setFormData(updatedData);
    debouncedUpdate({ data: updatedData });
  }

  const renderContent = (content, index) => {
    const contentKey = `${content.type}-${index}`;
    switch (content.type) {
      case 'script':
        return (
          <Card key={contentKey} className="border-l-4 border-l-blue-500">
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
          <Card key={contentKey} className="border-l-4 border-l-purple-500 bg-purple-50/50">
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
          <Card key={contentKey} className="border-l-4 border-l-green-500">
            <CardContent>
              <div className="space-y-4">
                {content.fields?.map((field, fieldIndex) => (
                  <div key={`${index}-form-field-${fieldIndex}`} className="space-y-2">
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
  // Determine current payment medium
  const typeField = content.fields?.find(f => f.name === 'type');
  const selectedOption = typeField?.options?.find(
    opt => opt.value === billingInformation.type
  );
  const currentMedium = selectedOption?.medium;

  return (
    <Card key={index} className="border-l-4 border-l-emerald-500">
      <CardContent>
        <div className="space-y-4">
          {content.fields?.map((field, fieldIndex) => {
            // Skip fields that don't match current medium
            if (field.medium && field.medium !== currentMedium) {
              return null;
            }

            return (
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
                    type="text"
                    value={billingInformation[field.name] || ''}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Auto-format based on field
                      if (field.name === 'routing_number' || field.name === 'account_number') {
                        value = value.replace(/\D/g, '');
                        if (field.name === 'routing_number') {
                          value = value.slice(0, 9);
                        }
                      } else if (field.name === 'card_number') {
                        value = formatCardNumber(value);
                      } else if (field.name === 'card_expiration') {
                        value = formatCardExpiration(value);
                      } else if (field.name === 'card_cvv') {
                        value = formatCVV(value);
                      }
                      handleBillingFieldChange(field.name, value);
                    }}
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                  />
                )}
                {field.helpText && (
                  <p className="text-xs text-muted-foreground">{field.helpText}</p>
                )}
              </div>
            );
          })}
          
          {isAccountVerified && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckSquare className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">Payment method verified successfully</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

      case 'chronic_conditions_selector':
        return (
          <Card key={contentKey} className="border-l-4 border-l-teal-500">
            <CardContent className="space-y-4">
              <Label>{content.label || 'Chronic Conditions'}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {formData?.conditions?.length > 0
                      ? `${formData?.conditions?.length} condition${formData?.conditions?.length > 1 ? 's' : ''} selected`
                      : 'Select conditions'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <div className="max-h-[300px] overflow-y-auto p-4 space-y-2">
                    {CHRONIC_CONDITIONS.map((condition, condIdx) => (
                      <div key={`${index}-condition-${condIdx}`} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${index}-${condition}`}
                          checked={formData?.conditions?.includes(condition)}
                          onCheckedChange={() => toggleCondition(condition)}
                        />
                        <label
                          htmlFor={`${index}-${condition}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {condition}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {formData?.conditions?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData?.conditions?.map((condition, condIdx) => (
                    <Badge key={`${index}-selected-condition-${condIdx}`} variant="secondary" className="pl-2 pr-1">
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
           <AddressAutoComplete
                addressData={formData}
                onAddressUpdate={(value) => handleAddressUpdate(value)}
            />
        );

      case 'emergency_contacts_manager':
        return (
          <Card key={contentKey} className="border-l-4 border-l-orange-500">
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
                    <AccordionItem key={`${index}-contact-${idx}`} value={`contact-${index}-${idx}`}>
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
      case 'charge_date_manager':
        return (
          <Card key={index} className="border-l-4 border-l-blue-500">
            <CardContent>
              <ChargeDatePicker
                chargeDate={billingInformation.charge_date}
                onDateChange={(value) => handleBillingFieldChange('charge_date', value)}
              />
            </CardContent>
          </Card>
        );
      case 'verification_display':
        return (
          <Card key={contentKey} className="border-l-4 border-l-blue-500">
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
          <Card key={contentKey} className="border-l-4 border-l-purple-500 bg-purple-50/50">
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
          <Card key={contentKey} className="border-l-4 border-l-green-500">
            <CardContent>
              <div className="flex gap-3">
                <CheckSquare className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  {content.label && (
                    <p className="font-medium mb-2">{content.label}</p>
                  )}
                  <ul className="space-y-2">
                    {content.items?.map((item, idx) => (
                      <li key={`${index}-checklist-${idx}`} className="flex items-start gap-2">
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
          <Card key={contentKey} className="border-l-4 border-l-indigo-500">
            <CardContent className="space-y-4">
              <Label>
                {content.label || 'Select Product'}
                {content.required && <span className="text-red-500 ml-1">*</span>}
              </Label>

              {productOfferings && productOfferings.length > 0 ? (
                <div className="grid gap-3">
                  {productOfferings.map((product) => (
                    <div
                      key={`${index}-product-${product.internal_product_id}`}
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
          <Card key={contentKey} className="border-l-4 border-l-purple-500">
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
          <Card key={contentKey} className="border-l-4 border-l-yellow-500 bg-yellow-50/50">
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
          <Card key={contentKey} className="border-l-4 border-l-cyan-500 bg-cyan-50/50">
            <CardContent>
              <div className="flex gap-3">
                <Lightbulb className="h-5 w-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{handlePlaceholders(content?.content)}</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'statistics':
        const filteredStats = formData.conditions?.length > 0 ? formData.conditions[0] : 'Fall';
        return (
          <Card key={contentKey} className="gap-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Condition Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.items?.filter(s => s?.tags?.includes(filteredStats))?.map((stat, idx) => (
                <div key={`${index}-stat-${idx}`} className="space-y-2">
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
        const filteredStories = formData.conditions?.length > 0 ? formData.conditions[0] : 'Fall';
        return (
          <Card key={contentKey} className="gap-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5" />
                Caller Stories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.items?.filter(s => s?.tags?.includes(filteredStories))?.map((story, idx) => (
                <div key={`${index}-story-${idx}`} className="space-y-2">
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
          <Card key={contentKey} className="border-l-4 border-l-emerald-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                Pricing Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.options?.map((option, idx) => (
                <div key={`${index}-pricing-${idx}`} className="p-4 bg-muted/50 rounded-lg">
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
          <Card key={contentKey} className="border-l-4 border-l-orange-500 bg-orange-50/50">
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
          <Card key={contentKey}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Common Objections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.items?.map((obj, idx) => (
                <div key={`${index}-objection-${idx}`} className="space-y-2 p-4 bg-orange-50/50 rounded-lg">
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
          <Card key={contentKey}>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(content, null, 2)}
              </pre>
            </CardContent>
          </Card>
        );
    }
  };

  useEffect(() => {
    if (prevCallRef.current !== null && currentCall === null) {
      // Reset all states
      setCurrentSlideIndex(0);
      setHasAttemptedVerification(false);
      setIsAccountVerified(false);
      setIsSubscriptionCreated(false);
      setDisclaimerAccepted(false);
      setCanCallBack(false);
      setBillingInformation({
        type: 'checking',
        routing_number: '',
        account_number: '',
        selected_product: '',
        frequency: 'Monthly',
        charge_date: (() => {
          const now = new Date()
          const year = now.getFullYear()
          const month = String(now.getMonth() + 1).padStart(2, '0')
          const day = String(now.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        })(),
        charge_amount: '$49.99'
      });
      setFormData({
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
      setNewEmergencyContact({
        first_name: '',
        last_name: '',
        phone_number: '',
        email_address: ''
      });
      setShowAddContact(false);
    } else {
      console.log('Form data NOT reset')
    }

    prevCallRef.current = currentCall;
  }, [currentCall]);

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
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="absolute bottom-23 right-5 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
            >
              <Info className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-96 max-h-[700px] overflow-y-auto p-0"
            align="end"
            side="top"
          >
            <Tabs defaultValue="customer" className="w-full">
              <div className="border-b bg-background sticky top-0 z-10">
                <TabsList className="w-full grid grid-cols-3 rounded-none h-auto p-0">
                  <TabsTrigger
                    value="customer"
                    className="rounded-none"
                  >
                    Customer
                  </TabsTrigger>
                  <TabsTrigger
                    value="pricing"
                    className="rounded-none"
                  >
                    Pricing
                  </TabsTrigger>
                  <TabsTrigger
                    value="company"
                    className="rounded-none"
                  >
                    Company
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="customer" className="p-4 pt-0 space-y-4 mt-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Customer Information</h3>
                  <Badge variant={formData.contact_status === 'subscribed' ? 'default' : 'secondary'}>
                    {formData.contact_status?.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase">Personal Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Name:</span>
                      <p className="text-muted-foreground">
                        {formData.first_name} {formData.last_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Primary Phone:</span>
                      <p className="text-muted-foreground">{formData.primary_phone || 'N/A'}</p>
                    </div>
                    {formData.secondary_phone && (
                      <div>
                        <span className="font-medium">Secondary Phone:</span>
                        <p className="text-muted-foreground">{formData.secondary_phone}</p>
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Email:</span>
                      <p className="text-muted-foreground break-all">{formData.email_address || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                {formData.street_address_one && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase">Address</h4>
                      <div className="text-sm text-muted-foreground">
                        <p>{formData.street_address_one}</p>
                        {formData.street_address_two && <p>{formData.street_address_two}</p>}
                        <p>
                          {formData.address_city}, {formData.address_state} {formData.address_zip}
                        </p>
                        {formData.address_county && <p>{formData.address_county} County</p>}
                      </div>
                    </div>
                  </>
                )}
                {formData.conditions && formData.conditions.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase">
                        Chronic Conditions ({formData.conditions.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {formData.conditions.map(condition => (
                          <Badge key={condition} variant="secondary" className="text-xs">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {formData.emergency_contacts && formData.emergency_contacts.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase">
                        Emergency Contacts ({formData.emergency_contacts.length})
                      </h4>
                      <div className="space-y-3">
                        {formData.emergency_contacts.map((contact, idx) => (
                          <div key={idx} className="p-2 bg-muted/50 rounded-md text-sm">
                            <p className="font-medium">
                              {contact.first_name} {contact.last_name}
                            </p>
                            {contact.phone_number && (
                              <p className="text-muted-foreground text-xs">{contact.phone_number}</p>
                            )}
                            {contact.email_address && (
                              <p className="text-muted-foreground text-xs break-all">{contact.email_address}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {formData.have_consent && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase">Consent</h4>
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Consent provided</span>
                      </div>
                      {formData.last_consent && (
                        <p className="text-xs text-muted-foreground">
                          Last: {new Date(formData.last_consent).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>
              <TabsContent value="pricing" className="p-4 pt-0 space-y-4 mt-0">
                <h3 className="font-semibold text-lg">Pricing Information</h3>

                {productOfferings && productOfferings.length > 0 ? (
                  <div className="space-y-3">
                    {productOfferings.map((product) => (
                      <div
                        key={product.internal_product_id}
                        className="border rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold">{product.friendly_name}</p>
                            {product.description && (
                              <p className="text-xs text-muted-foreground mt-1">{product.description}</p>
                            )}
                          </div>
                          {product.price && (
                            <div className="text-right ml-3">
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
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No pricing information available
                  </p>
                )}

                {billingInformation.selected_product && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase">Current Selection</h4>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                        <p className="text-sm font-medium">
                          {productOfferings?.find(p => p.internal_product_id === billingInformation.selected_product)?.friendly_name || 'N/A'}
                        </p>
                        <p className="text-lg font-bold text-primary mt-1">
                          {billingInformation.charge_amount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Billed {billingInformation.frequency}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
              <TabsContent value="company" className="p-4 pt-0 space-y-4 mt-0">
                <h3 className="font-semibold text-lg">Company Information</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase">Support Hours</h4>
                    <p className="text-sm text-muted-foreground">
                      Monday - Friday: 9:00 AM - 5:00 PM EST<br />
                      Saturday: Closed<br />
                      Sunday: Closed
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase">Contact</h4>
                    <p className="text-sm text-muted-foreground">
                      Support: (833) 435-5402<br />
                      Email: support@lifeshieldmedicalalerts.com<br />
                      Web: www.lifeshieldmedicalalerts.com
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <div className="bg-muted border-t px-4 py-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Sale Callback Number</p>
              <p className="text-xs font-medium">(888) 883-4603</p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="p-6 pt-4 border-t">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstSlide || isCreatingSubscription ||isSubscriptionCreated}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            {scriptData.map((slide, index) => (
              <button
                key={`slide-${index}-${slide.slideId || 'no-id'}`}
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