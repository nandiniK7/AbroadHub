// Category-specific fields collected during Service Provider / Business
// onboarding, stored as JSON in users.business_fields. Individual-profession
// providers (Photographer, Electrician, etc.) don't get a config here — they
// already work through the existing occupation-based Providers page with
// just a bio/location, so the onboarding form for those stays generic.
export const CATEGORY_FIELD_CONFIG = {
  'Restaurants': [
    { key: 'cuisine', label: 'Cuisine', type: 'text', placeholder: 'e.g. Italian, South Indian' },
    { key: 'dietaryOptions', label: 'Dietary Options', type: 'multiselect', options: ['Veg', 'Non-veg', 'Halal', 'Vegan'] },
    { key: 'mealsOffering', label: 'Meals Offering', type: 'multiselect', options: ['Breakfast', 'Lunch', 'Dinner', 'Buffet'] }
  ],
  'Grocery Stores': [
    { key: 'productsSelling', label: 'Select Products Selling', type: 'multiselect', options: ['Fresh Produce', 'Dairy & Eggs', 'Meat', 'Bakery', 'Household Items'] }
  ],
  'Farms': [
    { key: 'productsList', label: 'List of Products', type: 'multiselect', options: ['Vegetables', 'Fruits', 'Goat Meat', 'Dairy', 'Poultry'] },
    { key: 'farmType', label: 'Farm Type', type: 'select', options: ['Vegetable Farm', 'Mixed Farm', 'Poultry Farm', 'Dairy Farm'] }
  ],
  'Fashion': [
    { key: 'productsFrom', label: 'Select Products From List', type: 'multiselect', options: ['Clothing', 'Jewelry', 'Accessories', 'Footwear'] },
    { key: 'serving', label: 'Serving', type: 'select', options: ['Men', 'Women', 'Both Men & Women'] }
  ],
  'Beauty & Spa': [
    { key: 'appointmentType', label: 'Appointment', type: 'select', options: ['Appointment Only', 'Walk-in Allowed'] },
    { key: 'servicesFromList', label: 'Select Services From List', type: 'multiselect', options: ['Hair Cut', 'Hair Styling', 'Manicure', 'Pedicure', 'Facial', 'Massage'] },
    { key: 'serving', label: 'Serving', type: 'select', options: ['Men', 'Women', 'Unisex'] }
  ],
  'Tax Filing': [
    { key: 'featuresOfferings', label: 'Features / Offerings', type: 'multiselect', options: ['Free Consultation', 'Certified Agent', 'Walk-in'] },
    { key: 'filingMethod', label: 'Filing Method', type: 'select', options: ['E-filing', 'Paper Filing', 'Both'] },
    { key: 'servicesOffered', label: 'Select Services Offered', type: 'multiselect', options: ['Tax Consultation & Advisory', 'Personal Income Tax Filing', 'Business/Corporate Tax Filing'] }
  ],
  'Legal Consultant': [
    { key: 'clientType', label: 'Choose Your Client Type', type: 'multiselect', options: ['Individual', 'Small Business', 'Large Corporations', 'Foreign/Expat'] },
    { key: 'servicesOffering', label: 'Select Services Offering', type: 'multiselect', options: ['Immigration', 'Accidental', 'Business', 'Family'] },
    { key: 'features', label: 'Features', type: 'multiselect', options: ['Free Consultation', 'In-person', 'Online'] }
  ],
  'Health Center': [
    { key: 'consultationType', label: 'Consultation Type', type: 'multiselect', options: ['In-person', 'Online', 'Walk-in Available'] },
    { key: 'servicesOffering', label: 'Services Offering', type: 'multiselect', options: ['Routine Checkup', 'Emergency', 'Accident Services'] }
  ],
  'Insurance': [
    { key: 'featuresOfferings', label: 'Features / Offerings', type: 'multiselect', options: ['Walk-in', 'Online Consulting', 'In Person'] },
    { key: 'serviceProvider', label: 'Service Provider', type: 'select', options: ['Local & Regional', 'International', 'All'] }
  ],
  'Night Clubs': [
    { key: 'entryType', label: 'Entry Type', type: 'select', options: ['Ticketed', 'Walk-in', 'Guest List'] },
    { key: 'musicGenre', label: 'Music Genre', type: 'text', placeholder: 'e.g. House, Hip-Hop, Live Band' }
  ],
  'Real Estate': [
    { key: 'propertyTypes', label: 'Property Types Handled', type: 'multiselect', options: ['Residential', 'Commercial', 'Rental'] },
    { key: 'serviceType', label: 'Service Type', type: 'multiselect', options: ['Buying', 'Selling', 'Renting', 'Property Management'] }
  ]
};
