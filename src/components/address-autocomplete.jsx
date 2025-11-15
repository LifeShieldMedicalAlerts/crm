import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import useApi from '@/hooks/useApi';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { MapPin, Search, X } from 'lucide-react';

const US_STATES = {
    'AL': 'Alabama',
    'AK': 'Alaska',
    'AZ': 'Arizona',
    'AR': 'Arkansas',
    'CA': 'California',
    'CO': 'Colorado',
    'CT': 'Connecticut',
    'DE': 'Delaware',
    'FL': 'Florida',
    'GA': 'Georgia',
    'HI': 'Hawaii',
    'ID': 'Idaho',
    'IL': 'Illinois',
    'IN': 'Indiana',
    'IA': 'Iowa',
    'KS': 'Kansas',
    'KY': 'Kentucky',
    'LA': 'Louisiana',
    'ME': 'Maine',
    'MD': 'Maryland',
    'MA': 'Massachusetts',
    'MI': 'Michigan',
    'MN': 'Minnesota',
    'MS': 'Mississippi',
    'MO': 'Missouri',
    'MT': 'Montana',
    'NE': 'Nebraska',
    'NV': 'Nevada',
    'NH': 'New Hampshire',
    'NJ': 'New Jersey',
    'NM': 'New Mexico',
    'NY': 'New York',
    'NC': 'North Carolina',
    'ND': 'North Dakota',
    'OH': 'Ohio',
    'OK': 'Oklahoma',
    'OR': 'Oregon',
    'PA': 'Pennsylvania',
    'RI': 'Rhode Island',
    'SC': 'South Carolina',
    'SD': 'South Dakota',
    'TN': 'Tennessee',
    'TX': 'Texas',
    'UT': 'Utah',
    'VT': 'Vermont',
    'VA': 'Virginia',
    'WA': 'Washington',
    'WV': 'West Virginia',
    'WI': 'Wisconsin',
    'WY': 'Wyoming'
};

export default function AddressAutoComplete({ addressData, onAddressUpdate }) {
    const locationApi = useApi();
    const [addressContent, setAddressContent] = useState("");
    const [foundMatches, setFoundMatches] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const hasAddress = addressData?.street_address_one;

    const findMatches = useCallback(async () => {
        if (!addressContent || addressContent.length < 3) {
            setFoundMatches([]);
            setShowResults(false);
            return;
        }

        setIsLoading(true);
        try {
            const results = await locationApi.execute('/external/autofilladdress', 'POST', {
                query: addressContent
            });

            if (results?.success == true) {
                setFoundMatches(results?.data || []);
                setShowResults(true);
            } else {
                console.error('Failed to locate place data');
                setFoundMatches([]);
                setShowResults(false);
            }
        } catch (error) {
            console.error('Address lookup failed:', error);
            setFoundMatches([]);
            setShowResults(false);
        } finally {
            setIsLoading(false);
        }
    }, [addressContent]); // Removed locationApi dependency to prevent infinite loop

    const debouncedSearch = useDebounce(findMatches, 350);

    useEffect(() => {
        debouncedSearch();
    }, [addressContent, debouncedSearch]);

    const handleAddressSelect = (address) => {
        onAddressUpdate({
            street_address_one: address.street_address_one || address.line1 || '',
            street_address_two: address.street_address_two || address.line2 || '',
            address_city: address.address_city || address.city || '',
            address_state: address.address_state || address.state || '',
            address_zip: address.address_zip || address.zip || address.postal_code || '',
            address_county: address.address_county || address.county || '',
        });

        setAddressContent("");
        setFoundMatches([]);
        setShowResults(false);
    };

    const handleFieldChange = (fieldName, value) => {
        onAddressUpdate({
            ...addressData,
            [fieldName]: value
        });
    };

    return (
        <Card className="border-l-4 border-l-indigo-500 gap-2">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-indigo-600" />
                    Customer Address
                </CardTitle>
            </CardHeader>
            <CardContent>
                {hasAddress ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="street_address_one">
                                Street Address <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="street_address_one"
                                name="street_address_one"
                                type="text"
                                value={addressData.street_address_one || ''}
                                onChange={(e) => handleFieldChange('street_address_one', e.target.value)}
                                placeholder="123 Main St"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="street_address_two">
                                Apartment, Suite, etc. (Optional)
                            </Label>
                            <Input
                                id="street_address_two"
                                name="street_address_two"
                                type="text"
                                value={addressData.street_address_two || ''}
                                onChange={(e) => handleFieldChange('street_address_two', e.target.value)}
                                placeholder="Apt 4B"
                            />
                        </div>

                       <div className="grid grid-cols-4 gap-4">
  <div className="space-y-2">
    <Label htmlFor="address_city">
      City <span className="text-red-500">*</span>
    </Label>
    <Input
      id="address_city"
      name="address_city"
      type="text"
      value={addressData.address_city || ''}
      onChange={(e) => handleFieldChange('address_city', e.target.value)}
      placeholder="City"
      required
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="address_state">
      State <span className="text-red-500">*</span>
    </Label>
    <Select
      value={addressData.address_state || ''}
      onValueChange={(value) => handleFieldChange('address_state', value)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select state">
          {addressData.address_state && US_STATES[addressData.address_state]}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(US_STATES).map(([abbr, fullName]) => (
          <SelectItem key={abbr} value={abbr}>
            {fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  <div className="space-y-2">
    <Label htmlFor="address_zip">
      ZIP Code <span className="text-red-500">*</span>
    </Label>
    <Input
      id="address_zip"
      name="address_zip"
      type="text"
      value={addressData.address_zip || ''}
      onChange={(e) => handleFieldChange('address_zip', e.target.value)}
      placeholder="12345"
      maxLength={10}
      required
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="address_county">
      County
    </Label>
    <Input
      id="address_county"
      name="address_county"
      type="text"
      value={addressData.address_county || ''}
      onChange={(e) => handleFieldChange('address_county', e.target.value)}
      placeholder="County"
    />
  </div>
</div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="GoogleAutoComplete">
                                Search for Address
                            </Label>
                            <div className="relative">
                                <Input
                                    id="GoogleAutoComplete"
                                    name="GoogleAutoComplete"
                                    type="text"
                                    value={addressContent}
                                    onChange={(e) => setAddressContent(e.target.value)}
                                    placeholder="Start typing an address..."
                                    className="pr-10"
                                />
                                {isLoading && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                                {addressContent && !isLoading && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAddressContent("");
                                            setFoundMatches([]);
                                            setShowResults(false);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {showResults && foundMatches.length > 0 && (
                            <div className="border rounded-md divide-y bg-white shadow-sm max-h-60 overflow-y-auto">
                                {foundMatches.map((match, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handleAddressSelect(match)}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3"
                                    >
                                        <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900">
                                                {match.street_address_one || match.line1}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {match.address_city || match.city}, {match.address_state || match.state} {match.address_zip || match.zip || match.postal_code}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {showResults && foundMatches.length === 0 && !isLoading && addressContent.length >= 3 && (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                No addresses found. Try a different search.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}