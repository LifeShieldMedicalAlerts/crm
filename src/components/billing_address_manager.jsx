import * as React from "react"
import { useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
]

export function BillingAddressManager({ billingInfo, customerInfo, onDataChange }) {
  const useSameAddress = !billingInfo?.different_billing_address

  const syncShippingToBilling = () => {
    onDataChange('billing_street_address_one', customerInfo?.street_address_one || '')
    onDataChange('billing_street_address_two', customerInfo?.street_address_two || '')
    onDataChange('billing_address_city', customerInfo?.address_city || '')
    onDataChange('billing_address_state', customerInfo?.address_state || '')
    onDataChange('billing_address_zip', customerInfo?.address_zip || '')
  }

  const handleSameAddressChange = (checked) => {
    onDataChange('different_billing_address', !checked)
    if (checked || !billingInfo?.billing_street_address_one) {
      syncShippingToBilling()
    }
  }

  
  useEffect(() => {
    if (useSameAddress) {
      syncShippingToBilling()
    }
  }, [
    useSameAddress,
    customerInfo?.street_address_one,
    customerInfo?.street_address_two,
    customerInfo?.address_city,
    customerInfo?.address_state,
    customerInfo?.address_zip
  ])

  const handleFieldChange = (fieldName, value) => {
    onDataChange(fieldName, value)
  }

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="same_billing_address"
            checked={useSameAddress}
            onCheckedChange={handleSameAddressChange}
          />
          <label
            htmlFor="same_billing_address"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            Billing address same as shipping address
          </label>
        </div>

        {useSameAddress && customerInfo?.street_address_one && (
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium text-muted-foreground mb-1">Billing Address:</p>
            <p>{customerInfo.street_address_one}</p>
            {customerInfo.street_address_two && <p>{customerInfo.street_address_two}</p>}
            <p>
              {customerInfo.address_city}, {customerInfo.address_state} {customerInfo.address_zip}
            </p>
          </div>
        )}

        {!useSameAddress && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="billing_street_address_one">
                Street Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="billing_street_address_one"
                name="billing_street_address_one"
                type="text"
                value={billingInfo?.billing_street_address_one || ''}
                onChange={(e) => handleFieldChange('billing_street_address_one', e.target.value)}
                placeholder="123 Main Street"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing_street_address_two">
                Apartment, Suite, etc. (optional)
              </Label>
              <Input
                id="billing_street_address_two"
                name="billing_street_address_two"
                type="text"
                value={billingInfo?.billing_street_address_two || ''}
                onChange={(e) => handleFieldChange('billing_street_address_two', e.target.value)}
                placeholder="Apt 4B"
              />
            </div>

            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-3 space-y-2">
                <Label htmlFor="billing_address_city">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billing_address_city"
                  name="billing_address_city"
                  type="text"
                  value={billingInfo?.billing_address_city || ''}
                  onChange={(e) => handleFieldChange('billing_address_city', e.target.value)}
                  placeholder="City"
                />
              </div>

              <div className="col-span-1 space-y-2">
                <Label htmlFor="billing_address_state">
                  State <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={billingInfo?.billing_address_state || ''}
                  onValueChange={(value) => handleFieldChange('billing_address_state', value)}
                >
                  <SelectTrigger id="billing_address_state">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="billing_address_zip">
                  ZIP Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billing_address_zip"
                  name="billing_address_zip"
                  type="text"
                  value={billingInfo?.billing_address_zip || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 5)
                    handleFieldChange('billing_address_zip', value)
                  }}
                  placeholder="12345"
                  maxLength={5}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BillingAddressManager